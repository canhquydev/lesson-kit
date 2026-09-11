import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, Trash, AlertCircle } from "./icons";


/* ---------- Combobox / Select ---------- */

export type Option = { value: string; label: string; hint?: string };

export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchable = false,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-[13px] font-medium text-slate-600">{label}</label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-2 rounded-[11px] border bg-white px-3.5 py-2.5 text-left text-[14px] transition-colors ${
            open ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          {searchable && <Search className="shrink-0 text-slate-400" width={16} height={16} />}
          <span className={`flex-1 truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            width={16}
            height={16}
            className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="lk-fade-up absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.08]">
            {searchable && (
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                <Search width={15} height={15} className="text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm bài học..."
                  className="w-full bg-transparent text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            )}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-[13px] text-slate-400">
                  Không tìm thấy kết quả
                </div>
              )}
              {filtered.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] transition-colors ${
                      active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block font-medium leading-tight">{o.label}</span>
                      {o.hint && <span className="mt-0.5 block text-[12px] text-slate-400">{o.hint}</span>}
                    </span>
                    {active && <Check width={16} height={16} className="shrink-0 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Subject badge ---------- */

const subjectStyle: Record<string, string> = {
  "Vật lí": "bg-indigo-50 text-indigo-700 ring-indigo-100",
  "Hóa học": "bg-violet-50 text-violet-700 ring-violet-100",
  "Sinh học": "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Toán": "bg-rose-50 text-rose-700 ring-rose-100",
  VAT_LI: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  HOA_HOC: "bg-violet-50 text-violet-700 ring-violet-100",
  SINH_HOC: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  TOAN: "bg-rose-50 text-rose-700 ring-rose-100",
  Physics: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  Chemistry: "bg-violet-50 text-violet-700 ring-violet-100",
  Biology: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Math: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function SubjectBadge({ subject }: { subject: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium ring-1 ring-inset ${
        subjectStyle[subject] ?? "bg-slate-50 text-slate-700 ring-slate-100"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {subject}
    </span>
  );
}

/* ---------- CEFR pill ---------- */

export function CefrPill({ level }: { level: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[12px] font-semibold text-slate-600">
      {level}
    </span>
  );
}

/* ---------- Status badge ---------- */

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "completed" || s === "hoàn thành")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12.5px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
        <Check width={13} height={13} strokeWidth={2.4} />
        Hoàn thành
      </span>
    );
  if (s === "generating" || s === "đang tạo")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12.5px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
        <span className="lk-pulse-dot h-1.5 w-1.5 rounded-full bg-amber-500" />
        Đang tạo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[12.5px] font-medium text-rose-700 ring-1 ring-inset ring-rose-100">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      Thất bại
    </span>
  );
}

/* ---------- Generic pill button for tabs ---------- */

export function Tabs({
  tabs,
  active,
  onChange,
  staleTabs,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
  staleTabs?: string[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => {
        const on = t === active;
        const isStale = staleTabs?.includes(t);
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`relative flex items-center whitespace-nowrap px-3.5 py-3 text-[13.5px] font-medium transition-colors ${
              on ? "text-indigo-600 font-semibold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>{t}</span>
            {isStale && (
              <span
                title="Phần này có thể chưa cập nhật theo thay đổi mới nhất"
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-300/80"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Cần cập nhật
              </span>
            )}
            {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-600" />}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[14px] border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Skeleton loader ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-40 flex-1" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  );
}

/* ---------- Toast notifications ---------- */

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastSeq = 0;

export function toast(message: string, type: ToastType = "info") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("app:toast", {
        detail: { id: ++toastSeq, message, type },
      })
    );
  }
}

const toastConfig: Record<
  ToastType,
  {
    container: string;
    icon: typeof Check;
    iconBg: string;
  }
> = {
  success: {
    container: "border-emerald-200 bg-white text-slate-800 shadow-xl shadow-emerald-900/10",
    icon: Check,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  error: {
    container: "border-rose-200 bg-white text-slate-800 shadow-xl shadow-rose-900/10",
    icon: AlertCircle,
    iconBg: "bg-rose-100 text-rose-600",
  },
  info: {
    container: "border-indigo-200 bg-white text-slate-800 shadow-xl shadow-indigo-900/10",
    icon: AlertCircle,
    iconBg: "bg-indigo-100 text-indigo-600",
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;
      const item = customEvent.detail;
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== item.id));
      }, 4000);
    };

    window.addEventListener("app:toast", handleToast);
    return () => {
      window.removeEventListener("app:toast", handleToast);
    };
  }, []);

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => {
        const conf = toastConfig[t.type] || toastConfig.info;
        const Icon = conf.icon;
        return (
          <div
            key={t.id}
            className={`lk-fade-up pointer-events-auto flex items-center gap-3 rounded-[14px] border p-3.5 shadow-xl transition-all ${conf.container}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${conf.iconBg}`}>
              <Icon width={16} height={16} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1 pr-1">
              <p className="text-[13.5px] font-medium leading-snug text-slate-800">{t.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Confirm Modal ---------- */

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        style={{ animation: "lk-fade-in .15s ease" }}
        onClick={onCancel}
      />
      <div
        className="relative mx-auto w-full max-w-[420px] rounded-[18px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20"
        style={{ animation: "lk-scale-in .2s ease" }}
      >
        <div className="flex items-start gap-3.5">
          {danger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
              <Trash width={18} height={18} />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-[10px] border border-slate-200 bg-white px-4 py-2 text-[13.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-[10px] px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition-all active:scale-[0.98] ${
              danger
                ? "bg-rose-600 shadow-rose-600/25 hover:bg-rose-500"
                : "bg-indigo-600 shadow-indigo-600/25 hover:bg-indigo-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

