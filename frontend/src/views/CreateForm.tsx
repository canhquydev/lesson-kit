import { useEffect, useMemo, useState } from "react";
import { Combobox, Card, Skeleton, toast } from "../components/ui";
import { ArrowLeft, ArrowRight, Globe, Sparkle } from "../components/icons";
import { getSubjects, getLessons, getOptions, generateLessonKit } from "../lib/api";
import type { Subject, LessonItem, SupportLevel } from "../lib/types";
import type { FormData } from "../App";

// Map backend subject code → display name
const SUBJECT_NAMES: Record<string, string> = {
  VAT_LI: "Vật lí",
  HOA_HOC: "Hóa học",
  SINH_HOC: "Sinh học",
  TOAN: "Toán",
};

export function CreateForm({
  onBack,
  onGenerate,
}: {
  onBack: () => void;
  onGenerate: (kitId: string, data: FormData) => void;
}) {
  // ─── API data ───
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [durations, setDurations] = useState<number[]>([35, 40, 45]);
  const [supportLevels, setSupportLevels] = useState<SupportLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // ─── Form state ───
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("10");
  const [lessonId, setLessonId] = useState("");
  const [duration, setDuration] = useState("45");
  const [cefr, setCefr] = useState("B1");

  // ─── Load subjects + options on mount ───
  useEffect(() => {
    Promise.all([getSubjects(), getOptions()])
      .then(([subs, opts]) => {
        setSubjects(subs);
        setDurations(opts.durations);
        setSupportLevels(opts.support_levels);
        if (subs.length > 0) setSubject(subs[0].code);
      })
      .catch(() => toast("Không thể tải cấu hình", "error"))
      .finally(() => setLoading(false));
  }, []);

  // ─── Load lessons when subject/grade changes ───
  useEffect(() => {
    if (!subject || !grade) return;
    setLessonId("");
    getLessons(subject, grade)
      .then(setLessons)
      .catch(() => setLessons([]));
  }, [subject, grade]);

  // ─── Derived ───
  const selectedLesson = lessons.find((l) => l._id === lessonId);
  const subjectOptions = subjects.map((s) => ({
    value: s.code,
    label: SUBJECT_NAMES[s.code] || s.name,
  }));
  const gradeOptions = ["10", "11", "12"].map((g) => ({
    value: g,
    label: `Lớp ${g}`,
  }));
  const lessonOptions = useMemo(
    () => lessons.map((l) => ({ value: l._id, label: l.title })),
    [lessons],
  );
  const durationOptions = durations.map((d) => ({
    value: String(d),
    label: `${d} phút`,
  }));
  const cefrOptions = supportLevels.map((s) => ({
    value: s.code,
    label: s.name,
  }));

  const ready = subject && grade && lessonId && duration && cefr && !generating;

  async function handleGenerate() {
    if (!selectedLesson) return;
    setGenerating(true);
    try {
      const data: FormData = {
        subject,
        grade,
        lesson_topic: selectedLesson.title,
        lesson_content_id: lessonId,
        duration: parseInt(duration, 10),
        support_level: cefr,
      };
      const res = await generateLessonKit(data);
      toast("Đang tạo Lesson Kit...", "success");
      onGenerate(res.lesson_kit_id, data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Lỗi khi tạo kit", "error");
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[680px] px-6 py-16">
        <Card className="space-y-5 p-9">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
          <Skeleton className="h-12 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
          <Skeleton className="h-14 rounded-xl" />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft width={16} height={16} /> Quay lại Dashboard
      </button>

      <div className="flex justify-center">
        <Card className="lk-fade-up w-full max-w-[680px] p-7 sm:p-9">
          <div className="mb-7 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-indigo-50 text-indigo-600">
              <Globe width={22} height={22} />
            </span>
            <div>
              <h1 className="font-display text-[22px] font-bold tracking-tight text-slate-900">
                Create Bilingual Lesson Kit
              </h1>
              <p className="text-[13px] text-slate-500">
                Tạo bộ tài liệu song ngữ Anh–Việt theo khung chương trình STEM.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Combobox
                label="Môn học"
                value={subject}
                onChange={(v) => {
                  setSubject(v);
                  setLessonId("");
                }}
                options={subjectOptions}
              />
              <Combobox
                label="Khối lớp"
                value={grade}
                onChange={(v) => {
                  setGrade(v);
                  setLessonId("");
                }}
                options={gradeOptions}
              />
            </div>

            <Combobox
              label="Bài học"
              value={lessonId}
              onChange={setLessonId}
              searchable
              placeholder="Chọn bài học từ sách giáo khoa..."
              options={lessonOptions}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Combobox
                label="Thời lượng"
                value={duration}
                onChange={setDuration}
                options={durationOptions}
              />
              <Combobox
                label="Trình độ tiếng Anh (CEFR)"
                value={cefr}
                onChange={setCefr}
                options={cefrOptions}
              />
            </div>
          </div>

          <button
            disabled={!ready}
            onClick={handleGenerate}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] bg-indigo-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <span className="lk-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                Đang gửi...
              </>
            ) : (
              <>
                <Sparkle width={18} height={18} />
                Tạo Lesson Kit (AI Pipeline)
                <ArrowRight width={18} height={18} />
              </>
            )}
          </button>
        </Card>
      </div>
    </div>
  );
}
