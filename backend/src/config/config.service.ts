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
          code: SupportLevel.A1,
          name: 'A1 - Mới bắt đầu',
          description:
            'Có thể hiểu và sử dụng các cấu trúc quen thuộc hàng ngày và các từ ngữ cơ bản.',
        },
        {
          code: SupportLevel.A2,
          name: 'A2 - Sơ cấp',
          description:
            'Có thể hiểu các câu và cấu trúc thường dùng liên quan đến các nhu cầu giao tiếp cơ bản.',
        },
        {
          code: SupportLevel.B1,
          name: 'B1 - Trung cấp',
          description:
            'Có thể hiểu các ý chính của các chủ đề quen thuộc thường gặp trong công việc, học tập.',
        },
        {
          code: SupportLevel.B2,
          name: 'B2 - Trung cấp trên',
          description:
            'Có thể hiểu các ý chính của văn bản phức tạp về các chủ đề cụ thể và trừu tượng.',
        },
        {
          code: SupportLevel.C1,
          name: 'C1 - Cao cấp',
          description:
            'Có thể hiểu các văn bản dài, phức tạp và nhận biết được các hàm ý ẩn dụ.',
        },
        {
          code: SupportLevel.C2,
          name: 'C2 - Thành thạo',
          description:
            'Có thể hiểu một cách dễ dàng hầu như mọi thông tin nghe hoặc đọc được.',
        },
      ],
    };
  }
}
