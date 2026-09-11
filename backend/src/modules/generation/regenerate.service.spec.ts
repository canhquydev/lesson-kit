import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ComponentType, LessonKitStatus } from '../../common/enums';
import { ActivitiesService } from '../activities/activities.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { ClassroomExpressionsService } from '../classroom-expressions/classroom-expressions.service';
import { LessonContentsService } from '../lesson-contents/lesson-contents.service';
import { LessonKitsService } from '../lesson-kits/lesson-kits.service';
import { StudentQuestionsService } from '../student-questions/student-questions.service';
import { TeachingScriptsService } from '../teaching-scripts/teaching-scripts.service';
import { VocabulariesService } from '../vocabularies/vocabularies.service';
import { RegenerationPersistenceService } from './regeneration-persistence.service';
import { RegenerateService } from './regenerate.service';

describe('RegenerateService', () => {
  let service: RegenerateService;

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
    status: LessonKitStatus.COMPLETED,
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
      step_order: 1,
    },
  ];
  const mockQuestions = [{ question_en: 'What is force?', sort_order: 1 }];
  const mockAssessments = [{ question_text: 'Unit of force?', sort_order: 1 }];

  let lessonKitsService: { findById: jest.Mock };
  let lessonContentsService: { findById: jest.Mock };
  let vocabulariesService: {
    generate: jest.Mock;
    deleteByKitId: jest.Mock;
    saveBulk: jest.Mock;
    findByKitId: jest.Mock;
  };
  let classroomExpressionsService: {
    generate: jest.Mock;
    deleteByKitId: jest.Mock;
    saveBulk: jest.Mock;
    findByKitId: jest.Mock;
  };
  let activitiesService: {
    generate: jest.Mock;
    deleteByKitId: jest.Mock;
    saveBulk: jest.Mock;
    findByKitId: jest.Mock;
  };
  let teachingScriptsService: {
    generate: jest.Mock;
    deleteByKitId: jest.Mock;
    saveBulk: jest.Mock;
    findByKitId: jest.Mock;
  };
  let studentQuestionsService: {
    generate: jest.Mock;
    deleteByKitId: jest.Mock;
    saveBulk: jest.Mock;
    findByKitId: jest.Mock;
  };
  let assessmentsService: {
    generate: jest.Mock;
    deleteByKitId: jest.Mock;
    saveBulk: jest.Mock;
    findByKitId: jest.Mock;
  };
  let persistenceService: { replaceComponent: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    lessonKitsService = {
      findById: jest.fn().mockResolvedValue(mockLessonKit),
    };
    lessonContentsService = {
      findById: jest.fn().mockResolvedValue(mockLessonContent),
    };
    vocabulariesService = {
      generate: jest.fn().mockResolvedValue(mockVocab),
      deleteByKitId: jest.fn().mockResolvedValue(undefined),
      saveBulk: jest.fn().mockResolvedValue(mockVocab),
      findByKitId: jest.fn().mockResolvedValue(mockVocab),
    };
    classroomExpressionsService = {
      generate: jest.fn().mockResolvedValue(mockExpressions),
      deleteByKitId: jest.fn().mockResolvedValue(undefined),
      saveBulk: jest.fn().mockResolvedValue(mockExpressions),
      findByKitId: jest.fn().mockResolvedValue(mockExpressions),
    };
    activitiesService = {
      generate: jest.fn().mockResolvedValue(mockActivities),
      deleteByKitId: jest.fn().mockResolvedValue(undefined),
      saveBulk: jest.fn().mockResolvedValue(mockActivities),
      findByKitId: jest.fn().mockResolvedValue(mockActivities),
    };
    teachingScriptsService = {
      generate: jest.fn().mockResolvedValue(mockScripts),
      deleteByKitId: jest.fn().mockResolvedValue(undefined),
      saveBulk: jest.fn().mockResolvedValue(mockScripts),
      findByKitId: jest.fn().mockResolvedValue(mockScripts),
    };
    studentQuestionsService = {
      generate: jest.fn().mockResolvedValue(mockQuestions),
      deleteByKitId: jest.fn().mockResolvedValue(undefined),
      saveBulk: jest.fn().mockResolvedValue(mockQuestions),
      findByKitId: jest.fn().mockResolvedValue(mockQuestions),
    };
    assessmentsService = {
      generate: jest.fn().mockResolvedValue(mockAssessments),
      deleteByKitId: jest.fn().mockResolvedValue(undefined),
      saveBulk: jest.fn().mockResolvedValue(mockAssessments),
      findByKitId: jest.fn().mockResolvedValue(mockAssessments),
    };
    persistenceService = {
      replaceComponent: jest
        .fn()
        .mockImplementation(
          (
            _id: string,
            _component: ComponentType,
            data: unknown[],
            downstream: ComponentType[],
          ) =>
            Promise.resolve({
              data,
              staleComponents: downstream,
            }),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegenerateService,
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
        {
          provide: RegenerationPersistenceService,
          useValue: persistenceService,
        },
      ],
    }).compile();

    service = module.get(RegenerateService);
  });

  describe('normalizeComponentType', () => {
    it('normalizes valid aliases to proper ComponentType enum', () => {
      expect(service.normalizeComponentType('vocabulary')).toBe(
        ComponentType.VOCABULARY,
      );
      expect(service.normalizeComponentType('vocabularies')).toBe(
        ComponentType.VOCABULARY,
      );
      expect(service.normalizeComponentType('classroom_expressions')).toBe(
        ComponentType.EXPRESSIONS,
      );
      expect(service.normalizeComponentType('activities')).toBe(
        ComponentType.ACTIVITIES,
      );
      expect(service.normalizeComponentType('teaching_scripts')).toBe(
        ComponentType.SCRIPT,
      );
      expect(service.normalizeComponentType('script')).toBe(
        ComponentType.SCRIPT,
      );
      expect(service.normalizeComponentType('student_questions')).toBe(
        ComponentType.QUESTIONS,
      );
      expect(service.normalizeComponentType('questions')).toBe(
        ComponentType.QUESTIONS,
      );
      expect(service.normalizeComponentType('assessments')).toBe(
        ComponentType.ASSESSMENT,
      );
      expect(service.normalizeComponentType('assessment')).toBe(
        ComponentType.ASSESSMENT,
      );
    });

    it('throws BadRequestException for invalid component name', () => {
      expect(() => service.normalizeComponentType('invalid')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('state guard', () => {
    it('rejects regenerate while the lesson kit is not completed', async () => {
      lessonKitsService.findById.mockResolvedValueOnce({
        ...mockLessonKit,
        status: LessonKitStatus.GENERATING,
      });

      await expect(
        service.regenerate(kitId, ComponentType.VOCABULARY),
      ).rejects.toThrow(ConflictException);
      expect(vocabulariesService.generate).not.toHaveBeenCalled();
      expect(persistenceService.replaceComponent).not.toHaveBeenCalled();
    });
  });

  describe('stale-marking matrix', () => {
    it('marks script, questions, assessment as stale when vocabulary is regenerated', async () => {
      const result = await service.regenerate(kitId, 'vocabulary');

      expect(result.stale_components).toEqual([
        ComponentType.SCRIPT,
        ComponentType.QUESTIONS,
        ComponentType.ASSESSMENT,
      ]);
      expect(persistenceService.replaceComponent).toHaveBeenCalledWith(
        kitId,
        ComponentType.VOCABULARY,
        mockVocab,
        [
          ComponentType.SCRIPT,
          ComponentType.QUESTIONS,
          ComponentType.ASSESSMENT,
        ],
      );
      expect(vocabulariesService.generate).toHaveBeenCalled();
    });

    it('marks script, questions, assessment as stale when expressions is regenerated', async () => {
      const result = await service.regenerate(kitId, 'expressions');

      expect(result.stale_components).toEqual([
        ComponentType.SCRIPT,
        ComponentType.QUESTIONS,
        ComponentType.ASSESSMENT,
      ]);
      expect(persistenceService.replaceComponent).toHaveBeenCalledWith(
        kitId,
        ComponentType.EXPRESSIONS,
        mockExpressions,
        [
          ComponentType.SCRIPT,
          ComponentType.QUESTIONS,
          ComponentType.ASSESSMENT,
        ],
      );
    });

    it('marks script, questions, assessment as stale when activities is regenerated', async () => {
      const result = await service.regenerate(kitId, 'activities');

      expect(result.stale_components).toEqual([
        ComponentType.SCRIPT,
        ComponentType.QUESTIONS,
        ComponentType.ASSESSMENT,
      ]);
      expect(persistenceService.replaceComponent).toHaveBeenCalledWith(
        kitId,
        ComponentType.ACTIVITIES,
        mockActivities,
        [
          ComponentType.SCRIPT,
          ComponentType.QUESTIONS,
          ComponentType.ASSESSMENT,
        ],
      );
    });

    it('marks questions and assessment as stale when script is regenerated', async () => {
      const result = await service.regenerate(kitId, 'script');

      expect(result.stale_components).toEqual([
        ComponentType.QUESTIONS,
        ComponentType.ASSESSMENT,
      ]);
      expect(vocabulariesService.findByKitId).toHaveBeenCalledWith(kitId);
      expect(classroomExpressionsService.findByKitId).toHaveBeenCalledWith(
        kitId,
      );
      expect(activitiesService.findByKitId).toHaveBeenCalledWith(kitId);
      expect(persistenceService.replaceComponent).toHaveBeenCalledWith(
        kitId,
        ComponentType.SCRIPT,
        mockScripts,
        [ComponentType.QUESTIONS, ComponentType.ASSESSMENT],
      );
    });

    it('marks no components as stale when questions is regenerated', async () => {
      const result = await service.regenerate(kitId, 'questions');

      expect(result.stale_components).toEqual([]);
      expect(persistenceService.replaceComponent).toHaveBeenCalledWith(
        kitId,
        ComponentType.QUESTIONS,
        mockQuestions,
        [],
      );
    });

    it('marks no components as stale when assessment is regenerated', async () => {
      const result = await service.regenerate(kitId, 'assessment');

      expect(result.stale_components).toEqual([]);
      expect(persistenceService.replaceComponent).toHaveBeenCalledWith(
        kitId,
        ComponentType.ASSESSMENT,
        mockAssessments,
        [],
      );
    });
  });

  describe('error handling & dependency checks', () => {
    it('throws NotFoundException when Lesson Kit is not found', async () => {
      lessonKitsService.findById.mockResolvedValueOnce(null);

      await expect(service.regenerate(kitId, 'script')).rejects.toThrow(
        NotFoundException,
      );
    });

    // SCRIPT: each dependency individually missing must throw
    it('throws BadRequestException when regenerating script without vocab in DB', async () => {
      vocabulariesService.findByKitId.mockResolvedValueOnce([]); // vocab empty; expressions & activities present

      await expect(service.regenerate(kitId, 'script')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when regenerating script without expressions in DB', async () => {
      classroomExpressionsService.findByKitId.mockResolvedValueOnce([]); // expressions empty; vocab & activities present

      await expect(service.regenerate(kitId, 'script')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when regenerating script without activities in DB', async () => {
      activitiesService.findByKitId.mockResolvedValueOnce([]); // activities empty; vocab & expressions present

      await expect(service.regenerate(kitId, 'script')).rejects.toThrow(
        BadRequestException,
      );
    });

    // QUESTIONS: each dependency individually missing must throw
    it('throws BadRequestException when regenerating questions without scripts in DB', async () => {
      teachingScriptsService.findByKitId.mockResolvedValueOnce([]); // scripts empty; activities present

      await expect(service.regenerate(kitId, 'questions')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when regenerating questions without activities in DB', async () => {
      activitiesService.findByKitId.mockResolvedValueOnce([]); // activities empty; scripts present

      await expect(service.regenerate(kitId, 'questions')).rejects.toThrow(
        BadRequestException,
      );
    });

    // ASSESSMENT: each dependency individually missing must throw
    it('throws BadRequestException when regenerating assessment without scripts in DB', async () => {
      teachingScriptsService.findByKitId.mockResolvedValueOnce([]); // scripts empty; activities present

      await expect(service.regenerate(kitId, 'assessment')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when regenerating assessment without activities in DB', async () => {
      activitiesService.findByKitId.mockResolvedValueOnce([]); // activities empty; scripts present

      await expect(service.regenerate(kitId, 'assessment')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not touch persisted data when generation fails', async () => {
      vocabulariesService.generate.mockRejectedValueOnce(
        new Error('AI generation failed'),
      );

      await expect(service.regenerate(kitId, 'vocabulary')).rejects.toThrow(
        'AI generation failed',
      );
      expect(persistenceService.replaceComponent).not.toHaveBeenCalled();
    });

    it('propagates an atomic persistence failure', async () => {
      persistenceService.replaceComponent.mockRejectedValueOnce(
        new Error('Transaction aborted'),
      );

      await expect(service.regenerate(kitId, 'vocabulary')).rejects.toThrow(
        'Transaction aborted',
      );
    });
  });
});
