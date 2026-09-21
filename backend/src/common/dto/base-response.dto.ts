export class BaseResponseDto<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  error?: string | Record<string, unknown>;

  constructor(partial: Partial<BaseResponseDto<T>>) {
    this.success = partial.success ?? false;
    this.data = partial.data ?? (null as unknown as T);
    this.message = partial.message ?? '';
    this.error = partial.error;
  }

  static ok<T>(data: T, message = 'Success'): BaseResponseDto<T> {
    return new BaseResponseDto({ success: true, data, message });
  }

  static fail(message: string, error?: string | Record<string, unknown>): BaseResponseDto<null> {
    return new BaseResponseDto({ success: false, data: null, message, error });
  }
}
