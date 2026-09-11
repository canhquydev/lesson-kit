import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { CreateStudentQuestionDto } from './dto/create-student-question.dto';
import {
  buildStudentQuestionPrompt,
  STUDENT_QUESTION_SYSTEM_PROMPT,
} from './prompts/student-question.prompt';
import { StudentQuestionSchema } from './schemas/student-question.schema';

describe('StudentQuestions Day 1 artifacts', () => {
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
    it('defines the student_questions collection and all persisted fields', () => {
      expect(StudentQuestionSchema.options.collection).toBe(
        'student_questions',
      );
      expect(StudentQuestionSchema.get('timestamps')).toBe(true);

      const expectedPaths = {
        lesson_kit_id: 'ObjectId',
        question_vi: 'String',
        question_en: 'String',
        suggested_answer_en: 'String',
        suggested_answer_vi: 'String',
        sort_order: 'Number',
        _id: 'ObjectId',
        createdAt: 'Date',
        updatedAt: 'Date',
      };

      Object.entries(expectedPaths).forEach(([path, instance]) => {
        expect(StudentQuestionSchema.path(path)?.instance).toBe(instance);
      });

      expect(StudentQuestionSchema.path('lesson_kit_id').options.ref).toBe(
        'LessonKit',
      );
    });

    it('defines a compound index for question order', () => {
      const hasOrderIndex = StudentQuestionSchema.indexes().some(
        ([fields]) => fields.lesson_kit_id === 1 && fields.sort_order === 1,
      );

      expect(hasOrderIndex).toBe(true);
    });
  });

  describe('DTO', () => {
    it('accepts a valid bilingual student question', async () => {
      const dto = Object.assign(new CreateStudentQuestionDto(), {
        lesson_kit_id: new Types.ObjectId().toHexString(),
        question_vi: 'Tai sao vat tang toc?',
        question_en: 'Why does the object accelerate?',
        suggested_answer_en: 'It accelerates because a net force acts on it.',
        suggested_answer_vi: 'Vat tang toc vi co hop luc tac dung len no.',
        sort_order: 1,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects missing bilingual content and invalid ordering', async () => {
      const dto = Object.assign(new CreateStudentQuestionDto(), {
        lesson_kit_id: 'invalid-id',
        question_vi: '',
        question_en: '',
        suggested_answer_en: '',
        suggested_answer_vi: '',
        sort_order: 0,
      });

      const invalidProperties = (await validate(dto)).map(
        (error) => error.property,
      );

      expect(invalidProperties).toEqual(
        expect.arrayContaining([
          'lesson_kit_id',
          'question_vi',
          'question_en',
          'suggested_answer_en',
          'suggested_answer_vi',
          'sort_order',
        ]),
      );
    });
  });

  describe('prompt', () => {
    it('includes lesson dependencies and the complete output contract', () => {
      const prompt = buildStudentQuestionPrompt(context, {
        teachingScripts: [
          { activity_name: 'Introduction', objective: 'Explain net force' },
        ],
        activities: [
          { activity_name: 'Force experiment', duration_minutes: 10 },
        ],
      });

      expect(STUDENT_QUESTION_SYSTEM_PROMPT).toContain('valid JSON object');
      expect(prompt).toContain("Newton's laws");
      expect(prompt).toContain('Explain net force');
      expect(prompt).toContain('Force experiment');

      [
        'question_vi',
        'question_en',
        'suggested_answer_en',
        'suggested_answer_vi',
        'sort_order',
      ].forEach((field) => expect(prompt).toContain(`"${field}"`));
    });

    it('adds validation errors to a retry prompt', () => {
      const prompt = buildStudentQuestionPrompt(
        context,
        { teachingScripts: [], activities: [] },
        ['Generate between 5 and 8 questions'],
      );

      expect(prompt).toContain('Generate between 5 and 8 questions');
    });
  });
});
