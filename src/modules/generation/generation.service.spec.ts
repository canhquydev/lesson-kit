import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { LessonKitStatus } from '../../common/enums';
import { ActivitiesService } from '../activities/activities.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassroomExpressionsService } from '../classroom-expressions/classroom-expressions.service';
import { LessonContentsService } from '../lesson-contents/lesson-contents.service';
import { LessonKitsService } from '../lesson-kits/lesson-kits.service';
import { StudentQuestionsService } from '../student-questions/student-questions.service';
import { TeachingScriptsService } from '../teaching-scripts/teaching-scripts.service';
import { VocabulariesService } from '../vocabularies/vocabularies.service';
import { GenerationService } from './generation.service';

describe('GenerationService', () => {
  let service: GenerationService;

  const kitId = new Types.ObjectId().toHexString();
  const contentId = new Types.ObjectId().toHexString();

  const mockLessonKit = {
    _id: new Types.ObjectId(kitId),
    lesson_content_id: new Types.ObjectId(contentId),
    subject: 'Physics',
    grade: '10',
    lesson_topic: "Newton's Laws",
    duration: 45,
    support_level: 'B1',
    status: LessonKitStatus.GENERATING,
    current_step: 'phase1',
  };

  const mockLessonContent = {
    _id: new Types.ObjectId(contentId),
    subject: 'Physics',
    grade: '10',
    lesson: '1',
    title: "Newton's Laws",
    content: 'Force causes acceleration.',
  };

  const mockVocab = [{ word: 'force', meaning_vi: 'lực' }];
  const mockExpressions = [
    { expression_en: 'Look at the board', translation_vi: 'Nhìn lên bảng' },
  ];
  const mockActivities = [
    { activity_name: 'Experiment', duration_minutes: 20 },
  ];
  const mockScripts = [
    {
      activity_name: 'Experiment',
      duration_minutes: 20,
      objective: 'Learn force',
      teacher_speech_en: 'Hello',
      teacher_speech_vi: 'Xin chào',
      teacher_action: 'Demonstrate',
      expected_student_response: 'Listen',
      step_order: 1,
    },
  ];
  const mockQuestions = [
    {
      question_vi: 'Lực là gì?',
      question_en: 'What is force?',
      suggested_answer_en: 'A push or pull',
      suggested_answer_vi: 'Lực đẩy hoặc kéo',
      sort_order: 1,
    },
  ];
  const mockAssessments = [
    {
      question_text: 'Unit of force?',
      question_type: 'short_answer',
      options: [],
      correct_answer: 'Newton',
      explanation: 'SI unit',
      sort_order: 1,
    },
  ];

  let lessonKitsService: {
    findById: jest.Mock;
    updateStatus: jest.Mock;
    updateCurrentStep: jest.Mock;
  };
  let lessonContentsService: {
    findById: jest.Mock;
  };
  let vocabulariesService: {
    generate: jest.Mock;
    saveBulk: jest.Mock;
  };
  let classroomExpressionsService: {
    generate: jest.Mock;
    saveBulk: jest.Mock;
  };
  let activitiesService: {
    generate: jest.Mock;
    saveBulk: jest.Mock;
  };
  let teachingScriptsService: {
    generate: jest.Mock;
    saveBulk: jest.Mock;
  };
  let studentQuestionsService: {
    generate: jest.Mock;
    saveBulk: jest.Mock;
  };
  let assessmentsService: {
    generate: jest.Mock;
    saveBulk: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    lessonKitsService = {
      findById: jest.fn().mockResolvedValue(mockLessonKit),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateCurrentStep: jest.fn().mockResolvedValue(undefined),
    };
    lessonContentsService = {
      findById: jest.fn().mockResolvedValue(mockLessonContent),
    };
    vocabulariesService = {
      generate: jest.fn().mockResolvedValue(mockVocab),
      saveBulk: jest.fn().mockResolvedValue(mockVocab),
    };
    classroomExpressionsService = {
      generate: jest.fn().mockResolvedValue(mockExpressions),
      saveBulk: jest.fn().mockResolvedValue(mockExpressions),
    };
    activitiesService = {
      generate: jest.fn().mockResolvedValue(mockActivities),
      saveBulk: jest.fn().mockResolvedValue(mockActivities),
    };
    teachingScriptsService = {
      generate: jest.fn().mockResolvedValue(mockScripts),
      saveBulk: jest.fn().mockResolvedValue(mockScripts),
    };
    studentQuestionsService = {
      generate: jest.fn().mockResolvedValue(mockQuestions),
      saveBulk: jest.fn().mockResolvedValue(mockQuestions),
    };
    assessmentsService = {
      generate: jest.fn().mockResolvedValue(mockAssessments),
      saveBulk: jest.fn().mockResolvedValue(mockAssessments),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        { provide: LessonKitsService, useValue: lessonKitsService },
        { provide: LessonContentsService, useValue: lessonContentsService },
        { provide: VocabulariesService, useValue: vocabulariesService },
        {
          provide: ClassroomExpressionsService,
          useValue: classroomExpressionsService,
        },
        { provide: ActivitiesService, useValue: activitiesService },
        { provide: TeachingScriptsService, useValue: teachingScriptsService },
        {
          provide: StudentQuestionsService,
          useValue: studentQuestionsService,
        },
        { provide: AssessmentsService, useValue: assessmentsService },
      ],
    }).compile();

    service = module.get(GenerationService);
  });

  describe('handleLessonKitGenerate event', () => {
    it('delegates to generateLessonKit when event is received', async () => {
      const spy = jest
        .spyOn(service, 'generateLessonKit')
        .mockResolvedValueOnce();

      await service.handleLessonKitGenerate({ lessonKitId: kitId });

      expect(spy).toHaveBeenCalledWith(kitId);
    });

    it('catches and logs errors without throwing unhandled exceptions', async () => {
      jest
        .spyOn(service, 'generateLessonKit')
        .mockRejectedValueOnce(new Error('Pipeline fatal'));

      await expect(
        service.handleLessonKitGenerate({ lessonKitId: kitId }),
      ).resolves.not.toThrow();
    });
  });

  describe('generateLessonKit', () => {
    it('executes the full 3-phase pipeline successfully', async () => {
      await service.generateLessonKit(kitId);

      // 1. Context loading
      expect(lessonKitsService.findById).toHaveBeenCalledWith(kitId);
      expect(lessonContentsService.findById).toHaveBeenCalledWith(contentId);

      // 2. Phase 1 (parallel)
      expect(vocabulariesService.generate).toHaveBeenCalled();
      expect(classroomExpressionsService.generate).toHaveBeenCalled();
      expect(activitiesService.generate).toHaveBeenCalled();
      expect(vocabulariesService.saveBulk).toHaveBeenCalledWith(
        kitId,
        mockVocab,
      );
      expect(classroomExpressionsService.saveBulk).toHaveBeenCalledWith(
        kitId,
        mockExpressions,
      );
      expect(activitiesService.saveBulk).toHaveBeenCalledWith(
        kitId,
        mockActivities,
      );

      // 3. Phase 2
      expect(lessonKitsService.updateCurrentStep).toHaveBeenCalledWith(
        kitId,
        'phase2',
      );
      expect(teachingScriptsService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Physics',
          grade: '10',
          title: "Newton's Laws",
        }),
        expect.objectContaining({
          vocabularies: mockVocab,
          expressions: mockExpressions,
          activities: mockActivities,
        }),
      );
      expect(teachingScriptsService.saveBulk).toHaveBeenCalledWith(
        kitId,
        mockScripts,
      );

      // 4. Phase 3 (parallel)
      expect(lessonKitsService.updateCurrentStep).toHaveBeenCalledWith(
        kitId,
        'phase3',
      );
      expect(studentQuestionsService.generate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          teachingScripts: mockScripts,
          activities: mockActivities,
        }),
      );
      expect(assessmentsService.generate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          teachingScripts: mockScripts,
          activities: mockActivities,
        }),
      );
      expect(studentQuestionsService.saveBulk).toHaveBeenCalledWith(
        kitId,
        mockQuestions,
      );
      expect(assessmentsService.saveBulk).toHaveBeenCalledWith(
        kitId,
        mockAssessments,
      );

      // 5. Completion
      expect(lessonKitsService.updateCurrentStep).toHaveBeenCalledWith(
        kitId,
        'completed',
      );
      expect(lessonKitsService.updateStatus).toHaveBeenCalledWith(
        kitId,
        LessonKitStatus.COMPLETED,
        expect.any(Number),
      );
    });

    it('throws and sets failed status when Lesson Kit is not found', async () => {
      lessonKitsService.findById.mockResolvedValueOnce(null);

      await expect(service.generateLessonKit(kitId)).rejects.toThrow(
        NotFoundException,
      );

      expect(lessonKitsService.updateStatus).toHaveBeenCalledWith(
        kitId,
        LessonKitStatus.FAILED,
      );
      expect(lessonKitsService.updateCurrentStep).toHaveBeenCalledWith(
        kitId,
        'phase1_failed',
      );
    });

    it('throws and sets phase2_failed status when Phase 2 generation throws', async () => {
      teachingScriptsService.generate.mockRejectedValueOnce(
        new Error('Phase 2 AI generation failed'),
      );

      await expect(service.generateLessonKit(kitId)).rejects.toThrow(
        'Phase 2 AI generation failed',
      );

      expect(lessonKitsService.updateStatus).toHaveBeenCalledWith(
        kitId,
        LessonKitStatus.FAILED,
      );
      expect(lessonKitsService.updateCurrentStep).toHaveBeenCalledWith(
        kitId,
        'phase2_failed',
      );
    });

    it('throws and sets phase3_failed status when Phase 3 generation throws', async () => {
      assessmentsService.generate.mockRejectedValueOnce(
        new Error('Phase 3 assessment failed'),
      );

      await expect(service.generateLessonKit(kitId)).rejects.toThrow(
        'Phase 3 assessment failed',
      );

      expect(lessonKitsService.updateStatus).toHaveBeenCalledWith(
        kitId,
        LessonKitStatus.FAILED,
      );
      expect(lessonKitsService.updateCurrentStep).toHaveBeenCalledWith(
        kitId,
        'phase3_failed',
      );
    });
  });
});
