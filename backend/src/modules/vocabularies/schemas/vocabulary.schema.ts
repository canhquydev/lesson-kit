import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VocabularyDocument = Vocabulary & Document;

@Schema({ collection: 'vocabularies', timestamps: true })
export class Vocabulary {
  /**
   * ID của Lesson Kit sở hữu từ vựng này (Foreign Key → lesson_kits._id)
   */
  @Prop({ type: Types.ObjectId, ref: 'LessonKit', required: true, index: true })
  lesson_kit_id: Types.ObjectId;

  /**
   * Từ vựng tiếng Anh chuyên ngành
   */
  @Prop({ required: true, trim: true })
  word: string;

  /**
   * Phiên âm quốc tế IPA (VD: /ˈfɪzɪks/)
   */
  @Prop({ required: true, trim: true })
  phonetic: string;

  /**
   * Nghĩa tiếng Việt theo ngữ cảnh bài học (không dùng nghĩa phổ thông ngoài ngữ cảnh)
   */
  @Prop({ required: true, trim: true })
  meaning_vi: string;

  /**
   * Từ loại (noun, verb, adj, adverb, phrase...)
   */
  @Prop({ required: true, trim: true })
  part_of_speech: string;

  /**
   * Ví dụ thực tế lấy từ hoặc liên quan chặt chẽ đến nội dung bài học
   */
  @Prop({ required: true, trim: true })
  example_sentence: string;

  /**
   * Ghi chú ngữ cảnh sử dụng cụ thể
   */
  @Prop({ default: '', trim: true })
  context_note: string;

  /**
   * Thứ tự sắp xếp hiển thị
   */
  @Prop({ default: 0 })
  sort_order: number;
}

export const VocabularySchema = SchemaFactory.createForClass(Vocabulary);

// Đánh dấu index kết hợp để query nhanh theo kit và sort order
VocabularySchema.index({ lesson_kit_id: 1, sort_order: 1 });
