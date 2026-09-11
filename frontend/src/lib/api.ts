// ─── Base API Helpers ───────────────────────────────────────────────
const BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.message || 'Request failed');
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

// ─── Config APIs ────────────────────────────────────────────────────
import type { Subject, ConfigOptions, LessonItem } from './types';

export function getSubjects() {
  return api.get<Subject[]>('/config/subjects');
}

export function getOptions() {
  return api.get<ConfigOptions>('/config/options');
}

export function getLessons(subject: string, grade: string) {
  return api.get<LessonItem[]>(`/lessons?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`);
}

// ─── Lesson Kit APIs ────────────────────────────────────────────────
import type { GenerateResponse, GenerationStatus, LessonKitDetail, LessonKitListItem } from './types';

export function generateLessonKit(body: {
  subject: string;
  grade: string;
  lesson_topic: string;
  lesson_content_id: string;
  duration: number;
  support_level: string;
}) {
  return api.post<GenerateResponse>('/lesson-kit/generate', body);
}

export function getKitStatus(id: string) {
  return api.get<GenerationStatus>(`/lesson-kit/${id}/status`);
}

export function getKitDetail(id: string) {
  return api.get<LessonKitDetail>(`/lesson-kit/${id}`);
}

export async function getKitList(page = 1, limit = 20) {
  const res = await api.get<{ data: LessonKitListItem[]; total: number }>(`/lesson-kit?page=${page}&limit=${limit}`);
  return res.data ?? [];
}

export function deleteKit(id: string) {
  return api.del<{ id: string }>(`/lesson-kit/${id}`);
}

export function regenerateComponent(kitId: string, component: string) {
  return api.post<unknown>(`/lesson-kit/${kitId}/regenerate/${component}`);
}


