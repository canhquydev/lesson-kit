import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClassroomExpression,
  ClassroomExpressionDocument,
  ExpressionCategory,
} from './schemas/classroom-expression.schema';
import { AiService } from '../ai/ai.service';
import {
  ComponentGenerator,
  ComponentDependencies,
  ValidationResult,
  validateAndRetry,
} from '../../common/validators';
import { GenerationContext } from '../../common/interfaces';

@Injectable()
export class ClassroomExpressionsService
  implements ComponentGenerator<ClassroomExpressionDocument>
{
  private readonly logger = new Logger(ClassroomExpressionsService.name);

  constructor(
    @InjectModel(ClassroomExpression.name)
    private readonly expressionModel: Model<ClassroomExpressionDocument>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Sinh danh sách mẫu câu trên lớp cho giáo viên từ ngữ cảnh bài học
   */
  async generate(
    context: GenerationContext,
    dependencies?: ComponentDependencies,
  ): Promise<ClassroomExpressionDocument[]> {
    this.logger.log(
      `Generating classroom expressions for lesson: "${context.title}" (${context.subject} Grade ${context.grade}, Support: ${context.supportLevel})`,
    );

    const rawExpressions = await validateAndRetry<any>(
      async (previousErrors?: string[]) => {
        const prompt = this.getPrompt(context, dependencies, previousErrors);
        const response = await this.aiService.generateJson<{
          expressions: any[];
        }>([
          {
            role: 'system',
            content:
              'You are an expert bilingual education trainer specializing in English for Teaching / Classroom English. ' +
              'Always respond strictly with a valid JSON object matching the requested schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);

        return response.expressions || [];
      },
      (data: any[]) => this.validate(data),
      3,
    );

    return rawExpressions.map((item, index) => ({
      ...item,
      sort_order: item.sort_order ?? index + 1,
    })) as ClassroomExpressionDocument[];
  }

  /**
   * Kiểm tra tính hợp lệ của danh sách mẫu câu giao tiếp do AI sinh ra:
   * - Category phải thuộc 8 nhóm quy chuẩn: opening, content_intro, instruction, questioning, comprehension_check, encouragement, transition, closing.
   * - Có thể bỏ qua nhóm không phù hợp, nhưng mỗi nhóm đã chọn phải có từ 3 đến 5 câu.
   * - Bắt buộc đầy đủ: category, expression_en, translation_vi, situation_note.
   */
  validate(data: any[]): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          'Output must be an array of expression items under "expressions" key.',
        ],
      };
    }

    if (data.length === 0) {
      return {
        isValid: false,
        errors: ['Expressions array cannot be empty.'],
      };
    }

    const validCategories = new Set(Object.values(ExpressionCategory));
    const categoryCounts: Record<string, number> = {};

    data.forEach((item, index) => {
      const prefix = `Item [${index + 1}]`;

      if (!item?.category || !validCategories.has(item.category)) {
        errors.push(
          `${prefix}: Invalid or missing category "${item?.category}". Must be one of: ${Array.from(validCategories).join(', ')}.`,
        );
      } else {
        categoryCounts[item.category] =
          (categoryCounts[item.category] || 0) + 1;
      }

      if (
        !item?.expression_en ||
        typeof item.expression_en !== 'string' ||
        !item.expression_en.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "expression_en".`);
      }

      if (
        !item?.translation_vi ||
        typeof item.translation_vi !== 'string' ||
        !item.translation_vi.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "translation_vi".`);
      }

      if (
        !item?.situation_note ||
        typeof item.situation_note !== 'string' ||
        !item.situation_note.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "situation_note".`);
      }
    });

    // Kiểm tra số câu trong từng category (quy chuẩn: 3–5 câu/nhóm)
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count < 3 || count > 5) {
        errors.push(
          `Category "${cat}" has ${count} expressions. Each included category must contain between 3 and 5 expressions.`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Tạo prompt chi tiết hướng dẫn AI sinh mẫu câu
   */
  getPrompt(
    context: GenerationContext,
    dependencies?: ComponentDependencies,
    retryErrors?: string[],
  ): string;
  getPrompt(context: GenerationContext, retryErrors?: string[]): string;
  getPrompt(
    context: GenerationContext,
    dependenciesOrErrors?: ComponentDependencies | string[],
    retryErrors?: string[],
  ): string {
    const retryErrList = Array.isArray(dependenciesOrErrors)
      ? dependenciesOrErrors
      : retryErrors;

    let prompt = `Bạn là chuyên gia sư phạm song ngữ và phương pháp giảng dạy bằng tiếng Anh (EMI/CLIL).
Hãy sinh danh sách MẪU CÂU TRÊN LỚP (Classroom Expressions - Phase 1 Component) để giáo viên có thể nói trực tiếp khi giảng dạy bài học sau:

--- THÔNG TIN BÀI HỌC ---
- Môn học: ${context.subject}
- Khối lớp: ${context.grade}
- Tên bài học: ${context.title}
- Mức độ hỗ trợ tiếng Anh: ${context.supportLevel}
- Thời lượng tiết học: ${context.duration} phút
- Nội dung bài học:
"""
${context.content}
"""

--- 8 NHÓM TÌNH HUỐNG QUY CHUẨN ---
1. opening: Mở đầu / Khởi động tiết học
2. content_intro: Giới thiệu nội dung, khái niệm mới
3. instruction: Hướng dẫn nhiệm vụ học tập
4. questioning: Đặt câu hỏi / Gợi mở tư duy
5. comprehension_check: Kiểm tra mức độ hiểu của học sinh
6. encouragement: Khuyến khích / Khen ngợi / Phản hồi tích cực
7. transition: Chuyển tiếp giữa các phần hoặc hoạt động
8. closing: Tổng kết / Đánh giá / Kết thúc tiết học

--- YÊU CẦU ĐẦU RA (BẮT BUỘC) ---
1. Phân nhóm: Chọn các nhóm tình huống phù hợp với bài học (có thể bỏ bớt nhóm nếu không phù hợp, nhưng các nhóm then chốt như opening, content_intro, instruction, questioning, closing nên có).
2. Số lượng câu: Đối với MỖI nhóm được chọn, PHẢI sinh từ 3 đến 5 câu tiếng Anh (3–5 câu/nhóm).
3. Tính tự nhiên: Câu tiếng Anh phải tự nhiên, mang tính khẩu ngữ lớp học thực tế để giáo viên có thể nói trực tiếp (VD: "Good morning class! Today we are going to explore...").
4. Bản dịch tiếng Việt (translation_vi): Cung cấp nghĩa tiếng Việt chuẩn xác, hỗ trợ giáo viên hiểu rõ và tự tin sử dụng.
5. Tình huống (situation_note): Nêu cụ thể khi nào giáo viên nên nói câu này trong tiến trình tiết học.
6. Mức hỗ trợ (support_level): Điều chỉnh độ phức tạp từ vựng và ngữ pháp câu phù hợp với cấp độ "${context.supportLevel}".

--- ĐỊNH DẠNG JSON YÊU CẦU ---
Trả về đối tượng JSON duy nhất có cấu trúc:
{
  "expressions": [
    {
      "category": "opening | content_intro | instruction | questioning | comprehension_check | encouragement | transition | closing",
      "expression_en": "câu tiếng Anh giáo viên nói trực tiếp",
      "translation_vi": "nghĩa / hỗ trợ tiếng Việt",
      "situation_note": "tình huống cụ thể trong bài học"
    }
  ]
}
`;

    if (retryErrList && retryErrList.length > 0) {
      prompt += `
⚠️ CHÚ Ý: Lần sinh trước bị lỗi validation. Bạn BẮT BUỘC phải khắc phục triệt để các lỗi sau:
${retryErrList.map((err, i) => `${i + 1}. ${err}`).join('\n')}
`;
    }

    return prompt;
  }

  /**
   * Tìm danh sách mẫu câu theo ID của Lesson Kit
   */
  async findByKitId(kitId: string): Promise<ClassroomExpressionDocument[]> {
    return this.expressionModel
      .find({ lesson_kit_id: new Types.ObjectId(kitId) })
      .sort({ sort_order: 1 })
      .exec();
  }

  /**
   * Xoá toàn bộ mẫu câu của Lesson Kit
   */
  async deleteByKitId(kitId: string): Promise<void> {
    await this.expressionModel
      .deleteMany({ lesson_kit_id: new Types.ObjectId(kitId) })
      .exec();
    this.logger.log(`Deleted classroom expressions for kit: ${kitId}`);
  }

  /**
   * Lưu hàng loạt mẫu câu vào DB và gán lesson_kit_id
   */
  async saveBulk(
    kitId: string,
    items: any[],
  ): Promise<ClassroomExpressionDocument[]> {
    const kitObjectId = new Types.ObjectId(kitId);
    const docs = items.map((item, index) => ({
      ...item,
      lesson_kit_id: kitObjectId,
      sort_order: item.sort_order ?? index + 1,
    }));

    const inserted = await this.expressionModel.insertMany(docs);
    this.logger.log(
      `Saved ${inserted.length} classroom expressions for kit: ${kitId}`,
    );
    return inserted as unknown as ClassroomExpressionDocument[];
  }
}
