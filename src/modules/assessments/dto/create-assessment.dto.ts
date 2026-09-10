import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AssessmentQuestionType } from '../constants';
import {
  hasValidAssessmentCorrectAnswer,
  hasValidAssessmentOptions,
} from '../validators';

@ValidatorConstraint({ name: 'assessmentOptions', async: false })
class AssessmentOptionsConstraint implements ValidatorConstraintInterface {
  validate(options: unknown, args: ValidationArguments): boolean {
    const assessment = args.object as AssessmentItemDto;
    return hasValidAssessmentOptions(assessment.question_type, options);
  }

  defaultMessage(): string {
    return 'options must contain 4 unique choices for multiple_choice, exactly ["True", "False"] for true_false, and be empty for matching or short_answer';
  }
}

@ValidatorConstraint({ name: 'assessmentCorrectAnswer', async: false })
class AssessmentCorrectAnswerConstraint implements ValidatorConstraintInterface {
  validate(correctAnswer: unknown, args: ValidationArguments): boolean {
    const assessment = args.object as AssessmentItemDto;
    return hasValidAssessmentCorrectAnswer(
      assessment.question_type,
      correctAnswer,
      assessment.options,
    );
  }

  defaultMessage(): string {
    return 'correct_answer must match one option for multiple_choice and must be "True" or "False" for true_false';
  }
}

export class AssessmentItemDto {
  @IsString()
  @IsNotEmpty()
  question_text: string;

  @IsEnum(AssessmentQuestionType)
  question_type: AssessmentQuestionType;

  @IsArray()
  @IsString({ each: true })
  @Validate(AssessmentOptionsConstraint)
  options: string[];

  @IsString()
  @IsNotEmpty()
  @Validate(AssessmentCorrectAnswerConstraint)
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
