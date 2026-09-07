import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LessonKitStatus } from '../../../common/enums';

export type LessonKitDocument = HydratedDocument<LessonKit>;

@Schema({ collection: 'lesson_kits', timestamps: true })
export class LessonKit {
  /** Môn học */
  @Prop({ required: true })
  subject: string;

  /** Khối lớp */
  @Prop({ required: true })
  grade: string;

  /** Tên bài học đã chọn */
  @Prop({ required: true })
  lesson_topic: string;

  /** Thời lượng tiết học: 35, 40, 45 phút */
  @Prop({ required: true })
  duration: number;

  /** Mức hỗ trợ tiếng Anh */
  @Prop({ required: true })
  support_level: string;

  /** Trạng thái: draft | generating | completed | failed */
  @Prop({
    required: true,
    enum: LessonKitStatus,
    default: LessonKitStatus.GENERATING,
    index: true,
  })
  status: LessonKitStatus;

  /** Model AI đã sử dụng */
  @Prop()
  ai_model_version: string;

  /** Thời gian sinh toàn bộ kit (ms) */
  @Prop()
  generation_time_ms: number;

  /** ID request debug */
  @Prop()
  request_id: string;

  /** FK → lesson_contents._id */
  @Prop({ type: Types.ObjectId, ref: 'LessonContent', required: true, index: true })
  lesson_content_id: Types.ObjectId;

  /** Bước đang xử lý */
  @Prop()
  current_step: string;
}

export const LessonKitSchema = SchemaFactory.createForClass(LessonKit);
