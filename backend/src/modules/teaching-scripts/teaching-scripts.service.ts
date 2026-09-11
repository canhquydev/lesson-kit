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
import { TeachingScriptItemDto } from './dto';
import {
  buildTeachingScriptPrompt,
  TeachingScriptPromptDependencies,
  TEACHING_SCRIPT_SYSTEM_PROMPT,
} from './prompts';
import {
  TeachingScript,
  TeachingScriptDocument,
} from './schemas/teaching-script.schema';

type ResolvedDependencies = {
  vocabularies: NonNullable<TeachingScriptPromptDependencies['vocabularies']>;
  expressions: TeachingScriptPromptDependencies['expressions'];
  activities: TeachingScriptPromptDependencies['activities'];
};

interface TeachingScriptResponse {
  teaching_scripts?: unknown;
}

@Injectable()
export class TeachingScriptsService implements ComponentGenerator<
  TeachingScript,
  TeachingScriptPromptDependencies
> {
  private readonly logger = new Logger(TeachingScriptsService.name);

  constructor(
    @InjectModel(TeachingScript.name)
    private readonly teachingScriptModel: Model<TeachingScriptDocument>,
    private readonly aiService: AiService,
    private readonly aiLogsService: AiLogsService,
  ) {}

  // -------------------------------------------------------------------------
  // generate — Phase 2 core method
  // -------------------------------------------------------------------------

  async generate(
    context: GenerationContext,
    dependencies?: TeachingScriptPromptDependencies,
  ): Promise<TeachingScript[]> {
    const resolved = this.resolveDependencies(dependencies);

    const scripts = await validateAndRetry<TeachingScript>(
      async (previousErrors?: string[]) => {
        const prompt = buildTeachingScriptPrompt(
          context,
          resolved,
          previousErrors ?? [],
        );
        const raw = await this.aiService.generateJson<unknown>([
          { role: 'system', content: TEACHING_SCRIPT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ]);

        // Guard: response must be a non-null object; missing/wrong key → retry
        if (!this.isRecord(raw)) {
          return [];
        }

        const response = raw as TeachingScriptResponse;
        const items = Array.isArray(response.teaching_scripts)
          ? (response.teaching_scripts as unknown[])
          : [];

        return items;
      },
      (data: unknown[]) =>
        this.validateForGeneration(data, context, resolved),
      3,
      (attempt, errors, rawData) => {
        this.aiLogsService.logError({
          kitId: context.lessonContentId,
          component: 'teaching_scripts',
          attempt,
          errorType: 'VALIDATION_FAILED',
          errorMessages: errors,
          rawOutput: JSON.stringify(rawData).substring(0, 5000),
        });
      },
    );

    return scripts;
  }

  // -------------------------------------------------------------------------
  // validate — structural + DTO validation (no context needed)
  // -------------------------------------------------------------------------

  validate(data: unknown[]): ValidationResult {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          'Output must be an array of teaching script items under "teaching_scripts" key.',
        ],
      };
    }

    const errors: string[] = [];

    if (data.length === 0) {
      errors.push('Teaching scripts array cannot be empty.');
    }

    data.forEach((item, index) => {
      const prefix = `Item [${index + 1}]`;

      if (!this.isRecord(item)) {
        errors.push(`${prefix}: Must be an object.`);
        return;
      }

      const requiredTextFields = [
        'activity_name',
        'objective',
        'teacher_speech_en',
        'teacher_speech_vi',
        'teacher_action',
        'expected_student_response',
      ] as const;

      requiredTextFields.forEach((field) => {
        if (typeof item[field] !== 'string' || !item[field].trim()) {
          errors.push(`${prefix}: Missing or empty "${field}".`);
        }
      });

      if (item.notes !== undefined && typeof item.notes !== 'string') {
        errors.push(`${prefix}: "notes" must be a string when provided.`);
      }

      // duration_minutes: must be positive integer (not NaN, not Infinity, not float, not negative, not string)
      const dur = item.duration_minutes;
      if (!Number.isInteger(dur) || Number(dur) <= 0) {
        errors.push(
          `${prefix}: "duration_minutes" must be a positive integer.`,
        );
      }

      // step_order: must be positive integer and form continuous sequence
      const so = item.step_order;
      if (!Number.isInteger(so) || Number(so) <= 0) {
        errors.push(`${prefix}: "step_order" must be a positive integer.`);
      } else if (so !== index + 1) {
        errors.push(
          `${prefix}: "step_order" must be ${index + 1} to form a continuous sequence.`,
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
    dependencies?: TeachingScriptPromptDependencies,
    retryErrors?: string[],
  ): string;
  getPrompt(context: GenerationContext, retryErrors?: string[]): string;
  getPrompt(
    context: GenerationContext,
    dependenciesOrErrors?: TeachingScriptPromptDependencies | string[],
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
      : { vocabularies: [], expressions: [], activities: [] };
    return buildTeachingScriptPrompt(context, resolved, errors);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  async findByKitId(kitId: string): Promise<TeachingScriptDocument[]> {
    return this.teachingScriptModel
      .find({ lesson_kit_id: new Types.ObjectId(kitId) })
      .sort({ step_order: 1 })
      .exec();
  }

  async deleteByKitId(kitId: string): Promise<void> {
    await this.teachingScriptModel
      .deleteMany({ lesson_kit_id: new Types.ObjectId(kitId) })
      .exec();
    this.logger.log(`Deleted teaching scripts for kit: ${kitId}`);
  }

  /**
   * saveBulk — structural validation runs before insertMany.
   * Invalid batch throws without touching Mongo.
   * Mongo errors are propagated as-is.
   */
  async saveBulk(
    kitId: string,
    items: TeachingScriptItemDto[],
  ): Promise<TeachingScriptDocument[]> {
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
      notes: item.notes ?? '',
      step_order: item.step_order ?? index + 1,
    }));

    // Mongo error propagates to caller
    const inserted = await this.teachingScriptModel.insertMany(documents);
    this.logger.log(
      `Saved ${inserted.length} teaching scripts for kit: ${kitId}`,
    );
    return inserted;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Normalise dependency object — supports both `vocab` and `vocabularies`.
   * Throws a clear error if required arrays are missing or empty.
   */
  private resolveDependencies(
    dependencies?: TeachingScriptPromptDependencies,
  ): ResolvedDependencies {
    if (!dependencies || !this.isRecord(dependencies)) {
      throw new Error(
        'Teaching script generation requires vocabularies (or vocab), expressions, and activities.',
      );
    }

    // Support alias: vocab → vocabularies
    const vocabularies = Array.isArray(dependencies.vocabularies)
      ? dependencies.vocabularies
      : Array.isArray(dependencies.vocab)
        ? dependencies.vocab
        : undefined;

    const missing: string[] = [];

    if (!Array.isArray(vocabularies) || vocabularies.length === 0) {
      missing.push('vocabularies (or vocab)');
    }
    if (
      !Array.isArray(dependencies.expressions) ||
      dependencies.expressions.length === 0
    ) {
      missing.push('expressions');
    }
    if (
      !Array.isArray(dependencies.activities) ||
      dependencies.activities.length === 0
    ) {
      missing.push('activities');
    }

    if (missing.length > 0) {
      throw new Error(
        `Teaching script generation requires non-empty dependencies: ${missing.join(', ')}.`,
      );
    }

    return {
      vocabularies: vocabularies!,
      expressions: dependencies.expressions,
      activities: dependencies.activities,
    };
  }

  /**
   * validateForGeneration — business rules on top of structural validation.
   * Uses count-map (multiset) to match Phase 1 activities one-to-one,
   * including duplicate names with same duration.
   */
  private validateForGeneration(
    data: unknown[],
    context: GenerationContext,
    dependencies: ResolvedDependencies,
  ): ValidationResult {
    const structuralResult = this.validate(data);
    const errors = [...structuralResult.errors];

    if (!Array.isArray(data)) {
      return structuralResult;
    }

    // --- Total duration check ---
    const totalDuration = data.reduce<number>((total, item) => {
      if (!this.isRecord(item) || !Number.isInteger(item.duration_minutes)) {
        return total;
      }
      return total + (item.duration_minutes as number);
    }, 0);

    if (totalDuration !== context.duration) {
      errors.push(
        `Total duration must equal ${context.duration} minutes. Current total: ${totalDuration}.`,
      );
    }

    // --- One-to-one activity matching (multiset / count-map) ---
    // Build count map from output
    const outputCountMap = new Map<string, number>();
    for (const script of data) {
      if (!this.isRecord(script)) continue;
      const name = script.activity_name;
      const dur = script.duration_minutes;
      if (typeof name !== 'string' || !Number.isInteger(dur)) continue;
      const key = `${name}::${dur as number}`;
      outputCountMap.set(key, (outputCountMap.get(key) ?? 0) + 1);
    }

    // Build count map from Phase 1 activities
    const requiredCountMap = new Map<string, number>();
    for (const activity of dependencies.activities) {
      if (!this.isRecord(activity)) continue;
      const name = activity.activity_name;
      const dur = activity.duration_minutes;
      if (typeof name !== 'string' || !name.trim() || typeof dur !== 'number') {
        continue;
      }
      const key = `${name}::${dur}`;
      requiredCountMap.set(key, (requiredCountMap.get(key) ?? 0) + 1);
    }

    // Check each required activity is present in sufficient count
    for (const [key, requiredCount] of requiredCountMap) {
      const [activityName, durationStr] = key.split('::');
      const outputCount = outputCountMap.get(key) ?? 0;
      if (outputCount < requiredCount) {
        const duration = Number(durationStr);
        errors.push(
          `Missing Phase 1 activity "${activityName}" with duration ${duration} minutes.`,
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Runtime DTO validation to reject unknown/extra fields from AI output.
   * Returns array of error strings (empty = valid).
   */
  private validateItemDto(item: Record<string, unknown>): string[] {
    const instance = plainToInstance(TeachingScriptItemDto, item, {
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
