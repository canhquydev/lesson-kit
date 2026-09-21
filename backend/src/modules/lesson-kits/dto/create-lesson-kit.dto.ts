import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SupportLevel } from '../../../common/enums';

export class CreateLessonKitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  grade: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lesson_topic: string;

  @IsInt()
  @Min(1)
  @Max(1440)
  @IsNotEmpty()
  duration: number;

  @IsEnum(SupportLevel)
  @IsNotEmpty()
  support_level: SupportLevel;

  @IsMongoId()
  @IsNotEmpty()
  lesson_content_id: string;
}
