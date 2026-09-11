import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassroomExpressionDocument = ClassroomExpression & Document;


export enum ExpressionCategory {
  OPENING = 'opening',
  CONTENT_INTRO = 'content_intro',
  INSTRUCTION = 'instruction',
  QUESTIONING = 'questioning',
  COMPREHENSION_CHECK = 'comprehension_check',
  ENCOURAGEMENT = 'encouragement',
  TRANSITION = 'transition',
  CLOSING = 'closing',
}

@Schema({ collection: 'classroom_expressions', timestamps: true })
export class ClassroomExpression {
  /**
   * ID của Lesson Kit sở hữu mẫu câu này (Foreign Key → lesson_kits._id)
   */
  @Prop({ type: Types.ObjectId, ref: 'LessonKit', required: true, index: true })
  lesson_kit_id: Types.ObjectId;

  /**
   * Nhóm mẫu câu: opening · content_intro · instruction · questioning · comprehension_check · encouragement · transition · closing
   */
  @Prop({
    required: true,
    enum: Object.values(ExpressionCategory),
    trim: true,
  })
  category: string;

  /**
   * Câu tiếng Anh giáo viên nói trực tiếp trên lớp
   */
  @Prop({ required: true, trim: true })
  expression_en: string;

  /**
   * Nghĩa hoặc hỗ trợ tiếng Việt tương ứng
   */
  @Prop({ required: true, trim: true })
  translation_vi: string;

  /**
   * Tình huống sử dụng cụ thể trong bài học
   */
  @Prop({ required: true, trim: true })
  situation_note: string;

  /**
   * Thứ tự hiển thị
   */
  @Prop({ default: 0 })
  sort_order: number;
}

export const ClassroomExpressionSchema =
  SchemaFactory.createForClass(ClassroomExpression);

// Đánh dấu index kết hợp để query nhanh theo kit và sort order
ClassroomExpressionSchema.index({ lesson_kit_id: 1, sort_order: 1 });
