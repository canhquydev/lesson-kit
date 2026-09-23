import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ComponentType, LessonKitStatus } from '../../common/enums';
import { GenerationContext } from '../../common/interfaces';
import { ActivitiesService } from '../activities/activities.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassroomExpressionsService } from '../classroom-expressions/classroom-expressions.service';
import { LessonContentsService } from '../lesson-contents/lesson-contents.service';
import { LessonKitsService } from '../lesson-kits/lesson-kits.service';
import { StudentQuestionsService } from '../student-questions/student-questions.service';
import { TeachingScriptsService } from '../teaching-scripts/teaching-scripts.service';
import { VocabulariesService } from '../vocabularies/vocabularies.service';
import { RegenerationPersistenceService } from './regeneration-persistence.service';

/**
 * Dependency stale-marking matrix:
 * When a component is regenerated, any component that depends on its outputs
 * becomes stale.
 */
export const STALE_DEPENDENCIES_MAP: Record<ComponentType, ComponentType[]> = {
  [ComponentType.VOCABULARY]: [
    ComponentType.SCRIPT,
    ComponentType.QUESTIONS,
    ComponentType.ASSESSMENT,
  ],
  [ComponentType.EXPRESSIONS]: [
    ComponentType.SCRIPT,
    ComponentType.QUESTIONS,
    ComponentType.ASSESSMENT,
  ],
  [ComponentType.ACTIVITIES]: [
    ComponentType.SCRIPT,
    ComponentType.QUESTIONS,
    ComponentType.ASSESSMENT,
  ],
  [ComponentType.SCRIPT]: [ComponentType.QUESTIONS, ComponentType.ASSESSMENT],
  [ComponentType.QUESTIONS]: [],
  [ComponentType.ASSESSMENT]: [],
};

export interface RegenerateResult {
  lesson_kit_id: string;
  component: ComponentType;
  status: 'regenerated';
  regenerated: boolean;
  stale_components: ComponentType[];
  data: unknown[];
}

export interface RegenerateAllStaleResult {
  lesson_kit_id: string;
  status: 'completed' | 'partial';
  regenerated: ComponentType[];
  failed: { component: ComponentType; error: string }[];
  remaining_stale: ComponentType[];
}

/**
 * Topological order for regeneration phases.
 * Phase 1 components (independent) → Phase 2 (script) → Phase 3 (questions, assessment).
 */
const REGENERATION_PHASES: ComponentType[][] = [
  [
    ComponentType.VOCABULARY,
    ComponentType.EXPRESSIONS,
    ComponentType.ACTIVITIES,
  ],
  [ComponentType.SCRIPT],
  [ComponentType.QUESTIONS, ComponentType.ASSESSMENT],
];

@Injectable()
export class RegenerateService {
  private readonly logger = new Logger(RegenerateService.name);

  constructor(
    private readonly lessonKitsService: LessonKitsService,
    private readonly lessonContentsService: LessonContentsService,
    private readonly vocabulariesService: VocabulariesService,
    private readonly classroomExpressionsService: ClassroomExpressionsService,
    private readonly activitiesService: ActivitiesService,
    private readonly teachingScriptsService: TeachingScriptsService,
    private readonly studentQuestionsService: StudentQuestionsService,
    private readonly assessmentsService: AssessmentsService,
    private readonly persistenceService: RegenerationPersistenceService,
  ) {}

  /**
   * Regenerates a single component for a given lesson kit, persists the updated
   * items, and marks dependent downstream components as stale.
   */
  async regenerate(
    lessonKitId: string,
    componentInput: string,
  ): Promise<RegenerateResult> {
    const componentType = this.normalizeComponentType(componentInput);
    this.logger.log(
      `Regenerating component "${componentType}" for kit: ${lessonKitId}`,
    );

    // 1. Fetch Lesson Kit
    const kit = await this.lessonKitsService.findById(lessonKitId);
    if (!kit) {
      throw new NotFoundException(
        `Lesson Kit with ID "${lessonKitId}" not found`,
      );
    }
    if (kit.status === LessonKitStatus.GENERATING) {
      throw new ConflictException(
        `Cannot regenerate a component while Lesson Kit is actively generating.`,
      );
    }

    // 2. Fetch Lesson Content
    const lessonContentId = kit.lesson_content_id.toString();
    const lessonContent =
      await this.lessonContentsService.findById(lessonContentId);
    if (!lessonContent) {
      throw new NotFoundException(
        `Lesson content with ID "${lessonContentId}" not found`,
      );
    }

    // 3. Build GenerationContext
    const context: GenerationContext = {
      lessonContentId: lessonContent._id.toHexString(),
      subject: kit.subject || lessonContent.subject,
      grade: kit.grade || lessonContent.grade,
      title: kit.lesson_topic || lessonContent.title,
      content: lessonContent.content,
      duration: kit.duration,
      supportLevel: kit.support_level,
    };

    let generatedData: unknown[] = [];

    // 4. Regenerate target component
    switch (componentType) {
      case ComponentType.VOCABULARY: {
        generatedData = await this.vocabulariesService.generate(context);
        break;
      }

      case ComponentType.EXPRESSIONS: {
        generatedData =
          await this.classroomExpressionsService.generate(context);
        break;
      }

      case ComponentType.ACTIVITIES: {
        generatedData = await this.activitiesService.generate(context);
        break;
      }

      case ComponentType.SCRIPT: {
        // Needs Phase 1 results from DB
        const [vocab, expressions, activities] = await Promise.all([
          this.vocabulariesService.findByKitId(lessonKitId),
          this.classroomExpressionsService.findByKitId(lessonKitId),
          this.activitiesService.findByKitId(lessonKitId),
        ]);

        if (
          vocab.length === 0 ||
          expressions.length === 0 ||
          activities.length === 0
        ) {
          throw new BadRequestException(
            'Cannot regenerate teaching script: Phase 1 dependencies (vocab, expressions, activities) must exist first.',
          );
        }

        generatedData = await this.teachingScriptsService.generate(context, {
          vocabularies: vocab,
          expressions,
          activities,
        });
        break;
      }

      case ComponentType.QUESTIONS: {
        // Needs teaching scripts and activities from DB
        const [scripts, activities] = await Promise.all([
          this.teachingScriptsService.findByKitId(lessonKitId),
          this.activitiesService.findByKitId(lessonKitId),
        ]);

        if (scripts.length === 0 || activities.length === 0) {
          throw new BadRequestException(
            'Cannot regenerate student questions: teaching scripts and activities must exist first.',
          );
        }

        generatedData = await this.studentQuestionsService.generate(context, {
          teachingScripts: scripts,
          activities,
        });
        break;
      }

      case ComponentType.ASSESSMENT: {
        // Needs teaching scripts and activities from DB
        const [scripts, activities] = await Promise.all([
          this.teachingScriptsService.findByKitId(lessonKitId),
          this.activitiesService.findByKitId(lessonKitId),
        ]);

        if (scripts.length === 0 || activities.length === 0) {
          throw new BadRequestException(
            'Cannot regenerate assessments: teaching scripts and activities must exist first.',
          );
        }

        generatedData = await this.assessmentsService.generate(context, {
          teachingScripts: scripts,
          activities,
        });
        break;
      }
    }

    const downstreamComponents = STALE_DEPENDENCIES_MAP[componentType] ?? [];
    const persisted = await this.persistenceService.replaceComponent(
      lessonKitId,
      componentType,
      generatedData,
      downstreamComponents,
    );

    this.logger.log(
      `Regenerated "${componentType}" for kit ${lessonKitId}. Stale components: [${persisted.staleComponents.join(', ')}]`,
    );

    if (kit.status === LessonKitStatus.FAILED) {
      try {
        const refreshedKit = await this.lessonKitsService.findById(lessonKitId);
        const allPresent =
          (refreshedKit.vocabularies?.length ?? 0) > 0 &&
          (refreshedKit.classroom_expressions?.length ?? 0) > 0 &&
          (refreshedKit.activities?.length ?? 0) > 0 &&
          (refreshedKit.teaching_scripts?.length ?? 0) > 0 &&
          (refreshedKit.student_questions?.length ?? 0) > 0 &&
          (refreshedKit.assessments?.length ?? 0) > 0;

        if (allPresent) {
          await this.lessonKitsService.updateStatus(
            lessonKitId,
            LessonKitStatus.COMPLETED,
          );
          this.logger.log(
            `All components present for kit ${lessonKitId}. Promoted status from FAILED to COMPLETED.`,
          );
        }
      } catch {
        // Non-blocking
      }
    }

    return {
      lesson_kit_id: lessonKitId,
      component: componentType,
      status: 'regenerated',
      regenerated: true,
      stale_components: persisted.staleComponents,
      data: persisted.data,
    };
  }

  /**
   * Regenerates all stale components for a lesson kit in the correct
   * dependency order (topological sort by generation phase).
   *
   * Phase 1 (parallel): vocabulary, expressions, activities
   * Phase 2:            script
   * Phase 3 (parallel): questions, assessment
   *
   * If a component in an earlier phase fails, downstream dependents
   * in later phases are skipped, but independent components continue.
   */
  async regenerateAllStale(
    lessonKitId: string,
  ): Promise<RegenerateAllStaleResult> {
    // 1. Fetch kit and validate
    const kit = await this.lessonKitsService.findById(lessonKitId);
    if (!kit) {
      throw new NotFoundException(
        `Lesson Kit with ID "${lessonKitId}" not found`,
      );
    }
    if (kit.status === LessonKitStatus.GENERATING) {
      throw new ConflictException(
        'Cannot regenerate while Lesson Kit is actively generating.',
      );
    }

    const staleSet = new Set<ComponentType>(
      (kit.stale_components ?? []).filter((c): c is ComponentType =>
        Object.values(ComponentType).includes(c as ComponentType),
      ),
    );

    if (staleSet.size === 0) {
      return {
        lesson_kit_id: lessonKitId,
        status: 'completed',
        regenerated: [],
        failed: [],
        remaining_stale: [],
      };
    }

    // 2. Build ordered phases from stale components
    const phases = this.sortStaleByPhase(staleSet);

    this.logger.log(
      `Regenerating all stale for kit ${lessonKitId}: ${phases.map((p) => `[${p.join(', ')}]`).join(' → ')}`,
    );

    const regenerated: ComponentType[] = [];
    const failed: { component: ComponentType; error: string }[] = [];
    const skipped = new Set<ComponentType>();

    // 3. Execute phases sequentially; within each phase, run in parallel
    for (const phase of phases) {
      const toRun = phase.filter((c) => !skipped.has(c));
      if (toRun.length === 0) continue;

      const results = await Promise.allSettled(
        toRun.map(async (component) => {
          await this.regenerate(lessonKitId, component);
          return component;
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          regenerated.push(result.value);
        } else {
          const failedComponent = toRun[results.indexOf(result)];
          const errorMsg =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          failed.push({ component: failedComponent, error: errorMsg });

          // Mark downstream dependents as skipped
          const downstream = STALE_DEPENDENCIES_MAP[failedComponent] ?? [];
          for (const dep of downstream) {
            if (staleSet.has(dep)) {
              skipped.add(dep);
            }
          }
        }
      }
    }

    // 4. Compute remaining stale
    const remaining = [...staleSet].filter((c) => !regenerated.includes(c));

    this.logger.log(
      `Regenerate-all-stale for kit ${lessonKitId}: ` +
        `regenerated=[${regenerated.join(', ')}], ` +
        `failed=[${failed.map((f) => f.component).join(', ')}], ` +
        `remaining=[${remaining.join(', ')}]`,
    );

    return {
      lesson_kit_id: lessonKitId,
      status: failed.length === 0 ? 'completed' : 'partial',
      regenerated,
      failed,
      remaining_stale: remaining,
    };
  }

  /**
   * Groups stale components into ordered phases based on the generation
   * pipeline dependency graph. Only includes phases that contain at least
   * one stale component.
   */
  private sortStaleByPhase(staleSet: Set<ComponentType>): ComponentType[][] {
    return REGENERATION_PHASES.map((phase) =>
      phase.filter((c) => staleSet.has(c)),
    ).filter((phase) => phase.length > 0);
  }

  /**
   * Normalizes raw component string (including plural forms) to ComponentType enum.
   */
  normalizeComponentType(input: string): ComponentType {
    const cleaned = (input ?? '').trim().toLowerCase();

    const aliasMap: Record<string, ComponentType> = {
      vocabulary: ComponentType.VOCABULARY,
      vocabularies: ComponentType.VOCABULARY,
      vocab: ComponentType.VOCABULARY,
      expressions: ComponentType.EXPRESSIONS,
      classroom_expressions: ComponentType.EXPRESSIONS,
      expression: ComponentType.EXPRESSIONS,
      activities: ComponentType.ACTIVITIES,
      activity: ComponentType.ACTIVITIES,
      script: ComponentType.SCRIPT,
      scripts: ComponentType.SCRIPT,
      teaching_scripts: ComponentType.SCRIPT,
      questions: ComponentType.QUESTIONS,
      question: ComponentType.QUESTIONS,
      student_questions: ComponentType.QUESTIONS,
      assessment: ComponentType.ASSESSMENT,
      assessments: ComponentType.ASSESSMENT,
    };

    const matched = aliasMap[cleaned];
    if (!matched) {
      throw new BadRequestException(
        `Invalid component "${input}". Supported components: ${Object.values(ComponentType).join(', ')}.`,
      );
    }

    return matched;
  }
}
