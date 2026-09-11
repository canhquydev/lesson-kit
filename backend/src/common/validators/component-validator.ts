import { Logger } from '@nestjs/common';
import { ValidationResult } from './interfaces/validation-result.interface';

const logger = new Logger('ComponentValidator');

/**
 * Lỗi phát sinh khi AI vượt quá số lần retry cho phép mà output vẫn không hợp lệ
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
    public readonly attempts: number,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Thực thi chu trình Sinh và Thẩm định dữ liệu từ AI
 * - Bước 1: Gọi generatorFn để AI sinh dữ liệu thô.
 * - Bước 2: Gọi validatorFn để kiểm tra JSON schema & quy chuẩn nghiệp vụ.
 * - Bước 3:
 *    + Nếu đạt: Trả về kết quả ngay.
 *    + Nếu không đạt và còn lượt thử (attempts < maxAttempts): Gửi lại prompt kèm danh sách lỗi để AI sửa chữa.
 *    + Nếu hết lượt thử: Ném ngoại lệ ValidationError kèm danh sách lỗi.
 *
 * @param generatorFn Hàm gọi AI, nhận danh sách lỗi của lần trước (nếu có)
 * @param validatorFn Hàm kiểm tra tính hợp lệ
 * @param maxAttempts Số lần thử tối đa (mặc định 3 lần)
 */
export async function validateAndRetry<T>(
  generatorFn: (previousErrors?: string[]) => Promise<any[]>,
  validatorFn: (data: any[]) => ValidationResult,
  maxAttempts = 3,
): Promise<T[]> {
  let attempts = 0;
  let lastErrors: string[] = [];

  while (attempts < maxAttempts) {
    attempts++;
    logger.log(`Validation & Retry loop - Attempt ${attempts}/${maxAttempts}`);

    const rawData = await generatorFn(attempts > 1 ? lastErrors : undefined);
    const validationResult = validatorFn(rawData);

    if (validationResult.isValid) {
      logger.log(`Validation PASSED on attempt ${attempts}`);
      return rawData as T[];
    }

    lastErrors = validationResult.errors;
    logger.warn(
      `Validation FAILED on attempt ${attempts}: ${lastErrors.join('; ')}`,
    );
  }

  throw new ValidationError(
    `Validation failed after ${maxAttempts} attempts. Errors: ${lastErrors.join('; ')}`,
    lastErrors,
    attempts,
  );
}
