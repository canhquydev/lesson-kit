import { validateAndRetry, ValidationError } from './component-validator';
import { ValidationResult } from './interfaces/validation-result.interface';

describe('validateAndRetry', () => {
  it('should return data immediately if valid on first attempt', async () => {
    const mockData = [{ id: 1, name: 'Item 1' }];
    const generatorFn = jest.fn().mockResolvedValue(mockData);
    const validatorFn = jest.fn().mockReturnValue({ isValid: true, errors: [] });

    const result = await validateAndRetry(generatorFn, validatorFn, 3);

    expect(result).toEqual(mockData);
    expect(generatorFn).toHaveBeenCalledTimes(1);
    expect(generatorFn).toHaveBeenCalledWith(undefined);
    expect(validatorFn).toHaveBeenCalledTimes(1);
  });

  it('should pass retry errors to generator and succeed on subsequent attempt', async () => {
    const invalidData = [{ id: 1 }];
    const validData = [{ id: 1, name: 'Valid Item' }];

    const generatorFn = jest
      .fn()
      .mockResolvedValueOnce(invalidData)
      .mockResolvedValueOnce(validData);

    const validatorFn = jest
      .fn()
      .mockReturnValueOnce({ isValid: false, errors: ['Missing field "name"'] })
      .mockReturnValueOnce({ isValid: true, errors: [] });

    const result = await validateAndRetry(generatorFn, validatorFn, 3);

    expect(result).toEqual(validData);
    expect(generatorFn).toHaveBeenCalledTimes(2);
    expect(generatorFn).toHaveBeenNthCalledWith(1, undefined);
    expect(generatorFn).toHaveBeenNthCalledWith(2, ['Missing field "name"']);
    expect(validatorFn).toHaveBeenCalledTimes(2);
  });

  it('should throw ValidationError if max attempts reached without valid data', async () => {
    const invalidData: unknown[] = [];
    const generatorFn = jest.fn().mockResolvedValue(invalidData);
    const validatorFn = jest
      .fn()
      .mockReturnValue({ isValid: false, errors: ['List must contain at least 1 item'] });

    await expect(validateAndRetry(generatorFn, validatorFn, 3)).rejects.toThrow(
      ValidationError,
    );
    expect(generatorFn).toHaveBeenCalledTimes(3);
    expect(validatorFn).toHaveBeenCalledTimes(3);
  });
});
