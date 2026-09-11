// ─── Config ─────────────────────────────────────────────────────────
export interface Subject {
  code: string;
  name: string;
}

export interface SupportLevel {
  code: string;
  name: string;
  description: string;
}

export interface ConfigOptions {
  durations: number[];
  support_levels: SupportLevel[];
}

export interface LessonItem {
  _id: string;
  grade: string;
  lesson: string;
  title: string;
}

// ─── Lesson Kit ─────────────────────────────────────────────────────
export interface GenerateResponse {
  lesson_kit_id: string;
  status: string;
}

export interface GenerationStatus {
  status: 'generating' | 'completed' | 'failed';
  current_step: string;
  progress_percent: number;
  generation_time_ms?: number;
  error_message?: string;
}

export interface LessonKitListItem {
  _id: string;
  subject: string;
  grade: string;
  lesson_topic: string;
  duration: number;
  support_level: string;
  status: string;
  current_step?: string;
  progress_percent?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── 6 Components ───────────────────────────────────────────────────
export interface Vocabulary {
  _id: string;
  word: string;
  ipa: string;
  word_type: string;
  meaning_vi: string;
  meaning_en: string;
  example_sentence: string;
  sort_order: number;
}

export interface Expression {
  _id: string;
  category: string;
  expression_en: string;
  expression_vi: string;
  usage_context: string;
  sort_order: number;
}

export interface Activity {
  _id: string;
  activity_name: string;
  activity_name_vi: string;
  description_en: string;
  description_vi: string;
  duration_minutes: number;
  grouping: string;
  materials: string[];
  sort_order: number;
}

export interface TeachingScript {
  _id: string;
  step_number: number;
  step_title: string;
  teacher_speech_en: string;
  teacher_speech_vi: string;
  teacher_action: string;
  expected_student_response: string;
  sort_order: number;
}

export interface StudentQuestion {
  _id: string;
  question_vi: string;
  question_en: string;
  suggested_answer_en: string;
  suggested_answer_vi: string;
  sort_order: number;
}

export interface Assessment {
  _id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching';
  options: string[];
  correct_answer: string;
  explanation: string;
  sort_order: number;
}

// ─── Full Kit Detail ────────────────────────────────────────────────
export interface LessonKitDetail extends LessonKitListItem {
  lesson_content_id: string;
  vocabularies: Vocabulary[];
  classroom_expressions: Expression[];
  activities: Activity[];
  teaching_scripts: TeachingScript[];
  student_questions: StudentQuestion[];
  assessments: Assessment[];
}
