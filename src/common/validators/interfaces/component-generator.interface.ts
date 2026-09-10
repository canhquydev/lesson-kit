import { GenerationContext } from '../../interfaces/generation-context.interface';
import { ValidationResult } from './validation-result.interface';

/**
 * Interface chuẩn hoá cho tất cả 6 component services (Phase 1, 2, 3) trong Lesson Kit Generator.
 */
export interface ComponentGenerator<T> {

  generate(context: GenerationContext): Promise<T[]>;

  validate(data: any[]): ValidationResult;

  getPrompt(context: GenerationContext, retryErrors?: string[]): string;

  findByKitId(kitId: string): Promise<T[]>;

  deleteByKitId(kitId: string): Promise<void>;

  saveBulk(kitId: string, items: any[]): Promise<T[]>;
  
}
