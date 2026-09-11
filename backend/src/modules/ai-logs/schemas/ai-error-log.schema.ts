import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AiErrorLogDocument = HydratedDocument<AiErrorLog>;

@Schema({ collection: 'ai_error_logs', timestamps: true })
export class AiErrorLog {
  @Prop({ type: Types.ObjectId, ref: 'LessonKit', index: true })
  kit_id?: Types.ObjectId;

  @Prop({ required: true, index: true })
  component: string;

  @Prop({ required: true })
  attempt: number;

  @Prop({ required: true, index: true })
  error_type: string;

  @Prop({ type: [String], default: [] })
  error_messages: string[];

  @Prop()
  raw_output?: string;

  @Prop()
  ai_model?: string;

  @Prop({
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60, // TTL: tự động xóa sau 30 ngày
  })
  createdAt: Date;
}

export const AiErrorLogSchema = SchemaFactory.createForClass(AiErrorLog);
