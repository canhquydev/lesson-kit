import { GenerationContext } from '../../interfaces/generation-context.interface';
import { ValidationResult } from './validation-result.interface';


export interface ComponentDependencies {
  /** Danh sách từ vựng chuyên ngành từ Phase 1 */
  vocabularies?: any[];

  /** Danh sách mẫu câu giao tiếp lớp học từ Phase 1 */
  expressions?: any[];

  /** Danh sách hoạt động tương tác từ Phase 1 */
  activities?: any[];

  /** Kịch bản giảng dạy */
  teaching_scripts?: any[];

  /** Dự đoán câu hỏi học sinh */
  student_questions?: any[];

  /** Nội dung đánh giá cuối giờ */
  assessments?: any[];

  /** Khả năng mở rộng cho các dependency tùy biến khác */
  [key: string]: any;
}


export interface ComponentGenerator<T, TDependencies = ComponentDependencies> {
  generate(context: GenerationContext, dependencies?: TDependencies): Promise<T[]>;

  // Kiểm tra tính hợp lệ về cấu trúc và nghiệp vụ của dữ liệu do AI trả về
  validate(data: any[]): ValidationResult;

  // Sinh câu prompt gửi cho A
  getPrompt(
    context: GenerationContext,
    dependencies?: TDependencies,
    retryErrors?: string[],
  ): string;
  getPrompt(
    context: GenerationContext,
    retryErrors?: string[],
  ): string;

  // Lấy danh sách thành phần theo ID của Lesson Kit
  findByKitId(kitId: string): Promise<T[]>;

  // Xoá toàn bộ thành phần theo ID của Lesson Kit (phục vụ cascade delete hoặc regenerate)
  deleteByKitId(kitId: string): Promise<void>;

  // Lưu hàng loạt các phần tử vào cơ sở dữ liệu và liên kết với Lesson Kit
  saveBulk(kitId: string, items: any[]): Promise<T[]>;
}
