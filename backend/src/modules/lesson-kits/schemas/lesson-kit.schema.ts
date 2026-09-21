import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LessonKitStatus, SupportLevel } from '../../../common/enums';

export type LessonKitDocument = HydratedDocument<LessonKit>;

@Schema({ collection: 'lesson_kits', timestamps: true })
export class LessonKit {
  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true, trim: true })
  grade: string;

  @Prop({ required: true, trim: true })
  lesson_topic: string;

  @Prop({ required: true })
  duration: number;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(SupportLevel),
  })
  support_level: SupportLevel;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(LessonKitStatus),
    default: LessonKitStatus.GENERATING,
    index: true,
  })
  status: LessonKitStatus;

  @Prop()
  ai_model_version?: string;

  @Prop()
  generation_time_ms?: number;

  @Prop()
  request_id?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'LessonContent',
    required: true,
    index: true,
  })
  lesson_content_id: Types.ObjectId;

  @Prop()
  current_step?: string;

  @Prop({ type: [String], default: [] })
  stale_components: string[];
}

export const LessonKitSchema = SchemaFactory.createForClass(LessonKit);
