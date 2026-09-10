import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { ValidationError } from '../../common/validators';
import { AiService, ChatMessage } from '../ai/ai.service';
import { StudentQuestionItemDto } from './dto';
import { StudentQuestion } from './schemas/student-question.schema';
import { StudentQuestionsService } from './student-questions.service';

describe('StudentQuestionsService', () => {
  let service: StudentQuestionsService;

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

  const validQuestions: StudentQuestionItemDto[] = Array.from(
    { length: 5 },
    (_, index) => ({
      question_vi: `Tại sao vật ${index + 1} tăng tốc?`,
      question_en: `Why does object ${index + 1} accelerate?`,
      suggested_answer_en: 'It accelerates because a net force acts on it.',
      suggested_answer_vi: 'Vật tăng tốc vì có hợp lực tác dụng lên nó.',
      sort_order: index + 1,
    }),
  );

  const findExec = jest.fn<Promise<StudentQuestionItemDto[]>, []>();
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
    findExec.mockResolvedValue(validQuestions);
    sort.mockReturnValue({ exec: findExec });
    find.mockReturnValue({ sort });
    deleteExec.mockResolvedValue({ deletedCount: 5 });
    deleteMany.mockReturnValue({ exec: deleteExec });
    insertMany.mockImplementation((documents) => Promise.resolve(documents));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentQuestionsService,
        {
          provide: getModelToken(StudentQuestion.name),
          useValue: { find, deleteMany, insertMany },
        },
        {
          provide: AiService,
          useValue: { generateJson },
        },
      ],
    }).compile();

    service = module.get(StudentQuestionsService);
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------

  describe('validate', () => {
    it('accepts 5 to 8 complete bilingual questions', () => {
      expect(service.validate(validQuestions)).toEqual({
        isValid: true,
        errors: [],
      });
    });

    it('rejects an invalid count, empty bilingual fields and order gaps', () => {
      const invalid = validQuestions.slice(0, 4).map((question) => ({
        ...question,
      }));
      invalid[0].question_en = '';
      invalid[1].sort_order = 4;

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('between 5 and 8'),
          expect.stringContaining('question_en'),
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
        student_questions: validQuestions,
      });

      const result = await service.generate(context, dependencies);

      expect(result).toHaveLength(5);
      const messages = generateJson.mock.calls[0][0];
      expect(messages[1].content).toContain(
        'Observe the effect of a net force.',
      );
      expect(messages[1].content).toContain('Force experiment');
    });

    it('retries when AI returns fewer than 5 questions', async () => {
      generateJson
        .mockResolvedValueOnce({
          student_questions: validQuestions.slice(0, 4),
        })
        .mockResolvedValueOnce({ student_questions: validQuestions });

      await expect(
        service.generate(context, dependencies),
      ).resolves.toHaveLength(5);
      expect(generateJson).toHaveBeenCalledTimes(2);

      const retryMessages = generateJson.mock.calls[1][0];
      expect(retryMessages[1].content).toContain(
        'Student question count must be between 5 and 8',
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

    // JSON null/wrong key — retry
    it('retries when AI returns JSON null', async () => {
      generateJson
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ student_questions: validQuestions });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    it('retries when AI response has wrong top-level key', async () => {
      generateJson
        .mockResolvedValueOnce({ questions: validQuestions }) // wrong key
        .mockResolvedValueOnce({ student_questions: validQuestions });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Extra fields rejected
    it('retries when AI output contains extra unknown fields', async () => {
      const withExtraFields = validQuestions.map((q) => ({
        ...q,
        extra_field: 'should be rejected',
      }));
      generateJson
        .mockResolvedValueOnce({ student_questions: withExtraFields })
        .mockResolvedValueOnce({ student_questions: validQuestions });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Exhausts retries → ValidationError
    it('throws ValidationError with attempts = 3 after all retries fail', async () => {
      generateJson.mockResolvedValue({ student_questions: [] }); // always invalid

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

    it('finds questions by kit and sorts by sort order', async () => {
      await expect(service.findByKitId(kitId)).resolves.toEqual(validQuestions);
      const filter = find.mock.calls[0][0];
      expect(filter.lesson_kit_id).toBeInstanceOf(Types.ObjectId);
      expect(sort).toHaveBeenCalledWith({ sort_order: 1 });
    });

    it('deletes every question belonging to a kit', async () => {
      await service.deleteByKitId(kitId);
      const filter = deleteMany.mock.calls[0][0];
      expect(filter.lesson_kit_id).toBeInstanceOf(Types.ObjectId);
      expect(deleteExec).toHaveBeenCalled();
    });

    it('adds lesson kit id before bulk insert', async () => {
      await service.saveBulk(kitId, validQuestions);

      const documents = insertMany.mock.calls[0][0];
      expect((documents[0].lesson_kit_id as Types.ObjectId).toHexString()).toBe(
        kitId,
      );
    });

    // Invalid saveBulk does NOT call insertMany
    it('does not call insertMany when saveBulk receives invalid items', async () => {
      const invalidItems: StudentQuestionItemDto[] = [
        { ...validQuestions[0], question_en: '' },
      ];

      await expect(service.saveBulk(kitId, invalidItems)).rejects.toThrow(
        'saveBulk validation failed',
      );
      expect(insertMany).not.toHaveBeenCalled();
    });

    // Mongo error propagates
    it('propagates Mongo insertMany errors', async () => {
      insertMany.mockRejectedValueOnce(new Error('MongoError: write conflict'));

      await expect(service.saveBulk(kitId, validQuestions)).rejects.toThrow(
        'MongoError',
      );
    });
  });
});
