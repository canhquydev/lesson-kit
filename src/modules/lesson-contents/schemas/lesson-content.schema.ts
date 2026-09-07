import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LessonContentDocument = HydratedDocument<LessonContent>;

@Schema({ collection: 'lesson_contents', timestamps: true })
export class LessonContent {
  @Prop({ required: true })
  grade: string;

  @Prop({ required: true })
  lesson: string;

  @Prop({ required: true, index: true })
  subject: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;
}

export const LessonContentSchema = SchemaFactory.createForClass(LessonContent);

LessonContentSchema.index({ subject: 1, grade: 1 });
