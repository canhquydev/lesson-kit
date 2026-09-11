export class BaseResponseDto<T = any> {
  success: boolean;
  data: T;
  message: string;
  error?: any;

  constructor(partial: Partial<BaseResponseDto<T>>) {
    Object.assign(this, partial);
  }

  static ok<T>(data: T, message = 'Success'): BaseResponseDto<T> {
    return new BaseResponseDto({ success: true, data, message });
  }

  static fail(message: string, error?: any): BaseResponseDto<null> {
    return new BaseResponseDto({ success: false, data: null, message, error });
  }
}
