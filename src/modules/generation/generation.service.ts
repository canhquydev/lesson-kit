import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LessonKitStatus } from '../../common/enums';
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
 * Dev C — GenerationService (Pipeline Orchestration)
 *
 * Listens to 'lesson-kit.generate' event and executes the 3-phase async pipeline:
 * Phase 1 (parallel): vocabularies, classroom expressions, activities -> save to DB
 * Phase 2: teaching scripts (using Phase 1 results) -> save to DB
 * Phase 3 (parallel): student questions, assessments (using scripts & activities) -> save to DB
 *
 * Tracks current_step at each phase and updates status (completed / failed).
 */
@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

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

  @OnEvent('lesson-kit.generate')
  async handleLessonKitGenerate(payload: {
    lessonKitId: string;
  }): Promise<void> {
    this.logger.log(
      `Received lesson-kit.generate event for kit: ${payload.lessonKitId}`,
    );

    try {
      await this.generateLessonKit(payload.lessonKitId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Event execution failed for kit ${payload.lessonKitId}: ${msg}`,
        stack,
      );
    }
  }

  async generateLessonKit(lessonKitId: string): Promise<void> {
    const startTime = Date.now();
    let currentStep = 'phase1';

    try {
      // 1. Load Lesson Kit
      const kit = await this.lessonKitsService.findById(lessonKitId);
      if (!kit) {
        throw new NotFoundException(
          `Lesson Kit with ID "${lessonKitId}" not found`,
        );
      }

      // 2. Load Lesson Content
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

      // -----------------------------------------------------------------------
      // Phase 1: Run in parallel (vocabularies, expressions, activities)
      // -----------------------------------------------------------------------
      currentStep = 'phase1';
      this.logger.log(`[Kit: ${lessonKitId}] Phase 1 started (parallel)`);

      const [vocab, expressions, activities] = await Promise.all([
        this.vocabulariesService.generate(context),
        this.classroomExpressionsService.generate(context),
        this.activitiesService.generate(context),
      ]);

      await Promise.all([
        this.vocabulariesService.saveBulk(lessonKitId, vocab),
        this.classroomExpressionsService.saveBulk(lessonKitId, expressions),
        this.activitiesService.saveBulk(lessonKitId, activities),
      ]);

      // -----------------------------------------------------------------------
      // Phase 2: Teaching Scripts (depends on Phase 1)
      // -----------------------------------------------------------------------
      currentStep = 'phase2';
      await this.lessonKitsService.updateCurrentStep(lessonKitId, 'phase2');
      this.logger.log(
        `[Kit: ${lessonKitId}] Phase 2 started (teaching scripts)`,
      );

      const scripts = await this.teachingScriptsService.generate(context, {
        vocabularies: vocab,
        vocab,
        expressions,
        activities,
      });

      await this.teachingScriptsService.saveBulk(lessonKitId, scripts);

      // -----------------------------------------------------------------------
      // Phase 3: Run in parallel (student questions, assessments)
      // -----------------------------------------------------------------------
      currentStep = 'phase3';
      await this.lessonKitsService.updateCurrentStep(lessonKitId, 'phase3');
      this.logger.log(
        `[Kit: ${lessonKitId}] Phase 3 started (questions & assessments)`,
      );

      const [questions, assessments] = await Promise.all([
        this.studentQuestionsService.generate(context, {
          teachingScripts: scripts,
          activities,
        }),
        this.assessmentsService.generate(context, {
          teachingScripts: scripts,
          activities,
        }),
      ]);

      await Promise.all([
        this.studentQuestionsService.saveBulk(
          lessonKitId,
          questions as unknown as Parameters<
            StudentQuestionsService['saveBulk']
          >[1],
        ),
        this.assessmentsService.saveBulk(
          lessonKitId,
          assessments as unknown as Parameters<
            AssessmentsService['saveBulk']
          >[1],
        ),
      ]);

      // -----------------------------------------------------------------------
      // Completed
      // -----------------------------------------------------------------------
      const generationTimeMs = Date.now() - startTime;
      await this.lessonKitsService.updateCurrentStep(lessonKitId, 'completed');
      await this.lessonKitsService.updateStatus(
        lessonKitId,
        LessonKitStatus.COMPLETED,
        generationTimeMs,
      );

      this.logger.log(
        `[Kit: ${lessonKitId}] Pipeline completed in ${generationTimeMs}ms`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `[Kit: ${lessonKitId}] Pipeline failed at ${currentStep}: ${msg}`,
        stack,
      );

      try {
        await this.lessonKitsService.updateCurrentStep(
          lessonKitId,
          `${currentStep}_failed`,
        );
        await this.lessonKitsService.updateStatus(
          lessonKitId,
          LessonKitStatus.FAILED,
        );
      } catch (updateError) {
        const uMsg =
          updateError instanceof Error
            ? updateError.message
            : String(updateError);
        this.logger.error(
          `[Kit: ${lessonKitId}] Failed to update failure status: ${uMsg}`,
        );
      }

      throw error;
    }
  }
}
