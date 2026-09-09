import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AssessmentQuestionType } from '../constants';

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

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ required: true, trim: true })
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
