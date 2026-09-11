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
  subject?: string;
  grade?: string;
  lesson_topic?: string;
  duration?: number;
  support_level?: string;
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
  phonetic: string;
  part_of_speech: string;
  meaning_vi: string;
  meaning_en: string;
  example_sentence: string;
  context_note: string;
  sort_order: number;
}

export interface Expression {
  _id: string;
  category: string;
  expression_en: string;
  translation_vi: string;
  situation_note: string;
  sort_order: number;
}

export interface Activity {
  _id: string;
  activity_name: string;
  activity_type: string;
  description: string;
  objective: string;
  duration_minutes: number;
  group_type: string;
  instructions: string;
  english_instructions: string;
  student_task: string;
  expected_outcome: string;
  sort_order: number;
}

export interface TeachingScript {
  _id: string;
  step_order?: number;
  step_number?: number;
  activity_name?: string;
  step_title?: string;
  duration_minutes?: number;
  objective?: string;
  teacher_speech_en: string;
  teacher_speech_vi: string;
  teacher_action: string;
  expected_student_response: string;
  notes?: string;
  sort_order?: number;
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
  stale_components?: string[];
  vocabularies: Vocabulary[];
  classroom_expressions: Expression[];
  activities: Activity[];
  teaching_scripts: TeachingScript[];
  student_questions: StudentQuestion[];
  assessments: Assessment[];
}

