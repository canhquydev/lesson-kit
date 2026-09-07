import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportLevel } from '../common/enums';
import {
  LessonContent,
  LessonContentDocument,
} from '../modules/lesson-contents/schemas/lesson-content.schema';

// Mapping subject code → tên hiển thị
const SUBJECT_NAMES: Record<string, string> = {
  VAT_LI: 'Vật lí',
  HOA_HOC: 'Hóa học',
  SINH_HOC: 'Sinh học',
  TOAN: 'Toán',
};

@Injectable()
export class LessonConfigService {
  constructor(
    @InjectModel(LessonContent.name)
    private readonly lessonContentModel: Model<LessonContentDocument>,
  ) { }

  async getSubjects() {
    const subjects: string[] = await this.lessonContentModel
      .distinct('subject')
      .exec();
    return subjects.map((code) => ({
      code,
      name: SUBJECT_NAMES[code] || code,
    }));
  }

  getOptions() {
    return {
      durations: [35, 40, 45],
      support_levels: [
        {
          code: SupportLevel.B1,
          name: 'B1 - Intermediate',
          description:
            'Can understand the main points of clear standard input on familiar matters. Can produce simple connected text on familiar topics.',
        },
        {
          code: SupportLevel.B2,
          name: 'B2 - Upper Intermediate',
          description:
            'Can understand the main ideas of complex text. Can interact with a degree of fluency and spontaneity with native speakers.',
        },
        {
          code: SupportLevel.C1,
          name: 'C1 - Advanced',
          description:
            'Can understand a wide range of demanding, longer texts. Can express ideas fluently and spontaneously without much obvious searching for expressions.',
        },
      ],
    };
  }
}
