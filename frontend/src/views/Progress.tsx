import { useEffect, useState } from "react";
import { Card } from "../components/ui";
import { ArrowRight, Check } from "../components/icons";

const phases = [
  "Phase 1: Vocabulary, Classroom Expressions & Activities",
  "Phase 2: Synthesizing Bilingual Teaching Script",
  "Phase 3: Predicting Student Questions & Assessments",
];

export function Progress({ onDone }: { onDone: () => void }) {
  // Global progress 0..300 (100 per phase). Start mid-phase-2 at 165.
  const [progress, setProgress] = useState(165);

  const phase = Math.min(Math.floor(progress / 100) + 1, 3);
  const pct = Math.min(progress - (phase - 1) * 100, 100);

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => Math.min(p + 3, 300)), 550);
    return () => clearInterval(t);
  }, []);

  const complete = progress >= 300;

  return (
    <div className="mx-auto max-w-[760px] px-6 py-10">
      {/* Summary header */}
      <div className="lk-fade-up mb-7 text-center">
        {complete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Check width={13} height={13} strokeWidth={2.6} /> Completed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
            <span className="lk-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-500" />
            Generating
          </span>
        )}
        <h1 className="mt-3 font-display text-[22px] font-bold tracking-tight text-slate-900">
          Physics 10 · Uniform Accelerated Motion
        </h1>
        <p className="mt-1 text-[13.5px] text-slate-500">45 Mins · CEFR B1 · Bilingual EN / VI</p>
      </div>

      {/* Pipeline stepper */}
      <Card className="p-6">
        <div className="space-y-3">
          {phases.map((label, i) => {
            const idx = i + 1;
            const done = complete || idx < phase;
            const active = !complete && idx === phase;
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

        <p className="mt-5 text-center text-[12.5px] text-slate-400">
          Đang tạo tài liệu chất lượng cao. Bạn có thể rời khỏi trang này — tiến trình sẽ được lưu tự động.
        </p>

        {complete ? (
          <button
            onClick={onDone}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-[11px] bg-indigo-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
          >
            Mở bộ tài liệu bài giảng <ArrowRight width={15} height={15} />
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
