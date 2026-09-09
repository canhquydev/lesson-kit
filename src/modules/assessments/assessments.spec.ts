import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { AssessmentQuestionType } from './constants/assessment-question-type.enum';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import {
  ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentPrompt,
} from './prompts/assessment.prompt';
import { AssessmentSchema } from './schemas/assessment.schema';

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
  });

  describe('DTO', () => {
    it('accepts a valid assessment question', async () => {
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
  });

  describe('prompt', () => {
    it('includes dependencies, supported types, and the output contract', () => {
      const prompt = buildAssessmentPrompt(context, {
        teachingScripts: [{ objective: 'Apply the second law' }],
        activities: [{ activity_name: 'Cart experiment' }],
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
