import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Combobox, SubjectBadge, CefrPill, StatusBadge, Card, SkeletonRow, ConfirmModal, toast } from "../components/ui";
import { Dots, Eye, Plus, Refresh, Search, Trash } from "../components/icons";


import { getKitList, deleteKit } from "../lib/api";
import type { LessonKitListItem } from "../lib/types";

const SUBJECT_DISPLAY: Record<string, string> = {
  VAT_LI: "Vật lí",
  HOA_HOC: "Hóa học",
  SINH_HOC: "Sinh học",
  TOAN: "Toán",
};

const SUBJECT_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "Vật lí", label: "Vật lí" },
  { value: "Hóa học", label: "Hóa học" },
  { value: "Sinh học", label: "Sinh học" },
  { value: "Toán", label: "Toán" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "completed", label: "Hoàn thành" },
  { value: "generating", label: "Đang tạo" },
  { value: "failed", label: "Thất bại" },
];

function formatDateTime(iso: string) {
  if (!iso) return { date: "-", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "-", time: "" };
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
  };
}

function RowMenu({ onView, onDelete }: { onView: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const right = Math.max(12, window.innerWidth - rect.right);

    if (spaceBelow < 120) {
      // Not enough space below (e.g. bottom row) -> open upwards
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        right,
      });
    } else {
      // Plenty of space below -> open downwards
      setCoords({
        top: rect.bottom + 6,
        right,
      });
    }
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      updatePosition();
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const items = [
    { label: "Xem", icon: Eye, action: onView },
    { label: "Xóa", icon: Trash, action: onDelete, danger: true },
  ];

  return (
    <div className="flex justify-end">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <Dots />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: `${coords.right}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="lk-fade-up w-40 overflow-hidden rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
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
          </div>,
          document.body,
        )}
    </div>
  );
}

export function Dashboard({
  onOpenKit,
  onCreate,
}: {
  onOpenKit: (id: string, status?: string) => void;
  onCreate: () => void;
}) {
  const [kits, setKits] = useState<LessonKitListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadKits = useCallback(() => {
    setLoading(true);
    getKitList(1, 50)
      .then(setKits)
      .catch(() => toast("Không thể tải danh sách", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadKits(); }, [loadKits]);

  function handleDelete(id: string) {
    setDeleteTargetId(id);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
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
      kits.filter((k) => {
        const matchQ = !q.trim() || k.lesson_topic.toLowerCase().includes(q.toLowerCase().trim());
        const mappedSubject = SUBJECT_DISPLAY[k.subject] || k.subject;
        const matchSubject = subject === "ALL" || mappedSubject === subject;
        const matchStatus = status === "ALL" || k.status.toLowerCase() === status.toLowerCase();
        return matchQ && matchSubject && matchStatus;
      }),
    [kits, q, subject, status],
  );

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      {/* Dashboard Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold tracking-tight text-slate-900">
            Quản lý bài giảng
          </h1>
          <p className="mt-1 text-[13.5px] text-slate-500">
            Biên soạn và quản lý các bộ học liệu song ngữ theo khung chương trình phổ thông
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-indigo-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all shrink-0"
        >
          <Plus width={16} height={16} strokeWidth={2.4} />
          <span>Tạo bài giảng mới</span>
        </button>
      </div>

      {/* Quick summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[12.5px] font-medium text-slate-500">Tổng số bài giảng</p>
          <p className="mt-1 font-display text-[22px] font-bold text-slate-900">{kits.length}</p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[12.5px] font-medium text-slate-500">Đã hoàn thành</p>
          <p className="mt-1 font-display text-[22px] font-bold text-emerald-600">
            {kits.filter((k) => k.status?.toLowerCase() === "completed").length}
          </p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-[12.5px] font-medium text-slate-500">Đang xử lý</p>
          <p className="mt-1 font-display text-[22px] font-bold text-amber-600">
            {kits.filter((k) => k.status?.toLowerCase() === "generating").length}
          </p>
        </div>
      </div>

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
        <Combobox label="Môn học" value={subject} onChange={setSubject} className="lg:w-44"
          options={SUBJECT_OPTIONS} />
        <Combobox label="Trạng thái" value={status} onChange={setStatus} className="lg:w-44"
          options={STATUS_OPTIONS} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Tên bài giảng</th>
                <th className="px-4 py-3">Môn học</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="px-4 py-3">Thời lượng</th>
                <th className="px-4 py-3">CEFR</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
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
                filtered.map((k) => {
                  const dt = formatDateTime(k.createdAt);
                  return (
                    <tr
                      key={k._id}
                      onClick={() => onOpenKit(k._id, k.status)}
                      className="cursor-pointer border-b border-slate-100 text-[13.5px] transition-colors last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-900">{k.lesson_topic}</td>
                      <td className="px-4 py-3.5">
                        <SubjectBadge subject={SUBJECT_DISPLAY[k.subject] || k.subject} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">Lớp {k.grade}</td>
                      <td className="px-4 py-3.5 text-slate-600">{k.duration} phút</td>
                      <td className="px-4 py-3.5"><CefrPill level={k.support_level} /></td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{dt.date}</div>
                        {dt.time && <div className="text-[11.5px] text-slate-400">{dt.time}</div>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={k.status} /></td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        onView={() => onOpenKit(k._id, k.status)}
                        onDelete={() => handleDelete(k._id)}
                      />
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={!!deleteTargetId}
        title="Xác nhận xóa Lesson Kit"
        message="Bạn có chắc chắn muốn xóa Lesson Kit này không? Dữ liệu đã xóa sẽ không thể khôi phục."
        confirmLabel="Xóa bài giảng"
        cancelLabel="Hủy"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
