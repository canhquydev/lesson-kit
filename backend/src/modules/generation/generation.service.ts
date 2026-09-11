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

class PipelineStepError extends Error {
  constructor(
    readonly step: string,
    readonly originalError: unknown,
  ) {
    super(
      originalError instanceof Error
        ? originalError.message
        : String(originalError),
    );
    this.name = PipelineStepError.name;
    if (originalError instanceof Error) {
      this.stack = originalError.stack;
    }
  }
}

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
    } catch (error: unknown) {
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
      if (kit.status !== LessonKitStatus.GENERATING) {
        this.logger.warn(
          `[Kit: ${lessonKitId}] Ignored generation event because status is "${kit.status}"`,
        );
        return;
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
      await this.lessonKitsService.updateCurrentStep(lessonKitId, currentStep);
      this.logger.log(`[Kit: ${lessonKitId}] Phase 1 started (parallel)`);

      const [vocab, expressions, activities] = await Promise.all([
        this.runStep('phase1_vocabulary', () =>
          this.vocabulariesService.generate(context),
        ),
        this.runStep('phase1_expressions', () =>
          this.classroomExpressionsService.generate(context),
        ),
        this.runStep('phase1_activities', () =>
          this.activitiesService.generate(context),
        ),
      ]);

      const markPhase1Complete = this.createOrderedProgressTracker(
        lessonKitId,
        ['phase1_vocabulary', 'phase1_expressions', 'phase1_activities'],
      );
      await this.waitForParallelTasks([
        this.runStep('phase1_vocabulary', () =>
          this.saveAndTrack(
            () => this.vocabulariesService.saveBulk(lessonKitId, vocab),
            () => markPhase1Complete('phase1_vocabulary'),
          ),
        ),
        this.runStep('phase1_expressions', () =>
          this.saveAndTrack(
            () =>
              this.classroomExpressionsService.saveBulk(
                lessonKitId,
                expressions,
              ),
            () => markPhase1Complete('phase1_expressions'),
          ),
        ),
        this.runStep('phase1_activities', () =>
          this.saveAndTrack(
            () => this.activitiesService.saveBulk(lessonKitId, activities),
            () => markPhase1Complete('phase1_activities'),
          ),
        ),
      ]);

      if (!(await this.isStillGenerating(lessonKitId))) {
        return;
      }

      // -----------------------------------------------------------------------
      // Phase 2: Teaching Scripts (depends on Phase 1)
      // -----------------------------------------------------------------------
      currentStep = 'phase2_script';
      await this.lessonKitsService.updateCurrentStep(lessonKitId, currentStep);
      this.logger.log(
        `[Kit: ${lessonKitId}] Phase 2 started (teaching scripts)`,
      );

      const scripts = await this.runStep(currentStep, () =>
        this.teachingScriptsService.generate(context, {
          vocabularies: vocab,
          expressions,
          activities,
        }),
      );

      await this.runStep(currentStep, () =>
        this.teachingScriptsService.saveBulk(lessonKitId, scripts),
      );

      if (!(await this.isStillGenerating(lessonKitId))) {
        return;
      }

      // -----------------------------------------------------------------------
      // Phase 3: Run in parallel (student questions, assessments)
      // -----------------------------------------------------------------------
      currentStep = 'phase3';
      await this.lessonKitsService.updateCurrentStep(lessonKitId, 'phase3');
      this.logger.log(
        `[Kit: ${lessonKitId}] Phase 3 started (questions & assessments)`,
      );

      const [questions, assessments] = await Promise.all([
        this.runStep('phase3_questions', () =>
          this.studentQuestionsService.generate(context, {
            teachingScripts: scripts,
            activities,
          }),
        ),
        this.runStep('phase3_assessment', () =>
          this.assessmentsService.generate(context, {
            teachingScripts: scripts,
            activities,
          }),
        ),
      ]);

      const markPhase3Complete = this.createOrderedProgressTracker(
        lessonKitId,
        ['phase3_questions', 'phase3_assessment'],
      );
      await this.waitForParallelTasks([
        this.runStep('phase3_questions', () =>
          this.saveAndTrack(
            () => this.studentQuestionsService.saveBulk(lessonKitId, questions),
            () => markPhase3Complete('phase3_questions'),
          ),
        ),
        this.runStep('phase3_assessment', () =>
          this.saveAndTrack(
            () => this.assessmentsService.saveBulk(lessonKitId, assessments),
            () => markPhase3Complete('phase3_assessment'),
          ),
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
    } catch (error: unknown) {
      const failedStep =
        error instanceof PipelineStepError ? error.step : currentStep;
      const originalError =
        error instanceof PipelineStepError ? error.originalError : error;
      const msg =
        originalError instanceof Error
          ? originalError.message
          : String(originalError);
      const stack =
        originalError instanceof Error ? originalError.stack : undefined;
      this.logger.error(
        `[Kit: ${lessonKitId}] Pipeline failed at ${failedStep}: ${msg}`,
        stack,
      );

      try {
        await this.lessonKitsService.updateCurrentStep(lessonKitId, failedStep);
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

      throw originalError;
    }
  }

  private async runStep<T>(step: string, task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (error: unknown) {
      throw new PipelineStepError(step, error);
    }
  }

  private async saveAndTrack<T>(
    save: () => Promise<T>,
    markComplete: () => Promise<void>,
  ): Promise<T> {
    const result = await save();
    await markComplete();
    return result;
  }

  private createOrderedProgressTracker(
    lessonKitId: string,
    orderedSteps: readonly string[],
  ): (completedStep: string) => Promise<void> {
    const completedSteps = new Set<string>();
    let nextStepIndex = 0;
    let updateQueue = Promise.resolve();

    return (completedStep: string): Promise<void> => {
      completedSteps.add(completedStep);
      updateQueue = updateQueue.then(async () => {
        while (
          nextStepIndex < orderedSteps.length &&
          completedSteps.has(orderedSteps[nextStepIndex])
        ) {
          const nextStep = orderedSteps[nextStepIndex];
          await this.lessonKitsService.updateCurrentStep(lessonKitId, nextStep);
          nextStepIndex += 1;
        }
      });

      return updateQueue;
    };
  }

  private async waitForParallelTasks(
    tasks: readonly Promise<unknown>[],
  ): Promise<void> {
    const settled = await Promise.all(
      tasks.map(async (task) => {
        try {
          await task;
          return { succeeded: true } as const;
        } catch (error: unknown) {
          return { succeeded: false, error } as const;
        }
      }),
    );

    const failure = settled.find((result) => !result.succeeded);
    if (failure && !failure.succeeded) {
      throw failure.error;
    }
  }

  private async isStillGenerating(lessonKitId: string): Promise<boolean> {
    try {
      const { status } = await this.lessonKitsService.getStatus(lessonKitId);
      if (status !== LessonKitStatus.GENERATING) {
        this.logger.warn(
          `[Kit: ${lessonKitId}] Pipeline stopped because status is "${status}"`,
        );
        return false;
      }
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(
          `[Kit: ${lessonKitId}] Pipeline stopped because the kit was deleted`,
        );
        return false;
      }
      throw error;
    }
  }
}
