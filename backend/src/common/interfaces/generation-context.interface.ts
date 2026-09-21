import { SupportLevel } from '../enums';

export interface GenerationContext {
  readonly lessonContentId: string;
  readonly subject: string;
  readonly grade: string;
  readonly title: string;
  readonly content: string;
  readonly duration: number;
  readonly supportLevel: SupportLevel;
}

