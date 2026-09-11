import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Activity,
  ActivityDocument,
  ActivityType,
  GroupType,
} from './schemas/activity.schema';
import { AiService } from '../ai/ai.service';
import { AiLogsService } from '../ai-logs/ai-logs.service';
import {
  ComponentGenerator,
  ComponentDependencies,
  ValidationResult,
  validateAndRetry,
} from '../../common/validators';
import { GenerationContext } from '../../common/interfaces';

/**
 * Service quản lý và sinh Hoạt động tương tác (Activities - Phase 1)
 * Triển khai ComponentGenerator theo chuẩn kiến trúc Lesson Kit Generator
 */
@Injectable()
export class ActivitiesService
  implements ComponentGenerator<ActivityDocument>
{
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
    private readonly aiService: AiService,
    private readonly aiLogsService: AiLogsService,
  ) {}

  /**
   * Sinh danh sách hoạt động tương tác từ ngữ cảnh bài học
   */
  async generate(
    context: GenerationContext,
    dependencies?: ComponentDependencies,
  ): Promise<ActivityDocument[]> {
    this.logger.log(
      `Generating activities for lesson: "${context.title}" (${context.subject} Grade ${context.grade}, Duration: ${context.duration}m)`,
    );

    const rawActivities = await validateAndRetry<any>(
      async (previousErrors?: string[]) => {
        const prompt = this.getPrompt(context, dependencies, previousErrors);
        const response = await this.aiService.generateJson<{
          activities: any[];
        }>([
          {
            role: 'system',
            content:
              'You are an expert pedagogical designer specializing in active learning, interactive classroom activities, and bilingual STEM/humanities education. ' +
              'Always respond strictly with a valid JSON object matching the requested schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);

        return response.activities || [];
      },
      (data: any[]) => this.validate(data),
      3,
      (attempt, errors, rawData) => {
        this.aiLogsService.logError({
          kitId: context.lessonContentId,
          component: 'activities',
          attempt,
          errorType: 'VALIDATION_FAILED',
          errorMessages: errors,
          rawOutput: JSON.stringify(rawData).substring(0, 5000),
        });
      },
    );

    return rawActivities.map((item, index) => ({
      ...item,
      sort_order: item.sort_order ?? index + 1,
    })) as ActivityDocument[];
  }

  /**
   * Kiểm tra tính hợp lệ của danh sách hoạt động do AI sinh ra
   * Tiêu chuẩn theo Báo cáo Thiết kế kỹ thuật & Task Assignment:
   * - Phải có đúng 2 đến 3 hoạt động.
   * - activity_type phải thuộc 10 hình thức cho phép.
   * - group_type phải thuộc 4 kiểu: individual, pair, group, whole_class.
   * - duration_minutes phải > 0.
   * - Bắt buộc đầy đủ các trường: activity_name, description, objective, instructions, english_instructions, student_task, expected_outcome.
   */
  validate(data: any[]): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          'Output must be an array of activity items under "activities" key.',
        ],
      };
    }

    if (data.length < 2 || data.length > 3) {
      errors.push(
        `Activity count must be between 2 and 3 activities. Current count: ${data.length}.`,
      );
    }

    const validActivityTypes = new Set(Object.values(ActivityType));
    const validGroupTypes = new Set(Object.values(GroupType));

    data.forEach((item, index) => {
      const prefix = `Item [${index + 1}] (${item?.activity_name || 'unnamed'})`;

      if (
        !item?.activity_name ||
        typeof item.activity_name !== 'string' ||
        !item.activity_name.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "activity_name".`);
      }

      if (!item?.activity_type || !validActivityTypes.has(item.activity_type)) {
        errors.push(
          `${prefix}: Invalid or missing activity_type "${item?.activity_type}". Must be one of: ${Array.from(validActivityTypes).join(', ')}.`,
        );
      }

      if (
        !item?.description ||
        typeof item.description !== 'string' ||
        !item.description.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "description".`);
      }

      if (
        !item?.objective ||
        typeof item.objective !== 'string' ||
        !item.objective.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "objective".`);
      }

      if (
        item?.duration_minutes === undefined ||
        typeof item.duration_minutes !== 'number' ||
        item.duration_minutes <= 0
      ) {
        errors.push(
          `${prefix}: "duration_minutes" must be a positive number (minutes).`,
        );
      }

      if (!item?.group_type || !validGroupTypes.has(item.group_type)) {
        errors.push(
          `${prefix}: Invalid or missing group_type "${item?.group_type}". Must be one of: ${Array.from(validGroupTypes).join(', ')}.`,
        );
      }

      if (
        !item?.instructions ||
        typeof item.instructions !== 'string' ||
        !item.instructions.trim()
      ) {
        errors.push(
          `${prefix}: Missing or empty "instructions" (teacher guidelines).`,
        );
      }

      if (
        !item?.english_instructions ||
        typeof item.english_instructions !== 'string' ||
        !item.english_instructions.trim()
      ) {
        errors.push(
          `${prefix}: Missing or empty "english_instructions" (teacher spoken English).`,
        );
      }

      if (
        !item?.student_task ||
        typeof item.student_task !== 'string' ||
        !item.student_task.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "student_task".`);
      }

      if (
        !item?.expected_outcome ||
        typeof item.expected_outcome !== 'string' ||
        !item.expected_outcome.trim()
      ) {
        errors.push(`${prefix}: Missing or empty "expected_outcome".`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Tạo prompt chi tiết hướng dẫn AI sinh hoạt động tương tác
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

    let prompt = `Bạn là chuyên gia thiết kế phương pháp dạy học tương tác và tích cực.
Hãy thiết kế 2 ĐẾN 3 HOẠT ĐỘNG TƯƠNG TÁC (Activities - Phase 1 Component) để giáo viên tổ chức trong tiết học:

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

--- 10 LOẠI HÌNH HOẠT ĐỘNG ĐỀ XUẤT ---
1. Think-Pair-Share
2. Matching
3. Role-play
4. Quiz
5. Discussion
6. Hỏi đáp
7. Problem solving
8. Game
9. Presentation
10. Practice task

--- YÊU CẦU ĐẦU RA (BẮT BUỘC) ---
1. Số lượng: Đúng từ 2 đến 3 hoạt động (không ít hơn 2 và không nhiều hơn 3).
2. Phục vụ mục tiêu: Hoạt động phải phục vụ trực tiếp mục tiêu kiến thức và kỹ năng của bài học, không đơn thuần chơi cho vui.
3. Thời lượng hợp lý: Tổng thời lượng tiết học là ${context.duration} phút. Hãy tự cân đối thời lượng mỗi hoạt động dựa trên tính chất bài học (bài thực hành → hoạt động nhiều hơn, bài lý thuyết → hoạt động ít hơn). QUAN TRỌNG: Phải chừa đủ thời gian (tối thiểu 8 phút) cho các phần khác trong tiết như mở bài (warm-up), kiểm tra đánh giá (assessment) và tổng kết (wrap-up) — tức tổng thời lượng activities KHÔNG được bằng toàn bộ thời lượng tiết.
4. Hình thức nhóm (group_type): Chọn một trong các giá trị sau: individual | pair | group | whole_class.
5. Hướng dẫn chi tiết (instructions): Các bước rõ ràng cho giáo viên tổ chức từ chuẩn bị đến thực hiện và kết luận.
6. Lời nói tiếng Anh (english_instructions): Câu tiếng Anh khẩu ngữ giáo viên dùng để giao nhiệm vụ hoặc điều hành hoạt động.
7. Nhiệm vụ học sinh (student_task): Mô tả rõ học sinh phải làm gì, thảo luận gì hoặc giải quyết vấn đề gì.
8. Kết quả mong đợi (expected_outcome): Nêu rõ sản phẩm hoặc kết quả cụ thể học sinh đạt được.

--- ĐỊNH DẠNG JSON YÊU CẦU ---
Trả về đối tượng JSON duy nhất có cấu trúc:
{
  "activities": [
    {
      "activity_name": "tên hoạt động hấp dẫn và bám sát bài học",
      "activity_type": "Think-Pair-Share | Matching | Role-play | Quiz | Discussion | Hỏi đáp | Problem solving | Game | Presentation | Practice task",
      "description": "mô tả ngắn gọn về hoạt động",
      "objective": "mục tiêu sư phạm cụ thể",
      "duration_minutes": 8,
      "group_type": "individual | pair | group | whole_class",
      "instructions": "1. Đặt câu hỏi... 2. Hướng dẫn thảo luận... 3. Nhận xét...",
      "english_instructions": "câu lệnh tiếng Anh giáo viên dùng",
      "student_task": "nhiệm vụ cụ thể học sinh làm",
      "expected_outcome": "kết quả cụ thể học sinh trình bày được"
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
   * Lấy danh sách hoạt động theo ID của Lesson Kit
   */
  async findByKitId(kitId: string): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ lesson_kit_id: new Types.ObjectId(kitId) })
      .sort({ sort_order: 1 })
      .exec();
  }

  /**
   * Xoá toàn bộ hoạt động của Lesson Kit
   */
  async deleteByKitId(kitId: string): Promise<void> {
    await this.activityModel
      .deleteMany({ lesson_kit_id: new Types.ObjectId(kitId) })
      .exec();
    this.logger.log(`Deleted activities for kit: ${kitId}`);
  }

  /**
   * Lưu hàng loạt hoạt động vào DB và gán lesson_kit_id
   */
  async saveBulk(kitId: string, items: any[]): Promise<ActivityDocument[]> {
    const kitObjectId = new Types.ObjectId(kitId);
    const docs = items.map((item, index) => ({
      ...item,
      lesson_kit_id: kitObjectId,
      sort_order: item.sort_order ?? index + 1,
    }));

    const inserted = await this.activityModel.insertMany(docs);
    this.logger.log(`Saved ${inserted.length} activities for kit: ${kitId}`);
    return inserted as unknown as ActivityDocument[];
  }
}
