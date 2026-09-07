import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { SupportLevel } from '../../../common/enums';

export class CreateLessonKitDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsNotEmpty()
  lesson_topic: string;

  @IsNumber()
  @IsNotEmpty()
  duration: number;

  @IsEnum(SupportLevel)
  @IsNotEmpty()
  support_level: SupportLevel;

  @IsString()
  @IsNotEmpty()
  lesson_content_id: string;
}
