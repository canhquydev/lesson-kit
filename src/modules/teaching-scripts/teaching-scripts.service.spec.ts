import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { ValidationError } from '../../common/validators';
import { AiService, ChatMessage } from '../ai/ai.service';
import { TeachingScriptItemDto } from './dto';
import { TeachingScript } from './schemas/teaching-script.schema';
import { TeachingScriptsService } from './teaching-scripts.service';

describe('TeachingScriptsService', () => {
  let service: TeachingScriptsService;

  const context: GenerationContext = {
    lessonContentId: new Types.ObjectId().toHexString(),
    subject: 'Physics',
    grade: '10',
    title: "Newton's laws",
    content: 'Force changes the motion of an object.',
    duration: 45,
    supportLevel: 'B1',
  };

  // Dependencies with two distinct activities (matching context.duration = 45)
  const dependencies = {
    vocabularies: [{ word: 'force', meaning_vi: 'lực' }],
    expressions: [
      {
        expression_en: 'Work with your partner.',
        translation_vi: 'Làm việc cùng bạn bên cạnh.',
      },
    ],
    activities: [
      { activity_name: 'Force experiment', duration_minutes: 10 },
      { activity_name: 'Pair discussion', duration_minutes: 15 },
    ],
  };

  // Base valid scripts — total = 5 + 10 + 15 + 15 = 45 min
  const validScripts: TeachingScriptItemDto[] = [
    {
      activity_name: 'Warm-up',
      duration_minutes: 5,
      objective: 'Recall prior knowledge.',
      teacher_speech_en: 'What do you remember about motion?',
      teacher_speech_vi: 'Các em nhớ gì về chuyển động?',
      teacher_action: 'Show a moving object.',
      expected_student_response: 'Students describe the motion.',
      notes: '',
      step_order: 1,
    },
    {
      activity_name: 'Force experiment',
      duration_minutes: 10,
      objective: 'Observe the effect of a net force.',
      teacher_speech_en: 'Push the cart gently and observe its motion.',
      teacher_speech_vi: 'Đẩy nhẹ xe và quan sát chuyển động.',
      teacher_action: 'Demonstrate the experiment.',
      expected_student_response: 'Students record their observations.',
      notes: 'Prepare one cart per group.',
      step_order: 2,
    },
    {
      activity_name: 'Pair discussion',
      duration_minutes: 15,
      objective: "Explain Newton's second law.",
      teacher_speech_en:
        'Discuss the relationship between force and acceleration.',
      teacher_speech_vi: 'Thảo luận mối quan hệ giữa lực và gia tốc.',
      teacher_action: 'Monitor pairs and ask follow-up questions.',
      expected_student_response: 'Students explain the relationship.',
      notes: '',
      step_order: 3,
    },
    {
      activity_name: 'Wrap-up',
      duration_minutes: 15,
      objective: 'Consolidate the lesson.',
      teacher_speech_en: 'Summarize the three laws in your own words.',
      teacher_speech_vi: 'Tóm tắt ba định luật bằng lời của em.',
      teacher_action: 'Invite students to share.',
      expected_student_response: 'Students present their summaries.',
      notes: '',
      step_order: 4,
    },
  ];

  const findExec = jest.fn<Promise<TeachingScriptItemDto[]>, []>();
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
    findExec.mockResolvedValue(validScripts);
    sort.mockReturnValue({ exec: findExec });
    find.mockReturnValue({ sort });
    deleteExec.mockResolvedValue({ deletedCount: 4 });
    deleteMany.mockReturnValue({ exec: deleteExec });
    insertMany.mockImplementation((documents) => Promise.resolve(documents));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachingScriptsService,
        {
          provide: getModelToken(TeachingScript.name),
          useValue: { find, deleteMany, insertMany },
        },
        {
          provide: AiService,
          useValue: { generateJson },
        },
      ],
    }).compile();

    service = module.get(TeachingScriptsService);
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------

  describe('validate', () => {
    // Test 1: Valid input with multiple activities
    it('accepts complete scripts with multiple activities and continuous step order', () => {
      expect(service.validate(validScripts)).toEqual({
        isValid: true,
        errors: [],
      });
    });

    it('rejects empty fields, invalid duration and discontinuous order', () => {
      const invalid = [
        {
          ...validScripts[0],
          teacher_speech_en: '',
          duration_minutes: 0,
          step_order: 2,
        },
      ];

      const result = service.validate(invalid);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('teacher_speech_en'),
          expect.stringContaining('duration_minutes'),
          expect.stringContaining('continuous sequence'),
        ]),
      );
    });

    // Test 7: Missing English/Vietnamese fields
    it('rejects items missing teacher_speech_en or teacher_speech_vi', () => {
      const missingEn = [{ ...validScripts[0], teacher_speech_en: '' }];
      const missingVi = [{ ...validScripts[0], teacher_speech_vi: '' }];

      expect(service.validate(missingEn).isValid).toBe(false);
      expect(service.validate(missingVi).isValid).toBe(false);
    });

    // Test 10: Missing required field
    it('rejects items with missing required fields', () => {
      const missingObjective = [
        { ...validScripts[0], objective: undefined as unknown as string },
      ];
      expect(service.validate(missingObjective).isValid).toBe(false);
    });

    // Test 12: NaN, Infinity, negative, string, decimal duration
    it('rejects NaN, Infinity, negative, string and decimal duration_minutes', () => {
      const cases = [NaN, Infinity, -5, '10', 10.5];
      cases.forEach((dur) => {
        const invalid = [
          {
            ...validScripts[0],
            duration_minutes: dur as number,
          },
        ];
        const result = service.validate(invalid);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.includes('duration_minutes'))).toBe(
          true,
        );
      });
    });

    // Test 8: Wrong top-level key (null/non-array)
    it('rejects non-array input with descriptive error', () => {
      const result = service.validate(null as unknown as unknown[]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('teaching_scripts');
    });
  });

  // ---------------------------------------------------------------------------
  // generate
  // ---------------------------------------------------------------------------

  describe('generate', () => {
    // Test 1: Valid input with multiple activities
    it('uses all Phase 1 dependencies and returns valid scripts', async () => {
      generateJson.mockResolvedValueOnce({ teaching_scripts: validScripts });

      const result = await service.generate(context, dependencies);

      expect(result).toHaveLength(4);
      expect(generateJson).toHaveBeenCalledTimes(1);
      const messages = generateJson.mock.calls[0][0];
      expect(messages[1].content).toContain('force');
      expect(messages[1].content).toContain('Work with your partner.');
      expect(messages[1].content).toContain('Force experiment');
      expect(messages[1].content).toContain('Pair discussion');
    });

    // Test 17: Supports both `vocab` and `vocabularies` alias
    it('accepts vocab alias instead of vocabularies', async () => {
      generateJson.mockResolvedValueOnce({ teaching_scripts: validScripts });

      const depsWithVocab = {
        vocab: [{ word: 'force', meaning_vi: 'lực' }],
        expressions: dependencies.expressions,
        activities: dependencies.activities,
      };

      const result = await service.generate(context, depsWithVocab);
      expect(result).toHaveLength(4);
      expect(generateJson).toHaveBeenCalledTimes(1);
      expect(generateJson.mock.calls[0][0][1].content).toContain('force');
    });

    // Total duration retry
    it('retries when total duration is wrong', async () => {
      generateJson
        .mockResolvedValueOnce({
          teaching_scripts: [
            ...validScripts.slice(0, 3),
            { ...validScripts[3], duration_minutes: 14 },
          ],
        })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await expect(
        service.generate(context, dependencies),
      ).resolves.toHaveLength(4);
      expect(generateJson).toHaveBeenCalledTimes(2);

      const retryMessages = generateJson.mock.calls[1][0];
      expect(retryMessages[1].content).toContain(
        'Total duration must equal 45 minutes',
      );
    });

    // Test 2: Missing one activity
    it('retries when a Phase 1 activity is missing', async () => {
      generateJson
        .mockResolvedValueOnce({
          teaching_scripts: validScripts.map((script) =>
            script.activity_name === 'Pair discussion'
              ? { ...script, activity_name: 'Independent practice' }
              : script,
          ),
        })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);

      expect(generateJson).toHaveBeenCalledTimes(2);
      const retryMessages = generateJson.mock.calls[1][0];
      expect(retryMessages[1].content).toContain(
        'Missing Phase 1 activity "Pair discussion"',
      );
    });

    // Test 3: Activity renamed (different name)
    it('retries when a Phase 1 activity has a renamed activity_name', async () => {
      generateJson
        .mockResolvedValueOnce({
          teaching_scripts: validScripts.map((script) =>
            script.activity_name === 'Force experiment'
              ? { ...script, activity_name: 'Force Experiment' } // case-sensitive
              : script,
          ),
        })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Test 4: Case-sensitive and near-match names do not match
    it('does not match activity by case-insensitive or near-match names', async () => {
      generateJson
        .mockResolvedValueOnce({
          teaching_scripts: validScripts.map((script) =>
            script.activity_name === 'Pair discussion'
              ? { ...script, activity_name: 'pair discussion' } // lowercase
              : script,
          ),
        })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Test 5: Activity with correct name but different duration fails
    it('retries when a Phase 1 activity has the same name but different duration', async () => {
      generateJson
        .mockResolvedValueOnce({
          teaching_scripts: validScripts.map((script) =>
            script.activity_name === 'Force experiment'
              ? { ...script, duration_minutes: 12 } // wrong duration
              : script,
          ),
        })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
      const retryMsg = generateJson.mock.calls[1][0][1].content;
      expect(retryMsg).toContain('Missing Phase 1 activity "Force experiment"');
    });

    // Test 6: Total duration short and over
    it('retries when total duration is less than context.duration', async () => {
      const shortScripts = validScripts.map((s, i) =>
        i === 3 ? { ...s, duration_minutes: 5 } : s,
      ); // total = 30
      generateJson
        .mockResolvedValueOnce({ teaching_scripts: shortScripts })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    it('retries when total duration exceeds context.duration', async () => {
      const longScripts = validScripts.map((s, i) =>
        i === 3 ? { ...s, duration_minutes: 25 } : s,
      ); // total = 55
      generateJson
        .mockResolvedValueOnce({ teaching_scripts: longScripts })
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Test 8: Wrong top-level key (wrong JSON structure)
    it('retries when AI returns object with wrong top-level key', async () => {
      generateJson
        .mockResolvedValueOnce({ scripts: validScripts }) // wrong key
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Test 9: JSON null response
    it('retries on JSON null response and eventually succeeds', async () => {
      generateJson
        .mockResolvedValueOnce(null) // null
        .mockResolvedValueOnce({ teaching_scripts: validScripts });

      await service.generate(context, dependencies);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Test 11: Fails after three retries — throws ValidationError with attempts = 3
    it('throws ValidationError with attempts = 3 after exhausting all retries', async () => {
      generateJson.mockResolvedValue({ teaching_scripts: [] }); // always invalid

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

    // Test 13: Two Phase 1 activities with same name AND same duration both required
    it('requires all occurrences when Phase 1 has duplicate activity name+duration pairs', async () => {
      const depsWithDuplicates = {
        ...dependencies,
        activities: [
          { activity_name: 'Same', duration_minutes: 5 },
          { activity_name: 'Same', duration_minutes: 5 },
        ],
      };
      // Output has only one 'Same/5' — should fail
      const oneScript: TeachingScriptItemDto[] = [
        { ...validScripts[0], activity_name: 'Same', duration_minutes: 5 },
        { ...validScripts[1], activity_name: 'Other', duration_minutes: 40 },
      ];
      generateJson
        .mockResolvedValueOnce({ teaching_scripts: oneScript })
        .mockResolvedValueOnce({
          teaching_scripts: [
            {
              ...validScripts[0],
              activity_name: 'Same',
              duration_minutes: 5,
              step_order: 1,
            },
            {
              ...validScripts[1],
              activity_name: 'Same',
              duration_minutes: 5,
              step_order: 2,
            },
            {
              ...validScripts[2],
              activity_name: 'Wrap-up',
              duration_minutes: 35,
              step_order: 3,
            },
          ],
        });

      await service.generate(context, depsWithDuplicates);
      expect(generateJson).toHaveBeenCalledTimes(2);
    });

    // Test 14: Same name + output has different duration → should fail
    it('rejects when output has same activity name but with wrong duration for one of them', async () => {
      const depsWithDuplicates = {
        ...dependencies,
        activities: [
          { activity_name: 'Test', duration_minutes: 5 },
          { activity_name: 'Test', duration_minutes: 10 },
        ],
      };
      // Output has two 'Test' but both with 5 min — only one 'Test/5' required, but 'Test/10' is missing
      const twoSame = [
        {
          ...validScripts[0],
          activity_name: 'Test',
          duration_minutes: 5,
          step_order: 1,
        },
        {
          ...validScripts[1],
          activity_name: 'Test',
          duration_minutes: 5,
          step_order: 2,
        },
        {
          ...validScripts[2],
          activity_name: 'Filler',
          duration_minutes: 35,
          step_order: 3,
        },
      ];
      // Correct second attempt: has both Test/5 AND Test/10
      const correctedScripts = [
        {
          ...validScripts[0],
          activity_name: 'Test',
          duration_minutes: 5,
          step_order: 1,
        },
        {
          ...validScripts[1],
          activity_name: 'Test',
          duration_minutes: 10,
          step_order: 2,
        },
        {
          ...validScripts[2],
          activity_name: 'Filler',
          duration_minutes: 30,
          step_order: 3,
        },
      ];
      generateJson
        .mockResolvedValueOnce({ teaching_scripts: twoSame })
        .mockResolvedValueOnce({ teaching_scripts: correctedScripts });

      await service.generate(context, depsWithDuplicates);
      expect(generateJson).toHaveBeenCalledTimes(2);
      const retryMsg = generateJson.mock.calls[1][0][1].content;
      expect(retryMsg).toContain('Missing Phase 1 activity "Test"');
    });

    // Rejects generation without complete Phase 1 dependencies
    it('rejects generation without complete Phase 1 dependencies', async () => {
      await expect(
        service.generate(context, {
          vocabularies: [],
          expressions: dependencies.expressions,
          activities: dependencies.activities,
        }),
      ).rejects.toThrow('vocabularies');
      expect(generateJson).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // persistence
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    const kitId = new Types.ObjectId().toHexString();

    it('finds scripts by kit and sorts by step order', async () => {
      await expect(service.findByKitId(kitId)).resolves.toEqual(validScripts);
      const filter = find.mock.calls[0][0];
      expect(filter.lesson_kit_id).toBeInstanceOf(Types.ObjectId);
      expect(sort).toHaveBeenCalledWith({ step_order: 1 });
    });

    it('deletes every script belonging to a kit', async () => {
      await service.deleteByKitId(kitId);
      const filter = deleteMany.mock.calls[0][0];
      expect(filter.lesson_kit_id).toBeInstanceOf(Types.ObjectId);
      expect(deleteExec).toHaveBeenCalled();
    });

    it('adds lesson kit id and defaults notes before bulk insert', async () => {
      await service.saveBulk(kitId, [{ ...validScripts[0], notes: undefined }]);

      const documents = insertMany.mock.calls[0][0];
      expect((documents[0].lesson_kit_id as Types.ObjectId).toHexString()).toBe(
        kitId,
      );
      expect(documents[0].notes).toBe('');
    });

    // Test 15: Mongo insert error propagates
    it('propagates Mongo insertMany errors', async () => {
      insertMany.mockRejectedValueOnce(new Error('MongoError: duplicate key'));

      await expect(service.saveBulk(kitId, validScripts)).rejects.toThrow(
        'MongoError',
      );
    });

    // Test 16: Invalid saveBulk does NOT call insertMany
    it('does not call insertMany when saveBulk receives invalid items', async () => {
      const invalidItems: TeachingScriptItemDto[] = [
        { ...validScripts[0], teacher_speech_en: '' },
      ];

      await expect(service.saveBulk(kitId, invalidItems)).rejects.toThrow(
        'saveBulk validation failed',
      );
      expect(insertMany).not.toHaveBeenCalled();
    });
  });
});
