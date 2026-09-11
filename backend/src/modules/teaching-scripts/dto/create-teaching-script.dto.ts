import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class TeachingScriptItemDto {
  @IsString()
  @IsNotEmpty()
  activity_name: string;

  @IsInt()
  @Min(1)
  duration_minutes: number;

  @IsString()
  @IsNotEmpty()
  objective: string;

  @IsString()
  @IsNotEmpty()
  teacher_speech_en: string;

  @IsString()
  @IsNotEmpty()
  teacher_speech_vi: string;

  @IsString()
  @IsNotEmpty()
  teacher_action: string;

  @IsString()
  @IsNotEmpty()
  expected_student_response: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsInt()
  @Min(1)
  step_order: number;
}

export class CreateTeachingScriptDto extends TeachingScriptItemDto {
  @IsMongoId()
  lesson_kit_id: string;
}
