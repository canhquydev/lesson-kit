import { AssessmentQuestionType } from '../constants';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hasValidAssessmentOptions(
  questionType: AssessmentQuestionType,
  options: unknown,
): options is string[] {
  if (!Array.isArray(options) || !options.every(isNonEmptyString)) {
    return false;
  }

  switch (questionType) {
    case AssessmentQuestionType.MULTIPLE_CHOICE: {
      const normalizedOptions = options.map((option) =>
        option.trim().toLocaleLowerCase(),
      );
      return options.length === 4 && new Set(normalizedOptions).size === 4;
    }
    case AssessmentQuestionType.TRUE_FALSE:
      return (
        options.length === 2 && options[0] === 'True' && options[1] === 'False'
      );
    case AssessmentQuestionType.MATCHING:
    case AssessmentQuestionType.SHORT_ANSWER:
      return options.length === 0;
    default:
      return false;
  }
}

export function hasValidAssessmentCorrectAnswer(
  questionType: AssessmentQuestionType,
  correctAnswer: unknown,
  options: unknown,
): correctAnswer is string {
  if (!isNonEmptyString(correctAnswer)) {
    return false;
  }

  switch (questionType) {
    case AssessmentQuestionType.MULTIPLE_CHOICE:
      return (
        hasValidAssessmentOptions(questionType, options) &&
        options.includes(correctAnswer)
      );
    case AssessmentQuestionType.TRUE_FALSE:
      return correctAnswer === 'True' || correctAnswer === 'False';
    case AssessmentQuestionType.MATCHING:
    case AssessmentQuestionType.SHORT_ANSWER:
      return true;
    default:
      return false;
  }
}
