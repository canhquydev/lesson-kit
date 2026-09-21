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
export class ActivitiesService implements ComponentGenerator<ActivityDocument> {
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

        return (response.activities || []).map((item) => {
          let dur = item?.duration_minutes;
          if (typeof dur === 'string' && /^\d+$/.test(dur.trim())) {
            dur = parseInt(dur.trim(), 10);
          }
          return {
            ...item,
            duration_minutes: dur,
            activity_type: this.normalizeActivityType(item?.activity_type),
            group_type: this.normalizeGroupType(item?.group_type),
          };
        });
      },
      (data: any[]) => this.validate(data, context),
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
      activity_type: this.normalizeActivityType(item.activity_type),
      group_type: this.normalizeGroupType(item.group_type),
      instructions_en: this.normalizeInstructions(item.instructions_en),
      instructions_vn: this.normalizeInstructions(item.instructions_vn),
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
   * - Tổng duration_minutes không được vượt quá context.duration - 8.
   * - Bắt buộc đầy đủ các trường: activity_name, description, objective, instructions_en, instructions_vn, student_task, expected_outcome.
   */
  validate(data: any[], context?: GenerationContext): ValidationResult {
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

    // Kiểm tra tổng thời lượng activities không được vượt quá thời lượng tiết học
    // Cần chừa tối thiểu 8 phút cho warm-up, assessment và wrap-up
    if (
      context?.duration &&
      typeof context.duration === 'number' &&
      context.duration > 0
    ) {
      const maxAllowedMinutes = Math.max(1, context.duration - 8);
      const totalDuration = data.reduce((sum, item) => {
        let dur = item?.duration_minutes;
        if (typeof dur === 'string' && /^\d+$/.test(dur.trim())) {
          dur = parseInt(dur.trim(), 10);
        }
        return (
          sum +
          (typeof dur === 'number' && !isNaN(dur) && dur > 0 ? dur : 0)
        );
      }, 0);

      if (totalDuration > maxAllowedMinutes) {
        errors.push(
          `Total duration of activities (${totalDuration} minutes) exceeds the maximum allowed (${maxAllowedMinutes} minutes) for a ${context.duration}-minute lesson. Activities must leave at least 8 minutes for warm-up, assessment, and wrap-up.`,
        );
      }
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

      if (item && typeof item === 'object') {
        if (
          typeof item.duration_minutes === 'string' &&
          /^\d+$/.test(item.duration_minutes.trim())
        ) {
          item.duration_minutes = parseInt(item.duration_minutes.trim(), 10);
        }
        if (item.activity_type) {
          item.activity_type = this.normalizeActivityType(item.activity_type);
        }
        if (item.group_type) {
          item.group_type = this.normalizeGroupType(item.group_type);
        }
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
        !item?.instructions_en ||
        typeof item.instructions_en !== 'string' ||
        !item.instructions_en.trim()
      ) {
        errors.push(
          `${prefix}: Missing or empty "instructions_en" (teacher guidelines in English).`,
        );
      } else {
        const stepCount = this.countSteps(item.instructions_en);
        if (stepCount < 2) {
          errors.push(
            `${prefix}: "instructions_en" must contain at least 2 distinct numbered steps (found ${stepCount}). Use "1. ...\n2. ..." format.`,
          );
        }
      }

      if (
        !item?.instructions_vn ||
        typeof item.instructions_vn !== 'string' ||
        !item.instructions_vn.trim()
      ) {
        errors.push(
          `${prefix}: Missing or empty "instructions_vn" (teacher guidelines in Vietnamese).`,
        );
      } else {
        const stepCount = this.countSteps(item.instructions_vn);
        if (stepCount < 2) {
          errors.push(
            `${prefix}: "instructions_vn" must contain at least 2 distinct numbered steps (found ${stepCount}). Use "1. ...\n2. ..." format.`,
          );
        }
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
4. Loại hình hoạt động (activity_type): BẮT BUỘC chọn đúng 1 trong 10 loại hình:
   Think-Pair-Share | Matching | Role-play | Quiz | Discussion | Hỏi đáp | Problem solving | Game | Presentation | Practice task.
   CẢNH BÁO QUAN TRỌNG: TUYỆT ĐỐI KHÔNG điền "Group", "Individual", "Pair" vào "activity_type" (đây là group_type, KHÔNG PHẢI activity_type). Với các hoạt động thực hành làm bài/làm mô hình theo nhóm, hãy chọn "Practice task" hoặc "Problem solving".
5. Hình thức nhóm (group_type): Chọn một trong 4 giá trị: individual | pair | group | whole_class.
6. Hướng dẫn chi tiết tiếng Anh (instructions_en): Các bước rõ ràng bằng tiếng Anh cho giáo viên tổ chức từ chuẩn bị đến thực hiện và kết luận. BẮT BUỘC viết mỗi bước trên một dòng riêng, dùng ký tự xuống dòng (\n) giữa các bước. VD: "1. Prepare cards...\n2. Divide students...\n3. Ask them to...".
7. Hướng dẫn chi tiết tiếng Việt (instructions_vn): Bản tiếng Việt tương ứng của instructions_en. BẮT BUỘC viết mỗi bước trên một dòng riêng, dùng ký tự xuống dòng (\n). VD: "1. Chuẩn bị...\n2. Chia nhóm...\n3. Yêu cầu...\n4. Tổng kết...".
8. Nhiệm vụ học sinh (student_task): Mô tả rõ học sinh phải làm gì, thảo luận gì hoặc giải quyết vấn đề gì.
9. Kết quả mong đợi (expected_outcome): Nêu rõ sản phẩm hoặc kết quả cụ thể học sinh đạt được.

--- ĐỊNH DẠNG JSON YÊU CẦU ---
Trả về đối tượng JSON duy nhất có cấu trúc:
{
  "activities": [
    {
      "activity_name": "tên hoạt động hấp dẫn và bám sát bài học",
      "activity_type": "Think-Pair-Share | Matching | Role-play | Quiz | Discussion | Hỏi đáp | Problem solving | Game | Presentation | Practice task (KHÔNG ĐƯỢC ĐIỀN 'Group')",
      "description": "mô tả ngắn gọn về hoạt động",
      "objective": "mục tiêu sư phạm cụ thể",
      "duration_minutes": 8,
      "group_type": "individual | pair | group | whole_class",
      "instructions_en": "1. Prepare: Hand out the worksheet to each group.\n2. Divide: Split the class into 4 groups of 4-5 students.\n3. Instruct: Ask students to match the terms with their definitions.\n4. Wrap up: Have a representative from each group present.",
      "instructions_vn": "1. Chuẩn bị: Phát phiếu bài tập cho mỗi nhóm.\n2. Chia nhóm: Chia lớp thành 4 nhóm, mỗi nhóm 4-5 học sinh.\n3. Yêu cầu: Học sinh thảo luận và ghép đôi các thuật ngữ.\n4. Tổng kết: Gọi đại diện nhóm trình bày kết quả.",
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
   * Chuẩn hóa activity_type và tự động map các nhầm lẫn phổ biến của AI
   * (Đặc biệt: AI hay nhầm group_type "Group" thành activity_type)
   */
  private normalizeActivityType(type: any): string {
    if (!type || typeof type !== 'string') return type;
    const trimmed = type.trim();
    const lower = trimmed.toLowerCase().replace(/[\s_-]+/g, ' ');

    if (lower === 'think pair share' || lower === 'think-pair-share') {
      return ActivityType.THINK_PAIR_SHARE;
    }
    if (lower === 'matching') {
      return ActivityType.MATCHING;
    }
    if (lower === 'role play' || lower === 'role-play' || lower === 'roleplay') {
      return ActivityType.ROLE_PLAY;
    }
    if (lower === 'quiz') {
      return ActivityType.QUIZ;
    }
    if (lower === 'discussion' || lower === 'thảo luận') {
      return ActivityType.DISCUSSION;
    }
    if (
      lower === 'hỏi đáp' ||
      lower === 'hoi dap' ||
      lower === 'q&a' ||
      lower === 'q and a' ||
      lower === 'qa'
    ) {
      return ActivityType.HOI_DAP;
    }
    if (
      lower === 'problem solving' ||
      lower === 'problem-solving' ||
      lower === 'giải quyết vấn đề'
    ) {
      return ActivityType.PROBLEM_SOLVING;
    }
    if (lower === 'game' || lower === 'trò chơi') {
      return ActivityType.GAME;
    }
    if (lower === 'presentation' || lower === 'thuyết trình') {
      return ActivityType.PRESENTATION;
    }
    if (
      lower === 'practice task' ||
      lower === 'practice' ||
      lower === 'thực hành' ||
      lower === 'luyện tập' ||
      lower === 'group' ||
      lower === 'group work' ||
      lower === 'làm việc nhóm' ||
      lower === 'individual' ||
      lower === 'individual work'
    ) {
      return ActivityType.PRACTICE_TASK;
    }

    return trimmed;
  }

  /**
   * Chuẩn hóa group_type về enum hợp lệ (individual, pair, group, whole_class)
   */
  private normalizeGroupType(type: any): string {
    if (!type || typeof type !== 'string') return type;
    const lower = type.trim().toLowerCase().replace(/[\s-]+/g, '_');

    if (lower === 'individual' || lower === 'cá_nhân') {
      return GroupType.INDIVIDUAL;
    }
    if (lower === 'pair' || lower === 'cặp' || lower === 'cặp_đôi') {
      return GroupType.PAIR;
    }
    if (lower === 'group' || lower === 'nhóm') {
      return GroupType.GROUP;
    }
    if (
      lower === 'whole_class' ||
      lower === 'wholeclass' ||
      lower === 'toàn_lớp' ||
      lower === 'cả_lớp'
    ) {
      return GroupType.WHOLE_CLASS;
    }

    return type.trim();
  }

  /**
   * Normalize instruction text: ensure each numbered step is on its own line.
   * Handles both already-newlined and inline "1. xxx 2. yyy" formats.
   */
  private normalizeInstructions(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // If already has newlines between steps, trim and return
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 1) return lines.join('\n');

    // Split inline numbered steps: "1. xxx 2. yyy" → "1. xxx\n2. yyy"
    return text.replace(/\s+(\d+)\.\s/g, '\n$1. ').trim();
  }

  /**
   * Count the number of distinct numbered steps in instruction text.
   */
  private countSteps(text: string): number {
    if (!text) return 0;
    const matches = text.match(/(?:^|\n)\s*\d+\./g);
    return matches ? matches.length : text.trim() ? 1 : 0;
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
