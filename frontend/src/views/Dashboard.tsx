import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Combobox, SubjectBadge, CefrPill, StatusBadge, Card, SkeletonRow, toast } from "../components/ui";
import { ArrowRight, Dots, Eye, Plus, Refresh, Search, Sparkle, Trash } from "../components/icons";
import { getKitList, deleteKit } from "../lib/api";
import type { LessonKitListItem } from "../lib/types";

// Map backend subject codes → English display names
const SUBJECT_DISPLAY: Record<string, string> = {
  VAT_LI: "Physics",
  HOA_HOC: "Chemistry",
  SINH_HOC: "Biology",
  TOAN: "Math",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function capitalizeStatus(s: string): string {
  if (s === "completed") return "Completed";
  if (s === "generating") return "Generating";
  return "Failed";
}

function RowMenu({ onView, onDelete }: { onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const items = [
    { label: "View", icon: Eye, action: onView },
    { label: "Delete", icon: Trash, action: onDelete, danger: true },
  ];
  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Dots />
      </button>
      {open && (
        <div className="lk-fade-up absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-[11px] border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/[0.08]">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                it.action();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
                it.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <it.icon width={15} height={15} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Dashboard({
  onOpenKit,
  onCreate,
}: {
  onOpenKit: (id: string) => void;
  onCreate: () => void;
}) {
  const [kits, setKits] = useState<LessonKitListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("All");
  const [status, setStatus] = useState("All");

  const loadKits = useCallback(() => {
    setLoading(true);
    getKitList(1, 50)
      .then(setKits)
      .catch(() => toast("Không thể tải danh sách", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadKits(); }, [loadKits]);

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa Lesson Kit này?")) return;
    // Optimistic delete
    setKits((prev) => prev.filter((k) => k._id !== id));
    try {
      await deleteKit(id);
      toast("Đã xóa Lesson Kit", "success");
    } catch {
      toast("Xóa thất bại", "error");
      loadKits(); // rollback
    }
  }

  const filtered = useMemo(
    () =>
      kits.filter(
        (k) =>
          k.lesson_topic.toLowerCase().includes(q.toLowerCase()) &&
          (subject === "All" || SUBJECT_DISPLAY[k.subject] === subject) &&
          (status === "All" || capitalizeStatus(k.status) === status),
      ),
    [kits, q, subject, status],
  );

  const opt = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));

  return (
    <div className="mx-auto max-w-[1240px] px-6 py-8">
      {/* Prominent Create Lesson Kit CTA */}
      <button
        onClick={onCreate}
        className="lk-fade-up group relative mb-7 flex w-full items-center gap-5 overflow-hidden rounded-[18px] bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-6 text-left text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.995]"
      >
        <div className="pointer-events-none absolute -right-8 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
          <Sparkle width={26} height={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-indigo-100">
            AI Pipeline · Song ngữ Anh–Việt
          </p>
          <h2 className="mt-1 font-display text-[21px] font-bold tracking-tight sm:text-[23px]">
            Tạo Lesson Kit mới trong vài phút
          </h2>
          <p className="mt-0.5 hidden max-w-lg text-[13.5px] text-indigo-100 sm:block">
            Từ vựng có IPA, kịch bản giảng dạy hai cột, câu hỏi &amp; đánh giá — tất cả tự động, chuẩn khung chương trình.
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-[12px] bg-white px-5 py-3 text-[14px] font-semibold text-indigo-700 shadow-sm transition-transform group-hover:translate-x-0.5 sm:flex">
          <Plus width={17} height={17} />
          Create Lesson Kit
          <ArrowRight width={17} height={17} />
        </span>
      </button>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-[13px] font-medium text-slate-600">Tìm bài giảng</label>
          <div className="relative">
            <Search width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nhập tên bài giảng..."
              className="w-full rounded-[11px] border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>
        <Combobox label="Subject" value={subject} onChange={setSubject} className="lg:w-44"
          options={opt(["All", "Physics", "Chemistry", "Biology", "Math"])} />
        <Combobox label="Status" value={status} onChange={setStatus} className="lg:w-40"
          options={opt(["All", "Completed", "Generating", "Failed"])} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Lesson Title</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">CEFR</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <tr><td colSpan={8}><SkeletonRow /></td></tr>
                  <tr><td colSpan={8}><SkeletonRow /></td></tr>
                  <tr><td colSpan={8}><SkeletonRow /></td></tr>
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-[14px] text-slate-400">
                    {kits.length === 0
                      ? "Chưa có Lesson Kit nào. Bấm nút Create để tạo!"
                      : "Không có bài giảng nào khớp với bộ lọc hiện tại."}
                  </td>
                </tr>
              ) : (
                filtered.map((k) => (
                  <tr
                    key={k._id}
                    onClick={() => onOpenKit(k._id)}
                    className="cursor-pointer border-b border-slate-100 text-[13.5px] transition-colors last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">{k.lesson_topic}</td>
                    <td className="px-4 py-3.5">
                      <SubjectBadge subject={SUBJECT_DISPLAY[k.subject] || k.subject} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">Lớp {k.grade}</td>
                    <td className="px-4 py-3.5 text-slate-600">{k.duration} phút</td>
                    <td className="px-4 py-3.5"><CefrPill level={k.support_level} /></td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={capitalizeStatus(k.status)} /></td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        onView={() => onOpenKit(k._id)}
                        onDelete={() => handleDelete(k._id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
