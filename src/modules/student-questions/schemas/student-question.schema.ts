import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type StudentQuestionDocument = HydratedDocument<StudentQuestion>;

@Schema({ collection: 'student_questions', timestamps: true })
export class StudentQuestion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'LessonKit',
    required: true,
    index: true,
  })
  lesson_kit_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  question_vi: string;

  @Prop({ required: true, trim: true })
  question_en: string;

  @Prop({ required: true, trim: true })
  suggested_answer_en: string;

  @Prop({ required: true, trim: true })
  suggested_answer_vi: string;

  @Prop({ required: true, min: 1 })
  sort_order: number;

  createdAt: Date;

  updatedAt: Date;
}

export const StudentQuestionSchema =
  SchemaFactory.createForClass(StudentQuestion);

StudentQuestionSchema.index({ lesson_kit_id: 1, sort_order: 1 });
