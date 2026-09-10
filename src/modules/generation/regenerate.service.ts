import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ComponentType } from '../../common/enums';
import { GenerationContext } from '../../common/interfaces';
import { ActivitiesService } from '../activities/activities.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassroomExpressionsService } from '../classroom-expressions/classroom-expressions.service';
import { LessonContentsService } from '../lesson-contents/lesson-contents.service';
import { LessonKitsService } from '../lesson-kits/lesson-kits.service';
import { StudentQuestionsService } from '../student-questions/student-questions.service';
import { TeachingScriptsService } from '../teaching-scripts/teaching-scripts.service';
import { VocabulariesService } from '../vocabularies/vocabularies.service';

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
  regenerated: boolean;
  stale_components: ComponentType[];
  data: unknown[];
}

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
        const vocab = await this.vocabulariesService.generate(context);
        await this.vocabulariesService.deleteByKitId(lessonKitId);
        generatedData = await this.vocabulariesService.saveBulk(
          lessonKitId,
          vocab,
        );
        break;
      }

      case ComponentType.EXPRESSIONS: {
        const expressions =
          await this.classroomExpressionsService.generate(context);
        await this.classroomExpressionsService.deleteByKitId(lessonKitId);
        generatedData = await this.classroomExpressionsService.saveBulk(
          lessonKitId,
          expressions,
        );
        break;
      }

      case ComponentType.ACTIVITIES: {
        const activities = await this.activitiesService.generate(context);
        await this.activitiesService.deleteByKitId(lessonKitId);
        generatedData = await this.activitiesService.saveBulk(
          lessonKitId,
          activities,
        );
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

        const scripts = await this.teachingScriptsService.generate(context, {
          vocabularies: vocab,
          vocab,
          expressions,
          activities,
        });
        await this.teachingScriptsService.deleteByKitId(lessonKitId);
        generatedData = await this.teachingScriptsService.saveBulk(
          lessonKitId,
          scripts,
        );
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

        const questions = await this.studentQuestionsService.generate(context, {
          teachingScripts: scripts,
          activities,
        });
        await this.studentQuestionsService.deleteByKitId(lessonKitId);
        generatedData = await this.studentQuestionsService.saveBulk(
          lessonKitId,
          questions,
        );
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

        const assessments = await this.assessmentsService.generate(context, {
          teachingScripts: scripts,
          activities,
        });
        await this.assessmentsService.deleteByKitId(lessonKitId);
        generatedData = await this.assessmentsService.saveBulk(
          lessonKitId,
          assessments,
        );
        break;
      }
    }

    const staleComponents = STALE_DEPENDENCIES_MAP[componentType] ?? [];

    this.logger.log(
      `Regenerated "${componentType}" for kit ${lessonKitId}. Stale components: [${staleComponents.join(', ')}]`,
    );

    return {
      lesson_kit_id: lessonKitId,
      component: componentType,
      regenerated: true,
      stale_components: staleComponents,
      data: generatedData,
    };
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
