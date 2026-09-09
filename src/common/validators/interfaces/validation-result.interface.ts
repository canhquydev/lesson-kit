/**
 * Kết quả kiểm tra tính hợp lệ của dữ liệu sinh bởi AI.
 * Sử dụng trong toàn bộ hệ thống Lesson Kit Generator để xác thực output trước khi lưu DB.
 */
export interface ValidationResult {

  isValid: boolean;

  errors: string[];
}
