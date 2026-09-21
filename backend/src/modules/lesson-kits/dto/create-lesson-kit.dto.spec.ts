import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLessonKitDto } from './create-lesson-kit.dto';
import { SupportLevel } from '../../../common/enums';

describe('CreateLessonKitDto', () => {
  const validPayload = {
    subject: 'Toán',
    grade: '10',
    lesson_topic: 'Hàm số bậc hai',
    duration: 45,
    support_level: SupportLevel.B1,
    lesson_content_id: '507f1f77bcf86cd799439011',
  };

  it('should validate successfully with valid payload', async () => {
    const dto = plainToInstance(CreateLessonKitDto, validPayload);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if lesson_content_id is not a valid MongoId', async () => {
    const dto = plainToInstance(CreateLessonKitDto, {
      ...validPayload,
      lesson_content_id: 'invalid-mongo-id',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('lesson_content_id');
    expect(errors[0].constraints?.isMongoId).toBeDefined();
  });

  it('should fail if duration is less than 1', async () => {
    const dto = plainToInstance(CreateLessonKitDto, {
      ...validPayload,
      duration: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('duration');
    expect(errors[0].constraints?.min).toBeDefined();
  });
});
