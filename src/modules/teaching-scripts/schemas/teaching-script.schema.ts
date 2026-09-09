import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type TeachingScriptDocument = HydratedDocument<TeachingScript>;

@Schema({ collection: 'teaching_scripts', timestamps: true })
export class TeachingScript {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'LessonKit',
    required: true,
    index: true,
  })
  lesson_kit_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  activity_name: string;

  @Prop({ required: true, min: 1 })
  duration_minutes: number;

  @Prop({ required: true, trim: true })
  objective: string;

  @Prop({ required: true, trim: true })
  teacher_speech_en: string;

  @Prop({ required: true, trim: true })
  teacher_speech_vi: string;

  @Prop({ required: true, trim: true })
  teacher_action: string;

  @Prop({ required: true, trim: true })
  expected_student_response: string;

  @Prop({ default: '', trim: true })
  notes: string;

  @Prop({ required: true, min: 1 })
  step_order: number;

  createdAt: Date;

  updatedAt: Date;
}

export const TeachingScriptSchema =
  SchemaFactory.createForClass(TeachingScript);

TeachingScriptSchema.index({ lesson_kit_id: 1, step_order: 1 });
