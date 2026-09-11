import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { GenerationContext } from '../../common/interfaces';
import { CreateTeachingScriptDto } from './dto/create-teaching-script.dto';
import {
  buildTeachingScriptPrompt,
  TEACHING_SCRIPT_SYSTEM_PROMPT,
} from './prompts/teaching-script.prompt';
import { TeachingScriptSchema } from './schemas/teaching-script.schema';

describe('TeachingScripts Day 1 artifacts', () => {
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
    it('defines the teaching_scripts collection and all persisted fields', () => {
      expect(TeachingScriptSchema.options.collection).toBe('teaching_scripts');
      expect(TeachingScriptSchema.get('timestamps')).toBe(true);

      const expectedPaths = {
        lesson_kit_id: 'ObjectId',
        activity_name: 'String',
        duration_minutes: 'Number',
        objective: 'String',
        teacher_speech_en: 'String',
        teacher_speech_vi: 'String',
        teacher_action: 'String',
        expected_student_response: 'String',
        notes: 'String',
        step_order: 'Number',
        _id: 'ObjectId',
        createdAt: 'Date',
        updatedAt: 'Date',
      };

      Object.entries(expectedPaths).forEach(([path, instance]) => {
        expect(TeachingScriptSchema.path(path)?.instance).toBe(instance);
      });

      expect(TeachingScriptSchema.path('lesson_kit_id').options.ref).toBe(
        'LessonKit',
      );
      expect(TeachingScriptSchema.path('notes').options.default).toBe('');
    });

    it('defines a compound index for lesson order', () => {
      const hasOrderIndex = TeachingScriptSchema.indexes().some(
        ([fields]) => fields.lesson_kit_id === 1 && fields.step_order === 1,
      );

      expect(hasOrderIndex).toBe(true);
    });
  });

  describe('DTO', () => {
    it('accepts a valid teaching script', async () => {
      const dto = Object.assign(new CreateTeachingScriptDto(), {
        lesson_kit_id: new Types.ObjectId().toHexString(),
        activity_name: 'Pair discussion',
        duration_minutes: 10,
        objective: "Apply Newton's second law.",
        teacher_speech_en: 'Discuss the force acting on the object.',
        teacher_speech_vi: 'Thao luan ve luc tac dung len vat.',
        teacher_action: 'Display the force diagram.',
        expected_student_response: 'Students identify the net force.',
        step_order: 1,
      });

      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('rejects invalid identifiers, empty text, and non-positive ordering', async () => {
      const dto = Object.assign(new CreateTeachingScriptDto(), {
        lesson_kit_id: 'invalid-id',
        activity_name: '',
        duration_minutes: 0,
        objective: '',
        teacher_speech_en: '',
        teacher_speech_vi: '',
        teacher_action: '',
        expected_student_response: '',
        notes: 123,
        step_order: 0,
      });

      const invalidProperties = (await validate(dto)).map(
        (error) => error.property,
      );

      expect(invalidProperties).toEqual(
        expect.arrayContaining([
          'lesson_kit_id',
          'activity_name',
          'duration_minutes',
          'objective',
          'teacher_speech_en',
          'teacher_speech_vi',
          'teacher_action',
          'expected_student_response',
          'notes',
          'step_order',
        ]),
      );
    });
  });

  describe('prompt', () => {
    it('includes the context, all Phase 1 dependencies, and output contract', () => {
      const prompt = buildTeachingScriptPrompt(context, {
        vocabularies: [{ word: 'force', meaning_vi: 'lực' }],
        expressions: [
          { expression_en: 'Raise your hand', translation_vi: 'Giơ tay lên.' },
        ],
        activities: [
          { activity_name: 'Pair discussion', duration_minutes: 45 },
        ],
      });

      expect(TEACHING_SCRIPT_SYSTEM_PROMPT).toContain('valid JSON object');
      expect(prompt).toContain("Newton's laws");
      expect(prompt).toContain('force');
      expect(prompt).toContain('Raise your hand');
      expect(prompt).toContain('Pair discussion');
      expect(prompt).toContain('45');

      [
        'activity_name',
        'duration_minutes',
        'objective',
        'teacher_speech_en',
        'teacher_speech_vi',
        'teacher_action',
        'expected_student_response',
        'notes',
        'step_order',
      ].forEach((field) => expect(prompt).toContain(`"${field}"`));
    });

    it('adds validation errors to a retry prompt', () => {
      const prompt = buildTeachingScriptPrompt(
        context,
        { vocabularies: [], expressions: [], activities: [] },
        ['Total duration must equal 45 minutes'],
      );

      expect(prompt).toContain('Total duration must equal 45 minutes');
    });
  });
});
