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
import { StudentQuestionItemDto } from './dto';
import {
  buildStudentQuestionPrompt,
  StudentQuestionPromptDependencies,
  STUDENT_QUESTION_SYSTEM_PROMPT,
} from './prompts';
import {
  StudentQuestion,
  StudentQuestionDocument,
} from './schemas/student-question.schema';

// ---------------------------------------------------------------------------
// Guard type for AI response
// ---------------------------------------------------------------------------
interface StudentQuestionResponse {
  student_questions?: unknown;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Dev C — Student Questions Service
 *
 * Implements ComponentGenerator<StudentQuestion> (plain domain object).
 * Persistence methods return StudentQuestionDocument[].
 *
 * External contract gap (Dev A/B):
 *   ComponentGenerator<T>.generate(context) has only one parameter.
 *   We add an optional second parameter; TypeScript still satisfies the
 *   interface because optional extras don't violate structural compatibility.
 *
 * Supports both object-style and positional dependency calls:
 *   service.generate(context, { teachingScripts, activities })
 */
@Injectable()
export class StudentQuestionsService implements ComponentGenerator<StudentQuestion> {
  private readonly logger = new Logger(StudentQuestionsService.name);

  constructor(
    @InjectModel(StudentQuestion.name)
    private readonly studentQuestionModel: Model<StudentQuestionDocument>,
    private readonly aiService: AiService,
  ) {}

  // -------------------------------------------------------------------------
  // generate
  // -------------------------------------------------------------------------

  async generate(
    context: GenerationContext,
    dependencies?: StudentQuestionPromptDependencies,
  ): Promise<StudentQuestion[]> {
    const resolved = this.resolveDependencies(dependencies);

    const questions = await validateAndRetry<StudentQuestion>(
      async (previousErrors?: string[]) => {
        const prompt = buildStudentQuestionPrompt(
          context,
          resolved,
          previousErrors ?? [],
        );

        const raw = await this.aiService.generateJson<unknown>([
          { role: 'system', content: STUDENT_QUESTION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ]);

        // Guard: response must be a non-null object; missing/wrong key → retry
        if (!this.isRecord(raw)) {
          return [];
        }

        const response = raw as StudentQuestionResponse;
        return Array.isArray(response.student_questions)
          ? (response.student_questions as unknown[])
          : [];
      },
      (data: unknown[]) => this.validate(data),
      3,
    );

    return questions;
  }

  // -------------------------------------------------------------------------
  // validate
  // -------------------------------------------------------------------------

  validate(data: unknown[]): ValidationResult {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          'Output must be an array of student question items under "student_questions" key.',
        ],
      };
    }

    const errors: string[] = [];

    if (data.length < 5 || data.length > 8) {
      errors.push(
        `Student question count must be between 5 and 8. Current count: ${data.length}.`,
      );
    }

    data.forEach((item, index) => {
      const prefix = `Item [${index + 1}]`;

      if (!this.isRecord(item)) {
        errors.push(`${prefix}: Must be an object.`);
        return;
      }

      const bilingualFields = [
        'question_vi',
        'question_en',
        'suggested_answer_en',
        'suggested_answer_vi',
      ] as const;

      bilingualFields.forEach((field) => {
        if (typeof item[field] !== 'string' || !item[field].trim()) {
          errors.push(`${prefix}: Missing or empty "${field}".`);
        }
      });

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
    retryErrors: string[] = [],
    dependencies?: StudentQuestionPromptDependencies,
  ): string {
    const resolved = dependencies
      ? this.resolveDependencies(dependencies)
      : { teachingScripts: [], activities: [] };
    return buildStudentQuestionPrompt(context, resolved, retryErrors);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  async findByKitId(kitId: string): Promise<StudentQuestionDocument[]> {
    return this.studentQuestionModel
      .find({ lesson_kit_id: new Types.ObjectId(kitId) })
      .sort({ sort_order: 1 })
      .exec();
  }

  async deleteByKitId(kitId: string): Promise<void> {
    await this.studentQuestionModel
      .deleteMany({ lesson_kit_id: new Types.ObjectId(kitId) })
      .exec();
    this.logger.log(`Deleted student questions for kit: ${kitId}`);
  }

  /**
   * saveBulk — structural validation runs before insertMany.
   * Invalid batch throws without touching Mongo.
   * Mongo errors are propagated as-is.
   */
  async saveBulk(
    kitId: string,
    items: StudentQuestionItemDto[],
  ): Promise<StudentQuestionDocument[]> {
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
    const inserted = await this.studentQuestionModel.insertMany(documents);
    this.logger.log(
      `Saved ${inserted.length} student questions for kit: ${kitId}`,
    );
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
    dependencies?: StudentQuestionPromptDependencies,
  ): StudentQuestionPromptDependencies {
    if (!dependencies || !this.isRecord(dependencies)) {
      throw new Error(
        'Student question generation requires teaching scripts and activities.',
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
        `Student question generation requires non-empty dependencies: ${missing.join(', ')}.`,
      );
    }

    return dependencies;
  }

  /**
   * Runtime DTO validation to reject unknown/extra fields from AI output.
   * Returns array of error strings (empty = valid).
   */
  private validateItemDto(item: Record<string, unknown>): string[] {
    const instance = plainToInstance(StudentQuestionItemDto, item, {
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
