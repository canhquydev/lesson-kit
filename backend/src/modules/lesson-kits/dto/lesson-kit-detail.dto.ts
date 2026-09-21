import { LessonKit } from '../schemas/lesson-kit.schema';

export interface LessonKitDetailResponse extends LessonKit {
  _id: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  vocabularies: Record<string, unknown>[];
  classroom_expressions: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  teaching_scripts: Record<string, unknown>[];
  student_questions: Record<string, unknown>[];
  assessments: Record<string, unknown>[];
}

