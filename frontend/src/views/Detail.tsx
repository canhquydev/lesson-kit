import { useState, type ComponentType } from "react";
import { activities, assessments, expressions, script, studentQA, vocabulary } from "../data";
import { Card, CefrPill, SubjectBadge, Tabs } from "../components/ui";
import { ArrowLeft, Check, Clock, Refresh, Trash } from "../components/icons";

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
}: {
  icon: ComponentType<{ width?: number; height?: number }>;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  const cls = primary
    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/25"
    : danger
    ? "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200"
    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  return (
    <button className={`flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors ${cls}`}>
      <Icon width={15} height={15} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function ExpressionsTab() {
  return (
    <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
      {expressions.map((e) => (
        <div key={e.en} className="rounded-[13px] border border-slate-200 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">{e.use}</p>
          <p className="mt-1.5 text-[14px] font-medium text-slate-900">"{e.en}"</p>
          <p className="mt-1 text-[13px] italic text-slate-500">{e.vi}</p>
        </div>
      ))}
    </div>
  );
}

function ActivitiesTab() {
  return (
    <div className="space-y-4 p-5">
      {activities.map((a, i) => (
        <div key={a.name} className="overflow-hidden rounded-[13px] border border-slate-200">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-mono text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-[14px] font-semibold text-slate-800">{a.name}</span>
            <span className="text-[13px] text-slate-400">· {a.vi}</span>
            <span className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[12px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                <Clock width={13} height={13} /> {a.duration}
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-600">
                {a.grouping}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_220px]">
            <div>
              <p className="text-[13.5px] leading-relaxed text-slate-700">{a.desc}</p>
              <p className="mt-1.5 text-[13px] italic leading-relaxed text-slate-500">{a.descVi}</p>
            </div>
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
          </div>
        </div>
      ))}
    </div>
  );
}

const qaLevelStyle: Record<string, string> = {
  Common: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Tricky: "bg-amber-50 text-amber-700 ring-amber-100",
};

function QATab() {
  return (
    <div className="space-y-4 p-5">
      {studentQA.map((item, i) => (
        <div key={i} className="rounded-[13px] border border-slate-200 p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-[11px] font-semibold text-white">
              Q
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-slate-900">{item.q}</p>
              <p className="mt-0.5 text-[13px] italic text-slate-500">{item.qVi}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset ${
                qaLevelStyle[item.level] ?? "bg-slate-50 text-slate-600 ring-slate-100"
              }`}
            >
              {item.level}
            </span>
          </div>
          <div className="mt-3 flex items-start gap-2.5 rounded-[10px] bg-indigo-50/50 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-mono text-[11px] font-semibold text-white">
              A
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-relaxed text-slate-700">{item.a}</p>
              <p className="mt-1 text-[13px] italic leading-relaxed text-slate-500">{item.aVi}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssessmentsTab() {
  const total = assessments.reduce((s, a) => s + a.points, 0);
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-4 py-2.5 text-[13px]">
        <span className="font-medium text-slate-600">{assessments.length} câu hỏi đánh giá</span>
        <span className="font-semibold text-slate-900">Tổng: {total} điểm</span>
      </div>
      {assessments.map((a, i) => (
        <div key={i} className="rounded-[13px] border border-slate-200 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11.5px] font-semibold text-violet-700">
              {a.type}
            </span>
            <span className="ml-auto font-mono text-[12px] font-semibold text-slate-500">
              {a.points} {a.points > 1 ? "pts" : "pt"}
            </span>
          </div>
          <p className="text-[14px] font-medium text-slate-900">
            <span className="mr-1.5 text-slate-400">{i + 1}.</span>
            {a.q}
          </p>
          {"options" in a && a.options && (
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {a.options.map((o, oi) => {
                const correct = oi === a.answer;
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
                      {correct ? <Check width={13} height={13} strokeWidth={2.6} /> : String.fromCharCode(65 + oi)}
                    </span>
                    {o}
                  </li>
                );
              })}
            </ul>
          )}
          {"guide" in a && a.guide && (
            <p className="mt-3 rounded-[9px] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-[12.5px] text-slate-500">
              <span className="font-semibold text-slate-600">Gợi ý chấm: </span>
              {a.guide}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ScriptTab() {
  return (
    <div className="space-y-5 p-5">
      {script.map((s) => (
        <div key={s.step} className="overflow-hidden rounded-[13px] border border-slate-200">
          <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
              {s.step}
            </span>
            <span className="text-[14px] font-semibold text-slate-800">{s.title}</span>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* English */}
            <div className="p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
                <span className="font-mono">EN</span> Teacher Speech
              </p>
              <p className="text-[14px] leading-relaxed text-slate-800">{s.en}</p>
              <p className="mt-3 rounded-lg bg-indigo-50/60 px-3 py-2 text-[12.5px] italic text-indigo-700">
                {s.enCue}
              </p>
            </div>
            {/* Vietnamese */}
            <div className="bg-slate-50/30 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                <span className="font-mono">VI</span> Hỗ trợ tiếng Việt
              </p>
              <p className="text-[14px] leading-relaxed text-slate-800">{s.vi}</p>
              <p className="mt-3 rounded-lg bg-emerald-50/70 px-3 py-2 text-[12.5px] italic text-emerald-700">
                {s.viCue}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VocabTab() {
  return (
    <div className="overflow-x-auto p-5">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Word</th>
            <th className="px-4 py-3">IPA Phonetic</th>
            <th className="px-4 py-3">Part of Speech</th>
            <th className="px-4 py-3">Context Meaning</th>
            <th className="px-4 py-3">Textbook Example</th>
          </tr>
        </thead>
        <tbody>
          {vocabulary.map((v) => (
            <tr key={v.word} className="border-b border-slate-100 align-top text-[13.5px] last:border-0">
              <td className="px-4 py-3.5 font-semibold text-slate-900">{v.word}</td>
              <td className="px-4 py-3.5 font-mono text-[12.5px] text-indigo-600">{v.ipa}</td>
              <td className="px-4 py-3.5">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium italic text-slate-600">
                  {v.pos}
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-600">{v.meaning}</td>
              <td className="px-4 py-3.5 italic text-slate-500">"{v.example}"</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Detail({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState("Teaching Script");

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
            Uniform Accelerated Motion
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[13px] text-slate-500">
            <SubjectBadge subject="Physics" />
            <span className="flex items-center gap-1">
              <Clock width={14} height={14} /> 45 mins
            </span>
            <span>·</span>
            <span>Grade 10</span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              CEFR <CefrPill level="B1" />
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionBtn icon={Refresh} label="Regenerate Component" primary />
          <ActionBtn icon={Trash} label="Delete" danger />
        </div>
      </div>

      {/* Tabs + content */}
      <Card className="overflow-hidden">
        <div className="px-3">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
        </div>
        <div className="lk-fade-up" key={tab}>
          {tab === "Teaching Script" && <ScriptTab />}
          {tab === "Vocabulary" && <VocabTab />}
          {tab === "Activities" && <ActivitiesTab />}
          {tab === "Student Q&A" && <QATab />}
          {tab === "Assessments" && <AssessmentsTab />}
          {tab === "Expressions" && <ExpressionsTab />}
        </div>
      </Card>
    </div>
  );
}
