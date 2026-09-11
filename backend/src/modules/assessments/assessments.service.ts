import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Model, Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import {
  ComponentGenerator,
  ValidationResult,
  validateAndRetry,
} from '../../common/validators';
import { AiService } from '../ai/ai.service';
import { AiLogsService } from '../ai-logs/ai-logs.service';
import { AssessmentQuestionType } from './constants';
import { AssessmentItemDto } from './dto';
import {
  ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentPrompt,
  AssessmentPromptDependencies,
} from './prompts';
import { Assessment, AssessmentDocument } from './schemas/assessment.schema';
import {
  hasValidAssessmentCorrectAnswer,
  hasValidAssessmentOptions,
} from './validators';

// ---------------------------------------------------------------------------
// Guard type for AI response
// ---------------------------------------------------------------------------
interface AssessmentResponse {
  assessments?: unknown;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Dev C — Assessments Service
 *
 * Implements the shared ComponentGenerator contract with the Phase 3
 * dependency shape. Persistence methods return AssessmentDocument[].
 */
@Injectable()
export class AssessmentsService implements ComponentGenerator<
  Assessment,
  AssessmentPromptDependencies
> {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    @InjectModel(Assessment.name)
    private readonly assessmentModel: Model<AssessmentDocument>,
    private readonly aiService: AiService,
    private readonly aiLogsService: AiLogsService,
  ) {}

  // -------------------------------------------------------------------------
  // generate
  // -------------------------------------------------------------------------

  async generate(
    context: GenerationContext,
    dependencies?: AssessmentPromptDependencies,
  ): Promise<Assessment[]> {
    const resolved = this.resolveDependencies(dependencies);

    const assessments = await validateAndRetry<Assessment>(
      async (previousErrors?: string[]) => {
        const prompt = buildAssessmentPrompt(
          context,
          resolved,
          previousErrors ?? [],
        );

        const raw = await this.aiService.generateJson<unknown>([
          { role: 'system', content: ASSESSMENT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ]);

        // Guard: response must be a non-null object; missing/wrong key → retry
        if (!this.isRecord(raw)) {
          return [];
        }

        const response = raw as AssessmentResponse;
        const items = Array.isArray(response.assessments)
          ? (response.assessments as unknown[])
          : [];

        // Pre-sanitize matching correct_answer (semicolon, colon, extra text)
        for (const item of items) {
          if (
            this.isRecord(item) &&
            item.question_type === 'matching' &&
            typeof item.correct_answer === 'string'
          ) {
            let cleaned = item.correct_answer.replace(/\([^)]*\)/g, '');
            cleaned = cleaned.replace(/;/g, ',');
            cleaned = cleaned.replace(/(\d+)\s*[:.]\s*([a-zA-Z])/g, '$1-$2');
            item.correct_answer = cleaned.trim();
          }
        }

        return items;
      },
      (data: unknown[]) => this.validate(data),
      3,
      (attempt, errors, rawData) => {
        this.aiLogsService.logError({
          kitId: context.lessonContentId,
          component: 'assessments',
          attempt,
          errorType: 'VALIDATION_FAILED',
          errorMessages: errors,
          rawOutput: JSON.stringify(rawData).substring(0, 5000),
        });
      },
    );

    return assessments;
  }

  // -------------------------------------------------------------------------
  // validate
  // -------------------------------------------------------------------------

  validate(data: unknown[]): ValidationResult {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          'Output must be an array of assessment items under "assessments" key.',
        ],
      };
    }

    const errors: string[] = [];

    if (data.length < 3 || data.length > 5) {
      errors.push(
        `Assessment question count must be between 3 and 5. Current count: ${data.length}.`,
      );
    }

    const validTypes = Object.values(AssessmentQuestionType) as string[];

    data.forEach((item, index) => {
      const prefix = `Item [${index + 1}]`;

      if (!this.isRecord(item)) {
        errors.push(`${prefix}: Must be an object.`);
        return;
      }

      // question_text
      if (
        typeof item.question_text !== 'string' ||
        !item.question_text.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "question_text".`);
      }

      // question_type
      const qType = item.question_type as AssessmentQuestionType;
      if (
        typeof item.question_type !== 'string' ||
        !validTypes.includes(item.question_type)
      ) {
        errors.push(
          `${prefix}: "question_type" must be one of: ${validTypes.join(', ')}.`,
        );
      } else {
        // options validation based on question_type
        if (!hasValidAssessmentOptions(qType, item.options)) {
          errors.push(
            `${prefix}: Invalid "options" for question type "${qType}".`,
          );
        }

        // correct_answer validation based on question_type and options
        if (
          !hasValidAssessmentCorrectAnswer(
            qType,
            item.correct_answer,
            item.options,
          )
        ) {
          errors.push(
            `${prefix}: Invalid "correct_answer" for question type "${qType}".`,
          );
        }
      }

      // explanation
      if (typeof item.explanation !== 'string' || !item.explanation.trim()) {
        errors.push(`${prefix}: Missing or empty "explanation".`);
      }

      // sort_order: positive integer and continuous sequence
      const so = item.sort_order;
      if (!Number.isInteger(so) || Number(so) <= 0) {
        errors.push(`${prefix}: "sort_order" must be a positive integer.`);
      } else if (so !== index + 1) {
        errors.push(
          `${prefix}: "sort_order" must be ${index + 1} to form a continuous sequence.`,
        );
      }

      // Runtime DTO validation: reject unknown/extra fields
      const dtoErrors = this.validateItemDto(item);
      dtoErrors.forEach((msg) => errors.push(`${prefix}: ${msg}`));
    });

    return { isValid: errors.length === 0, errors };
  }

  // -------------------------------------------------------------------------
  // getPrompt
  // -------------------------------------------------------------------------

  getPrompt(
    context: GenerationContext,
    dependencies?: AssessmentPromptDependencies,
    retryErrors?: string[],
  ): string;
  getPrompt(context: GenerationContext, retryErrors?: string[]): string;
  getPrompt(
    context: GenerationContext,
    dependenciesOrErrors?: AssessmentPromptDependencies | string[],
    retryErrors: string[] = [],
  ): string {
    const dependencies = Array.isArray(dependenciesOrErrors)
      ? undefined
      : dependenciesOrErrors;
    const errors = Array.isArray(dependenciesOrErrors)
      ? dependenciesOrErrors
      : retryErrors;
    const resolved = dependencies
      ? this.resolveDependencies(dependencies)
      : { teachingScripts: [], activities: [] };
    return buildAssessmentPrompt(context, resolved, errors);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  async findByKitId(kitId: string): Promise<AssessmentDocument[]> {
    return this.assessmentModel
      .find({ lesson_kit_id: new Types.ObjectId(kitId) })
      .sort({ sort_order: 1 })
      .exec();
  }

  async deleteByKitId(kitId: string): Promise<void> {
    await this.assessmentModel
      .deleteMany({ lesson_kit_id: new Types.ObjectId(kitId) })
      .exec();
    this.logger.log(`Deleted assessments for kit: ${kitId}`);
  }

  /**
   * saveBulk — structural validation runs before insertMany.
   * Invalid batch throws without touching Mongo.
   * Mongo errors are propagated as-is.
   */
  async saveBulk(
    kitId: string,
    items: AssessmentItemDto[],
  ): Promise<AssessmentDocument[]> {
    // Structural validation before hitting Mongo
    const structuralResult = this.validate(items);
    if (!structuralResult.isValid) {
      throw new Error(
        `saveBulk validation failed: ${structuralResult.errors.join('; ')}`,
      );
    }

    const kitObjectId = new Types.ObjectId(kitId);
    const documents = items.map((item, index) => ({
      ...item,
      lesson_kit_id: kitObjectId,
      sort_order: item.sort_order ?? index + 1,
    }));

    // Mongo error propagates to caller
    const inserted = await this.assessmentModel.insertMany(documents);
    this.logger.log(`Saved ${inserted.length} assessments for kit: ${kitId}`);
    return inserted;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Normalise dependency object.
   * Throws a clear error if required arrays are missing or empty.
   */
  private resolveDependencies(
    dependencies?: AssessmentPromptDependencies,
  ): AssessmentPromptDependencies {
    if (!dependencies || !this.isRecord(dependencies)) {
      throw new Error(
        'Assessment generation requires teaching scripts and activities.',
      );
    }

    const missing: string[] = [];

    if (
      !Array.isArray(dependencies.teachingScripts) ||
      dependencies.teachingScripts.length === 0
    ) {
      missing.push('teachingScripts');
    }
    if (
      !Array.isArray(dependencies.activities) ||
      dependencies.activities.length === 0
    ) {
      missing.push('activities');
    }

    if (missing.length > 0) {
      throw new Error(
        `Assessment generation requires non-empty dependencies: ${missing.join(', ')}.`,
      );
    }

    return dependencies;
  }

  /**
   * Runtime DTO validation to reject unknown/extra fields from AI output.
   * Returns array of error strings (empty = valid).
   */
  private validateItemDto(item: Record<string, unknown>): string[] {
    const instance = plainToInstance(AssessmentItemDto, item, {
      excludeExtraneousValues: false,
    });
    const violations = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });
    return violations.flatMap((v) => Object.values(v.constraints ?? {}));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
