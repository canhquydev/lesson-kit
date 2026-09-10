import { validate, validateSync } from 'class-validator';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { AssessmentQuestionType } from './constants/assessment-question-type.enum';
import {
  AssessmentItemDto,
  CreateAssessmentDto,
} from './dto/create-assessment.dto';
import {
  ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentPrompt,
} from './prompts/assessment.prompt';
import { AssessmentSchema } from './schemas/assessment.schema';
import {
  hasValidAssessmentCorrectAnswer,
  hasValidAssessmentOptions,
} from './validators';

describe('Assessments Day 1 artifacts', () => {
  const context: GenerationContext = {
    lessonContentId: new Types.ObjectId().toHexString(),
    subject: 'Physics',
    grade: '10',
    title: "Newton's laws",
    content: 'Force changes the motion of an object.',
    duration: 45,
    supportLevel: 'B1',
  };

  // ---------------------------------------------------------------------------
  // Schema
  // ---------------------------------------------------------------------------

  describe('schema', () => {
    it('defines the assessments collection and all persisted fields', () => {
      expect(AssessmentSchema.options.collection).toBe('assessments');
      expect(AssessmentSchema.get('timestamps')).toBe(true);

      const expectedPaths = {
        lesson_kit_id: 'ObjectId',
        question_text: 'String',
        question_type: 'String',
        options: 'Array',
        correct_answer: 'String',
        explanation: 'String',
        sort_order: 'Number',
        _id: 'ObjectId',
        createdAt: 'Date',
        updatedAt: 'Date',
      };

      Object.entries(expectedPaths).forEach(([path, instance]) => {
        expect(AssessmentSchema.path(path)?.instance).toBe(instance);
      });

      expect(AssessmentSchema.path('lesson_kit_id').options.ref).toBe(
        'LessonKit',
      );
      expect(AssessmentSchema.path('question_type').options.enum).toStrictEqual(
        AssessmentQuestionType,
      );
    });

    it('defines a compound index for assessment order', () => {
      const hasOrderIndex = AssessmentSchema.indexes().some(
        ([fields]) => fields.lesson_kit_id === 1 && fields.sort_order === 1,
      );

      expect(hasOrderIndex).toBe(true);
    });

    // Mongoose validators tested via rule functions directly — no DB needed
    describe('Mongoose validators (no DB)', () => {
      it('passes for a valid short_answer', () => {
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.SHORT_ANSWER, []),
        ).toBe(true);
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.SHORT_ANSWER,
            'My answer',
            [],
          ),
        ).toBe(true);
      });

      it('validates multiple_choice options: exactly 4 unique', () => {
        // Valid
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.MULTIPLE_CHOICE, [
            'A',
            'B',
            'C',
            'D',
          ]),
        ).toBe(true);
        // Only 3 options
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.MULTIPLE_CHOICE, [
            'A',
            'B',
            'C',
          ]),
        ).toBe(false);
        // Duplicate options
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.MULTIPLE_CHOICE, [
            'A',
            'A',
            'B',
            'C',
          ]),
        ).toBe(false);
      });

      it('validates true_false options: exactly ["True", "False"]', () => {
        // Valid
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.TRUE_FALSE, [
            'True',
            'False',
          ]),
        ).toBe(true);
        // Wrong order
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.TRUE_FALSE, [
            'False',
            'True',
          ]),
        ).toBe(false);
        // Lowercase
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.TRUE_FALSE, [
            'true',
            'false',
          ]),
        ).toBe(false);
        // Wrong values
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.TRUE_FALSE, [
            'Yes',
            'No',
          ]),
        ).toBe(false);
      });

      it('validates matching/short_answer options: must be empty array', () => {
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.MATCHING, []),
        ).toBe(true);
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.SHORT_ANSWER, []),
        ).toBe(true);
        // Non-empty options for matching should fail
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.MATCHING, ['A']),
        ).toBe(false);
        expect(
          hasValidAssessmentOptions(AssessmentQuestionType.SHORT_ANSWER, ['A']),
        ).toBe(false);
      });

      it('validates correct_answer must be in options for multiple_choice', () => {
        const options = ['A', 'B', 'C', 'D'];
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.MULTIPLE_CHOICE,
            'A',
            options,
          ),
        ).toBe(true);
        // Answer not in options
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.MULTIPLE_CHOICE,
            'E',
            options,
          ),
        ).toBe(false);
      });

      it('validates correct_answer for true_false: must be "True" or "False"', () => {
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.TRUE_FALSE,
            'True',
            ['True', 'False'],
          ),
        ).toBe(true);
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.TRUE_FALSE,
            'False',
            ['True', 'False'],
          ),
        ).toBe(true);
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.TRUE_FALSE,
            'true',
            ['True', 'False'],
          ),
        ).toBe(false);
        expect(
          hasValidAssessmentCorrectAnswer(
            AssessmentQuestionType.TRUE_FALSE,
            'Maybe',
            ['True', 'False'],
          ),
        ).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DTO
  // ---------------------------------------------------------------------------

  describe('DTO', () => {
    it('accepts a valid multiple_choice assessment question', async () => {
      const dto = Object.assign(new CreateAssessmentDto(), {
        lesson_kit_id: new Types.ObjectId().toHexString(),
        question_text: 'What happens when the net force increases?',
        question_type: AssessmentQuestionType.MULTIPLE_CHOICE,
        options: [
          'Acceleration increases',
          'Acceleration decreases',
          'Mass disappears',
          'Motion always stops',
        ],
        correct_answer: 'Acceleration increases',
        explanation: 'Acceleration is proportional to net force.',
        sort_order: 1,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('accepts a valid true_false assessment question', async () => {
      const dto = Object.assign(new CreateAssessmentDto(), {
        lesson_kit_id: new Types.ObjectId().toHexString(),
        question_text: 'Force = mass × acceleration.',
        question_type: AssessmentQuestionType.TRUE_FALSE,
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: "This is Newton's second law.",
        sort_order: 2,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('accepts a valid matching assessment question', async () => {
      const dto = Object.assign(new CreateAssessmentDto(), {
        lesson_kit_id: new Types.ObjectId().toHexString(),
        question_text: 'Match the law to its description.',
        question_type: AssessmentQuestionType.MATCHING,
        options: [],
        correct_answer: 'Force = ma',
        explanation: 'Match by definition.',
        sort_order: 3,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('accepts a valid short_answer assessment question', async () => {
      const dto = Object.assign(new CreateAssessmentDto(), {
        lesson_kit_id: new Types.ObjectId().toHexString(),
        question_text: "State Newton's first law.",
        question_type: AssessmentQuestionType.SHORT_ANSWER,
        options: [],
        correct_answer:
          'An object remains at rest unless acted upon by a net force.',
        explanation: 'Law of inertia.',
        sort_order: 4,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects an unsupported question type and malformed fields', async () => {
      const dto = Object.assign(new CreateAssessmentDto(), {
        lesson_kit_id: 'invalid-id',
        question_text: '',
        question_type: 'essay',
        options: 'not-an-array',
        correct_answer: '',
        explanation: '',
        sort_order: 0,
      });

      const invalidProperties = (await validate(dto)).map(
        (error) => error.property,
      );

      expect(invalidProperties).toEqual(
        expect.arrayContaining([
          'lesson_kit_id',
          'question_text',
          'question_type',
          'options',
          'correct_answer',
          'explanation',
          'sort_order',
        ]),
      );
    });

    // multiple_choice: too few options
    it('rejects multiple_choice with fewer than 4 options', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Test?',
        question_type: AssessmentQuestionType.MULTIPLE_CHOICE,
        options: ['A', 'B', 'C'], // only 3
        correct_answer: 'A',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const optionErrors = errors.find((e) => e.property === 'options');
      expect(optionErrors).toBeDefined();
    });

    // multiple_choice: duplicate options
    it('rejects multiple_choice with duplicate options', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Test?',
        question_type: AssessmentQuestionType.MULTIPLE_CHOICE,
        options: ['A', 'A', 'B', 'C'], // duplicate
        correct_answer: 'A',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const optionErrors = errors.find((e) => e.property === 'options');
      expect(optionErrors).toBeDefined();
    });

    // multiple_choice: correct_answer not in options
    it('rejects multiple_choice when correct_answer is not in options', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Test?',
        question_type: AssessmentQuestionType.MULTIPLE_CHOICE,
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'E', // not in options
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const answerErrors = errors.find((e) => e.property === 'correct_answer');
      expect(answerErrors).toBeDefined();
    });

    // true_false: wrong options
    it('rejects true_false with wrong options (not ["True", "False"])', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Test?',
        question_type: AssessmentQuestionType.TRUE_FALSE,
        options: ['Yes', 'No'], // wrong
        correct_answer: 'Yes',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const optionErrors = errors.find((e) => e.property === 'options');
      expect(optionErrors).toBeDefined();
    });

    // true_false: reversed options order
    it('rejects true_false with reversed option order ["False", "True"]', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Test?',
        question_type: AssessmentQuestionType.TRUE_FALSE,
        options: ['False', 'True'], // reversed
        correct_answer: 'True',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const optionErrors = errors.find((e) => e.property === 'options');
      expect(optionErrors).toBeDefined();
    });

    // matching: non-empty options
    it('rejects matching with non-empty options', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Match items.',
        question_type: AssessmentQuestionType.MATCHING,
        options: ['A', 'B'], // should be []
        correct_answer: 'A-B',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const optionErrors = errors.find((e) => e.property === 'options');
      expect(optionErrors).toBeDefined();
    });

    // short_answer: non-empty options
    it('rejects short_answer with non-empty options', async () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Answer this.',
        question_type: AssessmentQuestionType.SHORT_ANSWER,
        options: ['hint'], // should be []
        correct_answer: 'The answer',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = await validate(dto);
      const optionErrors = errors.find((e) => e.property === 'options');
      expect(optionErrors).toBeDefined();
    });

    // validateSync — simulates Mongoose path without DB connection
    it('validates DTO synchronously without DB connection', () => {
      const dto = Object.assign(new AssessmentItemDto(), {
        question_text: 'Test?',
        question_type: AssessmentQuestionType.MULTIPLE_CHOICE,
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        explanation: 'Explanation.',
        sort_order: 1,
      });

      const errors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errors).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Prompt
  // ---------------------------------------------------------------------------

  describe('prompt', () => {
    it('includes dependencies, supported types, and the output contract', () => {
      const prompt = buildAssessmentPrompt(context, {
        teachingScripts: [
          {
            activity_name: 'Force experiment',
            objective: 'Apply the second law',
          },
        ],
        activities: [
          {
            activity_name: 'Cart experiment',
            duration_minutes: 15,
          },
        ],
      });

      expect(ASSESSMENT_SYSTEM_PROMPT).toContain('valid JSON object');
      expect(prompt).toContain("Newton's laws");
      expect(prompt).toContain('Apply the second law');
      expect(prompt).toContain('Cart experiment');

      Object.values(AssessmentQuestionType).forEach((questionType) => {
        expect(prompt).toContain(questionType);
      });

      [
        'question_text',
        'question_type',
        'options',
        'correct_answer',
        'explanation',
        'sort_order',
      ].forEach((field) => expect(prompt).toContain(`"${field}"`));
    });

    it('adds validation errors to a retry prompt', () => {
      const prompt = buildAssessmentPrompt(
        context,
        { teachingScripts: [], activities: [] },
        ['Multiple-choice questions require four options'],
      );

      expect(prompt).toContain(
        'Multiple-choice questions require four options',
      );
    });
  });
});
