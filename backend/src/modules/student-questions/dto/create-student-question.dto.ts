import { IsInt, IsMongoId, IsNotEmpty, IsString, Min } from 'class-validator';

export class StudentQuestionItemDto {
  @IsString()
  @IsNotEmpty()
  question_vi: string;

  @IsString()
  @IsNotEmpty()
  question_en: string;

  @IsString()
  @IsNotEmpty()
  suggested_answer_en: string;

  @IsString()
  @IsNotEmpty()
  suggested_answer_vi: string;

  @IsInt()
  @Min(1)
  sort_order: number;
}

export class CreateStudentQuestionDto extends StudentQuestionItemDto {
  @IsMongoId()
  lesson_kit_id: string;
}
