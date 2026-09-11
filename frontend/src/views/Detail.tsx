import { useEffect, useState, type ComponentType } from "react";
import { Card, CefrPill, SubjectBadge, Tabs, Skeleton, toast } from "../components/ui";
import { ArrowLeft, Check, Clock, Refresh, Trash } from "../components/icons";
import { getKitDetail, deleteKit, regenerateComponent } from "../lib/api";
import type { LessonKitDetail, Vocabulary, Expression, Activity, TeachingScript, StudentQuestion, Assessment } from "../lib/types";

const SUBJECT_DISPLAY: Record<string, string> = {
  VAT_LI: "Physics",
  HOA_HOC: "Chemistry",
  SINH_HOC: "Biology",
  TOAN: "Math",
};

const TABS = [
  "Teaching Script",
  "Vocabulary",
  "Expressions",
  "Activities",
  "Student Q&A",
  "Assessments",
];

function ActionBtn({
  icon: Icon,
  label,
  primary,
  danger,
  onClick,
  loading: isLoading,
}: {
  icon: ComponentType<{ width?: number; height?: number }>;
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  const cls = primary
    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/25"
    : danger
    ? "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200"
    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${cls}`}
    >
      {isLoading ? (
        <span className="lk-spin h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current" />
      ) : (
        <Icon width={15} height={15} />
      )}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

// ─── Tab Components ───────────────────────────────────────────────

function ExpressionsTab({ data }: { data: Expression[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
      {data.map((e) => (
        <div key={e._id} className="rounded-[13px] border border-slate-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">{e.category}</p>
          <p className="mt-1.5 text-[14px] font-medium text-slate-900">"{e.expression_en}"</p>
          <p className="mt-1 text-[13px] italic text-slate-500">{e.expression_vi}</p>
        </div>
      ))}
    </div>
  );
}

function ActivitiesTab({ data }: { data: Activity[] }) {
  return (
    <div className="space-y-4 p-5">
      {data.map((a, i) => (
        <div key={a._id} className="overflow-hidden rounded-[13px] border border-slate-200">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-mono text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-[14px] font-semibold text-slate-800">{a.activity_name}</span>
            <span className="text-[13px] text-slate-400">· {a.activity_name_vi}</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[12px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                <Clock width={13} height={13} /> {a.duration_minutes} min
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-600">
                {a.grouping}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_220px]">
            <div>
              <p className="text-[13.5px] leading-relaxed text-slate-700">{a.description_en}</p>
              <p className="mt-1.5 text-[13px] italic leading-relaxed text-slate-500">{a.description_vi}</p>
            </div>
            {a.materials && a.materials.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Materials
                </p>
                <ul className="space-y-1">
                  {a.materials.map((m) => (
                    <li key={m} className="flex items-center gap-1.5 text-[13px] text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function QATab({ data }: { data: StudentQuestion[] }) {
  return (
    <div className="space-y-4 p-5">
      {data.map((item) => (
        <div key={item._id} className="rounded-[13px] border border-slate-200 p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-[11px] font-semibold text-white">
              Q
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-slate-900">{item.question_en}</p>
              <p className="mt-0.5 text-[13px] italic text-slate-500">{item.question_vi}</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-[10px] bg-indigo-50/50 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-mono text-[11px] font-semibold text-white">
              A
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-relaxed text-slate-700">{item.suggested_answer_en}</p>
              <p className="mt-1 text-[13px] italic leading-relaxed text-slate-500">{item.suggested_answer_vi}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssessmentsTab({ data }: { data: Assessment[] }) {
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-4 py-2.5 text-[13px]">
        <span className="font-medium text-slate-600">{data.length} câu hỏi đánh giá</span>
      </div>
      {data.map((a, i) => (
        <div key={a._id} className="rounded-[13px] border border-slate-200 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11.5px] font-semibold text-violet-700">
              {a.question_type.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[14px] font-medium text-slate-900">
            <span className="mr-1.5 text-slate-400">{i + 1}.</span>
            {a.question_text}
          </p>
          {a.options && a.options.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {a.options.map((o) => {
                const correct = o === a.correct_answer;
                return (
                  <li
                    key={o}
                    className={`flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[13.5px] ${
                      correct
                        ? "border-emerald-200 bg-emerald-50 font-medium text-emerald-800"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {correct ? <Check width={13} height={13} strokeWidth={2.6} /> : "·"}
                    </span>
                    {o}
                  </li>
                );
              })}
            </ul>
          )}
          {a.explanation && (
            <p className="mt-3 rounded-[9px] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-[12.5px] text-slate-500">
              <span className="font-semibold text-slate-600">Giải thích: </span>
              {a.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ScriptTab({ data }: { data: TeachingScript[] }) {
  return (
    <div className="space-y-5 p-5">
      {data.map((s) => (
        <div key={s._id} className="overflow-hidden rounded-[13px] border border-slate-200">
          <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
              Step {s.step_number}
            </span>
            <span className="text-[14px] font-semibold text-slate-800">{s.step_title}</span>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* English */}
            <div className="p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                <span className="font-mono">EN</span> Teacher Speech
              </p>
              <p className="text-[14px] leading-relaxed text-slate-800">{s.teacher_speech_en}</p>
              {s.teacher_action && (
                <p className="mt-3 rounded-lg bg-indigo-50/60 px-3 py-2 text-[12.5px] italic text-indigo-700">
                  {s.teacher_action}
                </p>
              )}
            </div>
            {/* Vietnamese */}
            <div className="bg-slate-50/30 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                <span className="font-mono">VI</span> Hỗ trợ tiếng Việt
              </p>
              <p className="text-[14px] leading-relaxed text-slate-800">{s.teacher_speech_vi}</p>
              {s.expected_student_response && (
                <p className="mt-3 rounded-lg bg-emerald-50/70 px-3 py-2 text-[12.5px] italic text-emerald-700">
                  Expected: {s.expected_student_response}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VocabTab({ data }: { data: Vocabulary[] }) {
  return (
    <div className="overflow-x-auto p-5">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Word</th>
            <th className="px-4 py-3">IPA Phonetic</th>
            <th className="px-4 py-3">Part of Speech</th>
            <th className="px-4 py-3">Context Meaning</th>
            <th className="px-4 py-3">Example</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v) => (
            <tr key={v._id} className="border-b border-slate-100 align-top text-[13.5px] last:border-0">
              <td className="px-4 py-3.5 font-semibold text-slate-900">{v.word}</td>
              <td className="px-4 py-3.5 font-mono text-[12.5px] text-indigo-600">{v.ipa}</td>
              <td className="px-4 py-3.5">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium italic text-slate-600">
                  {v.word_type}
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-600">
                <span className="text-slate-900">{v.meaning_vi}</span>
                {v.meaning_en && <span className="text-slate-400"> — {v.meaning_en}</span>}
              </td>
              <td className="px-4 py-3.5 italic text-slate-500">"{v.example_sentence}"</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Page ──────────────────────────────────────────────────

const COMPONENT_MAP: Record<string, string> = {
  "Teaching Script": "script",
  "Vocabulary": "vocabulary",
  "Expressions": "expressions",
  "Activities": "activities",
  "Student Q&A": "questions",
  "Assessments": "assessment",
};

export function Detail({ kitId, onBack }: { kitId: string; onBack: () => void }) {
  const [kit, setKit] = useState<LessonKitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Teaching Script");
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getKitDetail(kitId)
      .then(setKit)
      .catch(() => toast("Không thể tải chi tiết kit", "error"))
      .finally(() => setLoading(false));
  }, [kitId]);

  async function handleRegenerate() {
    const comp = COMPONENT_MAP[tab];
    if (!comp) return;
    setRegenerating(true);
    try {
      await regenerateComponent(kitId, comp);
      toast(`Đang tạo lại ${tab}...`, "success");
      // Refetch the kit
      const updated = await getKitDetail(kitId);
      setKit(updated);
    } catch {
      toast("Tạo lại thất bại", "error");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Bạn có chắc muốn xóa Lesson Kit này?")) return;
    setDeleting(true);
    try {
      await deleteKit(kitId);
      toast("Đã xóa Lesson Kit", "success");
      onBack();
    } catch {
      toast("Xóa thất bại", "error");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <Skeleton className="mb-5 h-5 w-40" />
        <Skeleton className="mb-3 h-8 w-72" />
        <Skeleton className="mb-6 h-5 w-56" />
        <Card className="p-6">
          <Skeleton className="mb-4 h-10 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </Card>
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="mx-auto max-w-[1240px] px-6 py-16 text-center">
        <p className="text-[15px] text-slate-500">Không tìm thấy Lesson Kit</p>
        <button onClick={onBack} className="mt-4 text-indigo-600 hover:text-indigo-500">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft width={16} height={16} /> Quay lại danh sách bài giảng
      </button>

      {/* Header bar */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-slate-900">
            {kit.lesson_topic}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[13px] text-slate-500">
            <SubjectBadge subject={SUBJECT_DISPLAY[kit.subject] || kit.subject} />
            <span className="flex items-center gap-1">
              <Clock width={14} height={14} /> {kit.duration} phút
            </span>
            <span>·</span>
            <span>Lớp {kit.grade}</span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              CEFR <CefrPill level={kit.support_level} />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionBtn
            icon={Refresh}
            label={`Regenerate ${tab}`}
            primary
            onClick={handleRegenerate}
            loading={regenerating}
          />
          <ActionBtn icon={Trash} label="Delete" danger onClick={handleDelete} loading={deleting} />
        </div>
      </div>

      {/* Tabs + content */}
      <Card className="overflow-hidden">
        <div className="px-3">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <div className="lk-fade-up" key={tab}>
          {tab === "Teaching Script" && <ScriptTab data={kit.teaching_scripts ?? []} />}
          {tab === "Vocabulary" && <VocabTab data={kit.vocabularies ?? []} />}
          {tab === "Activities" && <ActivitiesTab data={kit.activities ?? []} />}
          {tab === "Student Q&A" && <QATab data={kit.student_questions ?? []} />}
          {tab === "Assessments" && <AssessmentsTab data={kit.assessments ?? []} />}
          {tab === "Expressions" && <ExpressionsTab data={kit.classroom_expressions ?? []} />}
        </div>
      </Card>
    </div>
  );
}
