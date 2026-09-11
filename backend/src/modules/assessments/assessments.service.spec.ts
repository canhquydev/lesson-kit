import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { ValidationError } from '../../common/validators';
import { AiService, ChatMessage } from '../ai/ai.service';
import { AssessmentQuestionType } from './constants';
import { AssessmentItemDto } from './dto';
import { Assessment } from './schemas/assessment.schema';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  const context: GenerationContext = {
    lessonContentId: new Types.ObjectId().toHexString(),
    subject: 'Physics',
    grade: '10',
    title: "Newton's laws",
    content: 'Force changes the motion of an object.',
    duration: 45,
    supportLevel: 'B1',
  };

  const dependencies = {
    teachingScripts: [
      {
        activity_name: 'Force experiment',
        objective: 'Observe the effect of a net force.',
      },
    ],
    activities: [{ activity_name: 'Force experiment', duration_minutes: 10 }],
  };

  const validAssessments: AssessmentItemDto[] = [
    {
      question_text: 'What is the unit of force?',
      question_type: AssessmentQuestionType.MULTIPLE_CHOICE,
      options: ['Newton', 'Joule', 'Watt', 'Pascal'],
      correct_answer: 'Newton',
      explanation: 'The SI unit of force is the Newton (N).',
      sort_order: 1,
    },
    {
      question_text: 'Force equals mass multiplied by acceleration.',
      question_type: AssessmentQuestionType.TRUE_FALSE,
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: "This is Newton's second law: F = ma.",
      sort_order: 2,
    },
    {
      question_text: 'What causes acceleration?',
      question_type: AssessmentQuestionType.SHORT_ANSWER,
      options: [],
      correct_answer: 'Net force',
      explanation: 'A non-zero net force causes acceleration.',
      sort_order: 3,
    },
  ];

  const findExec = jest.fn<Promise<AssessmentItemDto[]>, []>();
  const sort = jest.fn<
    { exec: typeof findExec },
    [sortBy: Record<string, number>]
  >();
  const find = jest.fn<
    { sort: typeof sort },
    [filter: Record<string, unknown>]
  >();
  const deleteExec = jest.fn<Promise<{ deletedCount: number }>, []>();
  const deleteMany = jest.fn<
    { exec: typeof deleteExec },
    [filter: Record<string, unknown>]
  >();
  const insertMany = jest.fn<
    Promise<Array<Record<string, unknown>>>,
    [documents: Array<Record<string, unknown>>]
  >();
  const generateJson = jest.fn<Promise<unknown>, [messages: ChatMessage[]]>();

  beforeEach(async () => {
    jest.clearAllMocks();
    findExec.mockResolvedValue(validAssessments);
    sort.mockReturnValue({ exec: findExec });
    find.mockReturnValue({ sort });
    deleteExec.mockResolvedValue({ deletedCount: 3 });
    deleteMany.mockReturnValue({ exec: deleteExec });
    insertMany.mockImplementation((documents) => Promise.resolve(documents));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        {
          provide: getModelToken(Assessment.name),
          useValue: { find, deleteMany, insertMany },
        },
        {
          provide: AiService,
          useValue: { generateJson },
        },
      ],
    }).compile();

    service = module.get(AssessmentsService);
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------

  describe('validate', () => {
    it('accepts 3 to 5 valid assessment questions', () => {
      expect(service.validate(validAssessments)).toEqual({
        isValid: true,
        errors: [],
      });
    });

    it('rejects an invalid count (< 3 or > 5)', () => {
      const tooFew = validAssessments.slice(0, 2);
      const resultTooFew = service.validate(tooFew);
      expect(resultTooFew.isValid).toBe(false);
      expect(resultTooFew.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('between 3 and 5')]),
      );

      const tooMany = [
        ...validAssessments,
        {
          question_text: 'Extra question 4',
          question_type: AssessmentQuestionType.SHORT_ANSWER,
          options: [],
          correct_answer: 'Answer',
          explanation: 'Exp',
          sort_order: 4,
        },
        {
          question_text: 'Extra question 5',
          question_type: AssessmentQuestionType.SHORT_ANSWER,
          options: [],
          correct_answer: 'Answer',
          explanation: 'Exp',
          sort_order: 5,
        },
        {
          question_text: 'Extra question 6',
          question_type: AssessmentQuestionType.SHORT_ANSWER,
          options: [],
          correct_answer: 'Answer',
          explanation: 'Exp',
          sort_order: 6,
        },
      ];
      const resultTooMany = service.validate(tooMany);
      expect(resultTooMany.isValid).toBe(false);
      expect(resultTooMany.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('between 3 and 5')]),
      );
    });

    it('rejects empty question_text and invalid question_type', () => {
      const invalid = validAssessments.map((a) => ({ ...a }));
      invalid[0].question_text = '';
      (invalid[1] as unknown as Record<string, unknown>).question_type =
        'unsupported_type';

      const result = service.validate(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('question_text'),
          expect.stringContaining('question_type'),
        ]),
      );
    });

    it('rejects invalid options and answers according to question_type', () => {
      const invalid = validAssessments.map((a) => ({ ...a }));
      // multiple choice with 3 options
      invalid[0].options = ['A', 'B', 'C'];
      // true_false with wrong options
      invalid[1].options = ['Yes', 'No'];

      const result = service.validate(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid "options"'),
          expect.stringContaining('Invalid "correct_answer"'),
        ]),
      );
    });

    it('rejects gaps or invalid sort_order', () => {
      const invalid = validAssessments.map((a) => ({ ...a }));
      invalid[0].sort_order = 2; // Should start at 1

      const result = service.validate(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('continuous sequence'),
        ]),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // generate
  // ---------------------------------------------------------------------------

  describe('generate', () => {
    it('uses teaching scripts and activities in the AI prompt', async () => {
      generateJson.mockResolvedValueOnce({
        assessments: validAssessments,
      });

      const result = await service.generate(context, dependencies);

      expect(result).toHaveLength(3);
      const messages = generateJson.mock.calls[0][0];
      expect(messages[1].content).toContain(
        'Observe the effect of a net force.',
      );
      expect(messages[1].content).toContain('Force experiment');
    });

    it('retries when AI returns fewer than 3 assessments', async () => {
      generateJson
        .mockResolvedValueOnce({
          assessments: validAssessments.slice(0, 2),
        })
        .mockResolvedValueOnce({ assessments: validAssessments });

      await expect(
        service.generate(context, dependencies),
      ).resolves.toHaveLength(3);
      expect(generateJson).toHaveBeenCalledTimes(2);

      const retryMessages = generateJson.mock.calls[1][0];
      expect(retryMessages[1].content).toContain(
        'Assessment question count must be between 3 and 5',
      );
    });

    it('rejects generation without scripts and activities', async () => {
      await expect(
        service.generate(context, {
          teachingScripts: [],
          activities: [],
        }),
      ).rejects.toThrow('teachingScripts, activities');
      expect(generateJson).not.toHaveBeenCalled();
    });

    it('retries when AI returns JSON null', async () => {
      generateJson
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ assessments: validAssessments });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    it('retries when AI response has wrong top-level key', async () => {
      generateJson
        .mockResolvedValueOnce({ questions: validAssessments }) // wrong key
        .mockResolvedValueOnce({ assessments: validAssessments });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    it('retries when AI output contains extra unknown fields', async () => {
      const withExtraFields = validAssessments.map((a) => ({
        ...a,
        unexpected_field: 'extra',
      }));
      generateJson
        .mockResolvedValueOnce({ assessments: withExtraFields })
        .mockResolvedValueOnce({ assessments: validAssessments });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    it('throws ValidationError with attempts = 3 after all retries fail', async () => {
      generateJson.mockResolvedValue({ assessments: [] }); // always invalid

      let caughtError: unknown;
      try {
        await service.generate(context, dependencies);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(ValidationError);
      expect((caughtError as ValidationError).attempts).toBe(3);
      expect((caughtError as ValidationError).errors.length).toBeGreaterThan(0);
      expect(generateJson).toHaveBeenCalledTimes(3);
    });
  });

  // ---------------------------------------------------------------------------
  // persistence
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    const kitId = new Types.ObjectId().toHexString();

    it('finds assessments by kit and sorts by sort order', async () => {
      await expect(service.findByKitId(kitId)).resolves.toEqual(
        validAssessments,
      );
      const filter = find.mock.calls[0][0];
      expect(filter.lesson_kit_id).toBeInstanceOf(Types.ObjectId);
      expect(sort).toHaveBeenCalledWith({ sort_order: 1 });
    });

    it('deletes every assessment belonging to a kit', async () => {
      await service.deleteByKitId(kitId);
      const filter = deleteMany.mock.calls[0][0];
      expect(filter.lesson_kit_id).toBeInstanceOf(Types.ObjectId);
      expect(deleteExec).toHaveBeenCalled();
    });

    it('adds lesson kit id before bulk insert', async () => {
      await service.saveBulk(kitId, validAssessments);

      const documents = insertMany.mock.calls[0][0];
      expect((documents[0].lesson_kit_id as Types.ObjectId).toHexString()).toBe(
        kitId,
      );
    });

    it('does not call insertMany when saveBulk receives invalid items', async () => {
      const invalidItems: AssessmentItemDto[] = [
        { ...validAssessments[0], question_text: '' },
      ];

      await expect(service.saveBulk(kitId, invalidItems)).rejects.toThrow(
        'saveBulk validation failed',
      );
      expect(insertMany).not.toHaveBeenCalled();
    });

    it('propagates Mongo insertMany errors', async () => {
      insertMany.mockRejectedValueOnce(new Error('MongoError: write conflict'));

      await expect(service.saveBulk(kitId, validAssessments)).rejects.toThrow(
        'MongoError',
      );
    });
  });
});
