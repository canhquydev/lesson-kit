import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AssessmentQuestionType } from '../constants';
import {
  hasValidAssessmentCorrectAnswer,
  hasValidAssessmentOptions,
} from '../validators';

export type AssessmentDocument = HydratedDocument<Assessment>;

@Schema({ collection: 'assessments', timestamps: true })
export class Assessment {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'LessonKit',
    required: true,
    index: true,
  })
  lesson_kit_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  question_text: string;

  @Prop({
    type: String,
    required: true,
    enum: AssessmentQuestionType,
  })
  question_type: AssessmentQuestionType;

  @Prop({
    type: [String],
    default: [],
    validate: {
      validator(this: Assessment, options: unknown): boolean {
        return hasValidAssessmentOptions(this.question_type, options);
      },
      message: 'Invalid options for question_type.',
    },
  })
  options: string[];

  @Prop({
    required: true,
    trim: true,
    validate: {
      validator(this: Assessment, correctAnswer: unknown): boolean {
        return hasValidAssessmentCorrectAnswer(
          this.question_type,
          correctAnswer,
          this.options,
        );
      },
      message: 'Invalid correct_answer for question_type and options.',
    },
  })
  correct_answer: string;

  @Prop({ required: true, trim: true })
  explanation: string;

  @Prop({ required: true, min: 1 })
  sort_order: number;

  createdAt: Date;

  updatedAt: Date;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);

AssessmentSchema.index({ lesson_kit_id: 1, sort_order: 1 });
