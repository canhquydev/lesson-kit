import { useEffect, useState, useRef } from "react";
import { Card } from "../components/ui";
import { ArrowLeft, ArrowRight, Check } from "../components/icons";
import { getKitStatus } from "../lib/api";
import { navigateTo } from "../lib/router";
import type { FormData } from "../App";

const SUBJECT_VN: Record<string, string> = {
  VAT_LI: "Vật lí",
  HOA_HOC: "Hóa học",
  SINH_HOC: "Sinh học",
  TOAN: "Toán",
};

const PHASE_LABELS = [
  "Giai đoạn 1: Từ vựng, Mẫu câu & Hoạt động",
  "Giai đoạn 2: Tổng hợp kịch bản giảng dạy song ngữ",
  "Giai đoạn 3: Dự đoán câu hỏi & Đánh giá",
];

const PHASE_MESSAGES: Record<number, string[]> = {
  1: [
    "Đang phân tích chủ đề bài học & chuẩn kiến thức...",
    "Đang trích xuất từ vựng trọng tâm kèm phát âm...",
    "Đang xây dựng mẫu câu giao tiếp lớp học...",
    "Đang thiết kế các hoạt động tương tác sư phạm...",
    "Đang tối ưu ngữ cảnh giảng dạy song ngữ...",
  ],
  2: [
    "Đang phân bổ khung thời gian chi tiết bài giảng...",
    "Đang soạn lời thoại mở đầu bài học (Warm-up & Hook)...",
    "Đang biên soạn kịch bản chi tiết cho từng hoạt động...",
    "Đang tích hợp câu hỏi kiểm tra & củng cố kiến thức...",
    "Đang hoàn thiện phần tổng kết và nhiệm vụ về nhà...",
  ],
  3: [
    "Đang dự đoán các câu hỏi học sinh thường thắc mắc...",
    "Đang biên soạn bộ câu hỏi kiểm tra nhanh (Quick Quiz)...",
    "Đang thiết lập thang đánh giá năng lực học tập...",
    "Đang lưu trữ và đồng bộ toàn bộ bộ tài liệu bài giảng...",
  ],
};

function stepToPhase(step: string): number {
  if (!step || step === "pending" || step === "init") return 1;
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
  const [currentStep, setCurrentStep] = useState("init");
  const [status, setStatus] = useState<"generating" | "completed" | "failed">("generating");
  const [genTime, setGenTime] = useState<number | null>(null);
  const [displayProgress, setDisplayProgress] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(`kit_progress_${kitId}`);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 0 && val <= 100) return val;
      }
    } catch {}
    return 3;
  });
  const [msgIndex, setMsgIndex] = useState(0);
  const [kitMeta, setKitMeta] = useState<{
    subject?: string;
    grade?: string;
    lesson_topic?: string;
    duration?: number;
    support_level?: string;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll backend status
  useEffect(() => {
    async function poll() {
      try {
        const data = await getKitStatus(kitId);
        setCurrentStep(data.current_step);
        setStatus(data.status);
        if (data.generation_time_ms) setGenTime(data.generation_time_ms);
        if (data.lesson_topic) {
          setKitMeta({
            subject: data.subject,
            grade: data.grade,
            lesson_topic: data.lesson_topic,
            duration: data.duration,
            support_level: data.support_level,
          });
        }

        const backendPhase = stepToPhase(data.current_step);
        const minPhaseFloor = backendPhase === 1 ? 3 : backendPhase === 2 ? 38 : backendPhase === 3 ? 72 : 3;

        // Ensure progress never jumps backwards
        setDisplayProgress((prev) => Math.max(prev, minPhaseFloor, data.progress_percent || 0));

        if (data.status === "completed" || data.status === "failed") {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // Network error — keep polling
      }
    }

    poll();
    timerRef.current = setInterval(poll, 1800);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [kitId]);

  const complete = status === "completed";
  const failed = status === "failed";
  const phase = stepToPhase(currentStep);

  // Persist progress to sessionStorage so leaving and returning preserves exact position
  useEffect(() => {
    if (displayProgress > 0 && !failed) {
      try {
        sessionStorage.setItem(`kit_progress_${kitId}`, displayProgress.toString());
      } catch {}
    }
  }, [kitId, displayProgress, failed]);

  // Rotate micro-step messages every 3.5 seconds
  useEffect(() => {
    if (status !== "generating") return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => prev + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, [status]);

  // Asymptotic smooth progress ticker
  useEffect(() => {
    if (failed) return;

    if (complete) {
      setDisplayProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        // Ceiling and floor per phase
        const target = phase === 1 ? 38 : phase === 2 ? 72 : phase === 3 ? 95 : 10;
        const floor = phase === 1 ? 3 : phase === 2 ? 38 : phase === 3 ? 72 : 3;

        let cur = prev < floor ? floor : prev;
        const remaining = target - cur;

        if (remaining > 0) {
          // Asymptotic increment: faster initially, slows down as it nears target cap
          const step = Math.max(0.04, remaining * 0.018);
          return Math.min(target, +(cur + step).toFixed(1));
        }
        return cur;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [phase, complete, failed]);

  // Auto-navigate to lesson kit on completion without needing manual click
  useEffect(() => {
    if (status === "completed") {
      try {
        sessionStorage.removeItem(`kit_progress_${kitId}`);
      } catch {}
      const timer = setTimeout(() => {
        onDone();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [status, kitId, onDone]);

  // Map displayProgress to per-phase progress percentage (0 - 100%)
  function phaseProgress(phaseIdx: number): number {
    if (complete || phaseIdx < phase) return 100;
    if (phaseIdx > phase) return 0;

    const [start, end] = phaseIdx === 1 ? [0, 38] : phaseIdx === 2 ? [38, 72] : [72, 95];
    const pct = Math.round(((displayProgress - start) / (end - start)) * 100);
    return Math.min(95, Math.max(2, pct));
  }

  const activeMsgs = PHASE_MESSAGES[phase] || [];
  const currentMsg = activeMsgs[msgIndex % activeMsgs.length] || "";

  const subjectLabel = kitMeta?.subject || formData?.subject || "VAT_LI";
  const topicLabel = kitMeta?.lesson_topic || formData?.lesson_topic || "Bài giảng";
  const duration = kitMeta?.duration ?? formData?.duration ?? 45;
  const grade = kitMeta?.grade || formData?.grade || "";
  const supportLevel = kitMeta?.support_level || formData?.support_level || "B1";

  return (
    <div className="mx-auto max-w-[760px] px-6 py-10">
      {/* Summary header */}
      <div className="lk-fade-up mb-7 text-center">
        {complete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Check width={13} height={13} strokeWidth={2.6} /> Hoàn thành · Đang mở bài giảng...
          </span>
        ) : failed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[12.5px] font-medium text-rose-700 ring-1 ring-inset ring-rose-100">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Thất bại
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
            <span className="lk-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-500" />
            Đang tạo · {Math.round(displayProgress)}%
          </span>
        )}
        <h1 className="mt-3 font-display text-[22px] font-bold tracking-tight text-slate-900">
          {SUBJECT_VN[subjectLabel] || subjectLabel} · {topicLabel}
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">
          {duration} phút · {grade ? `Lớp ${grade} · ` : ""}CEFR {supportLevel} · Song ngữ Anh–Việt
        </p>
      </div>

      {/* Pipeline stepper */}
      <Card className="p-6">
        <div className="space-y-3">
          {PHASE_LABELS.map((label, i) => {
            const idx = i + 1;
            const done = complete || idx < phase;
            const active = !complete && !failed && idx === phase;
            const pct = active ? phaseProgress(idx) : done ? 100 : 0;
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
                    {active && currentMsg && (
                      <p className="mt-0.5 text-[12px] text-indigo-600/80 transition-all duration-300">
                        {currentMsg}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[12.5px] font-semibold ${
                      done ? "text-emerald-600" : active ? "text-indigo-600" : "text-slate-400"
                    }`}
                  >
                    {done ? "100%" : active ? `${pct}%` : "Chờ"}
                  </span>
                </div>
                {active && (
                  <div className="mt-3 relative h-1.5 overflow-hidden rounded-full bg-indigo-100">
                    <div
                      className="relative h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out overflow-hidden"
                      style={{ width: `${pct}%` }}
                    >
                      <div className="lk-shimmer" />
                    </div>
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

        <p className="mt-5 text-center text-[13px] text-slate-500">
          {failed
            ? "Đã xảy ra lỗi trong quá trình tạo. Vui lòng thử lại."
            : complete
            ? "Bộ tài liệu đã sẵn sàng! Đang chuyển hướng..."
            : "Đang tạo bài giảng. Bạn có thể rời khỏi trang — tiến trình sẽ lưu tự động."}
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
            onClick={() => navigateTo("/")}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 shadow-2xs"
          >
            <ArrowLeft width={15} height={15} />
            <span>Quay về trang chủ</span>
          </button>
        )}
      </Card>
    </div>
  );
}
