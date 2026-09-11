import { useEffect, useState, useRef } from "react";
import { Card } from "../components/ui";
import { ArrowRight, Check } from "../components/icons";
import { getKitStatus } from "../lib/api";
import type { FormData } from "../App";

const PHASE_LABELS = [
  "Phase 1: Vocabulary, Classroom Expressions & Activities",
  "Phase 2: Synthesizing Bilingual Teaching Script",
  "Phase 3: Predicting Student Questions & Assessments",
];

function stepToPhase(step: string): number {
  if (!step || step === "pending" || step === "init") return 0;
  if (step.startsWith("phase1")) return 1;
  if (step.startsWith("phase2")) return 2;
  if (step.startsWith("phase3")) return 3;
  if (step === "completed") return 4;
  return 1;
}

export function Progress({
  kitId,
  formData,
  onDone,
}: {
  kitId: string;
  formData: FormData | null;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("init");
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [genTime, setGenTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const data = await getKitStatus(kitId);
        setProgress(data.progress_percent);
        setCurrentStep(data.current_step);
        setStatus(data.status);
        if (data.generation_time_ms) setGenTime(data.generation_time_ms);

        if (data.status === "completed" || data.status === "failed") {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // Network error — keep polling
      }
    }

    poll(); // initial poll
    timerRef.current = setInterval(poll, 2000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [kitId]);

  const complete = status === "completed";
  const failed = status === "failed";
  const phase = stepToPhase(currentStep);

  // Map progress_percent (0-100) to per-phase display
  function phaseProgress(phaseIdx: number) {
    // Phase 1: 0-40%, Phase 2: 40-70%, Phase 3: 70-100%
    const ranges = [
      [0, 40],
      [40, 70],
      [70, 100],
    ];
    const [start, end] = ranges[phaseIdx - 1] ?? [0, 100];
    if (progress >= end) return 100;
    if (progress <= start) return 0;
    return Math.round(((progress - start) / (end - start)) * 100);
  }

  const subjectLabel = formData?.subject ?? "Physics";
  const topicLabel = formData?.lesson_topic ?? "Lesson Kit";

  return (
    <div className="mx-auto max-w-[760px] px-6 py-10">
      {/* Summary header */}
      <div className="lk-fade-up mb-7 text-center">
        {complete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Check width={13} height={13} strokeWidth={2.6} /> Completed
          </span>
        ) : failed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[12.5px] font-medium text-rose-700 ring-1 ring-inset ring-rose-100">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Failed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
            <span className="lk-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-500" />
            Generating · {progress}%
          </span>
        )}
        <h1 className="mt-3 font-display text-[22px] font-bold tracking-tight text-slate-900">
          {subjectLabel} · {topicLabel}
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          {formData?.duration ?? 45} phút · CEFR {formData?.support_level ?? "B1"} · Song ngữ EN / VI
        </p>
      </div>

      {/* Pipeline stepper */}
      <Card className="p-6">
        <div className="space-y-3">
          {PHASE_LABELS.map((label, i) => {
            const idx = i + 1;
            const done = complete || idx < phase;
            const active = !complete && !failed && idx === phase;
            const pct = active ? phaseProgress(idx) : 0;
            return (
              <div
                key={label}
                className={`rounded-[13px] border p-4 transition-colors ${
                  active
                    ? "border-indigo-200 bg-indigo-50/50"
                    : done
                    ? "border-emerald-100 bg-emerald-50/40"
                    : "border-slate-200 bg-slate-50/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                      done ? "bg-emerald-500" : active ? "lk-glow bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    {done ? (
                      <Check width={16} height={16} strokeWidth={2.6} />
                    ) : active ? (
                      <span className="lk-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <span className="text-[12px] font-semibold">{idx}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] font-semibold ${
                        active ? "text-indigo-800" : done ? "text-emerald-800" : "text-slate-500"
                      }`}
                    >
                      {label}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[12.5px] font-semibold ${
                      done ? "text-emerald-600" : active ? "text-indigo-600" : "text-slate-400"
                    }`}
                  >
                    {done ? "100%" : active ? `${pct}%` : "Pending"}
                  </span>
                </div>
                {active && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-indigo-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {genTime && complete && (
          <p className="mt-4 text-center text-[12.5px] text-slate-400">
            Hoàn thành trong {(genTime / 1000).toFixed(1)}s
          </p>
        )}

        <p className="mt-5 text-center text-[12.5px] text-slate-400">
          {failed
            ? "Đã xảy ra lỗi trong quá trình tạo. Vui lòng thử lại."
            : complete
            ? "Bộ tài liệu đã sẵn sàng!"
            : "Đang tạo tài liệu chất lượng cao. Bạn có thể rời khỏi trang này — tiến trình sẽ được lưu tự động."}
        </p>

        {complete ? (
          <button
            onClick={onDone}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-[11px] bg-indigo-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
          >
            Mở bộ tài liệu bài giảng <ArrowRight width={15} height={15} />
          </button>
        ) : failed ? (
          <button
            onClick={() => window.location.reload()}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-[11px] bg-rose-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-rose-500"
          >
            Thử lại
          </button>
        ) : (
          <button
            onClick={onDone}
            className="mx-auto mt-4 flex items-center gap-1.5 text-[13px] font-medium text-indigo-600 transition-colors hover:text-indigo-500"
          >
            Bỏ qua &amp; xem bản nháp <ArrowRight width={15} height={15} />
          </button>
        )}
      </Card>
    </div>
  );
}
