import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityDocument = Activity & Document;

/**
 * 10 loại hình hoạt động tương tác được quy định trong thiết kế kỹ thuật (Phase 1)
 */
export enum ActivityType {
  THINK_PAIR_SHARE = 'Think-Pair-Share',
  MATCHING = 'Matching',
  ROLE_PLAY = 'Role-play',
  QUIZ = 'Quiz',
  DISCUSSION = 'Discussion',
  HOI_DAP = 'Hỏi đáp',
  PROBLEM_SOLVING = 'Problem solving',
  GAME = 'Game',
  PRESENTATION = 'Presentation',
  PRACTICE_TASK = 'Practice task',
}

/**
 * Các hình thức tổ chức nhóm học sinh
 */
export enum GroupType {
  INDIVIDUAL = 'individual',
  PAIR = 'pair',
  GROUP = 'group',
  WHOLE_CLASS = 'whole_class',
}

/**
 * Schema quản lý các Hoạt động tương tác trong giờ học (Phase 1).
 * Tuân thủ đúng đặc tả tại: Lesson Kit Generator - Database Schema (Notion).
 * Collection: activities
 */
@Schema({ collection: 'activities', timestamps: true })
export class Activity {
  /**
   * ID của Lesson Kit sở hữu hoạt động này (Foreign Key → lesson_kits._id)
   */
  @Prop({ type: Types.ObjectId, ref: 'LessonKit', required: true, index: true })
  lesson_kit_id: Types.ObjectId;

  /**
   * Tên của hoạt động (VD: "Velocity vs Speed", "Matching Physics Terms")
   */
  @Prop({ required: true, trim: true })
  activity_name: string;

  /**
   * Hình thức hoạt động: Think-Pair-Share · Matching · Role-play · Quiz · Discussion · Hỏi đáp · Problem solving · Game · Presentation · Practice task
   */
  @Prop({
    required: true,
    enum: Object.values(ActivityType),
    trim: true,
  })
  activity_type: string;

  /**
   * Mô tả ngắn gọn về hoạt động
   */
  @Prop({ required: true, trim: true })
  description: string;

  /**
   * Mục tiêu sư phạm của hoạt động
   */
  @Prop({ required: true, trim: true })
  objective: string;

  /**
   * Thời lượng thực hiện (tính bằng phút)
   */
  @Prop({ required: true, min: 1 })
  duration_minutes: number;

  /**
   * Hình thức nhóm: individual / pair / group / whole_class
   */
  @Prop({
    required: true,
    enum: Object.values(GroupType),
    trim: true,
  })
  group_type: string;

  /**
   * Hướng dẫn chi tiết các bước tổ chức dành cho giáo viên
   */
  @Prop({ required: true, trim: true })
  instructions: string;

  /**
   * Câu lệnh hoặc lời dẫn bằng tiếng Anh GV sử dụng khi tổ chức hoạt động
   */
  @Prop({ required: true, trim: true })
  english_instructions: string;

  /**
   * Nhiệm vụ cụ thể của học sinh cần hoàn thành
   */
  @Prop({ required: true, trim: true })
  student_task: string;

  /**
   * Kết quả học tập dự kiến học sinh đạt được sau hoạt động
   */
  @Prop({ required: true, trim: true })
  expected_outcome: string;

  /**
   * Thứ tự hiển thị
   */
  @Prop({ default: 0 })
  sort_order: number;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Đánh dấu index kết hợp để query nhanh theo kit và sort order
ActivitySchema.index({ lesson_kit_id: 1, sort_order: 1 });
