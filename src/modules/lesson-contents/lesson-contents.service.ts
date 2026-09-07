import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LessonContent,
  LessonContentDocument,
} from './schemas/lesson-content.schema';

@Injectable()
export class LessonContentsService {
  constructor(
    @InjectModel(LessonContent.name)
    private readonly lessonContentModel: Model<LessonContentDocument>,
  ) {}

  /**
   * Tìm danh sách bài học theo môn + lớp
   */
  async findBySubjectAndGrade(
    subject: string,
    grade: string,
  ): Promise<LessonContentDocument[]> {
    return this.lessonContentModel
      .find({ subject, grade })
      .select('_id title lesson grade')
      .sort({ lesson: 1 })
      .exec();
  }

  /**
   * Tìm 1 bài học theo ID
   */
  async findById(id: string): Promise<LessonContentDocument> {
    const lesson = await this.lessonContentModel.findById(id).exec();
    if (!lesson) {
      throw new NotFoundException(`Lesson content with ID "${id}" not found`);
    }
    return lesson;
  }
}
