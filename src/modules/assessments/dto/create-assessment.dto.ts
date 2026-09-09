import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { AssessmentQuestionType } from '../constants';

export class AssessmentItemDto {
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @IsEnum(AssessmentQuestionType)
  question_type: AssessmentQuestionType;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsString()
  @IsNotEmpty()
  correct_answer: string;

  @IsString()
  @IsNotEmpty()
  explanation: string;

  @IsInt()
  @Min(1)
  sort_order: number;
}

export class CreateAssessmentDto extends AssessmentItemDto {
  @IsMongoId()
  lesson_kit_id: string;
}
