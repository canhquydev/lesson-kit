import { LessonKit } from '../schemas/lesson-kit.schema';

export interface LessonKitDetailResponse extends LessonKit {
  _id: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  vocabularies: any[];
  classroom_expressions: any[];
  activities: any[];
  teaching_scripts: any[];
  student_questions: any[];
  assessments: any[];
}
