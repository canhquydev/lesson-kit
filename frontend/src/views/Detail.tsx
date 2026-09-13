import { useEffect, useState, useMemo, type ComponentType } from "react"

import {
  Card,
  CefrPill,
  SubjectBadge,
  Tabs,
  Skeleton,
  ConfirmModal,
  toast,
} from "../components/ui"

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Refresh,
  Search,
  Trash,
  AlertCircle,
  AlertTriangle,
} from "../components/icons"

import { MathText } from "../components/MathText"

import {
  getKitDetail,
  deleteKit,
  regenerateComponent,
  regenerateAllStale,
} from "../lib/api"

import { navigateTo } from "../lib/router"

import type {
  LessonKitDetail,
  Vocabulary,
  Expression,
  Activity,
  TeachingScript,
  StudentQuestion,
  Assessment,
} from "../lib/types"

const SUBJECT_DISPLAY: Record<string, string> = {
  VAT_LI: "Vật lí",

  HOA_HOC: "Hóa học",

  SINH_HOC: "Sinh học",

  TOAN: "Toán",
}

const ACTIVITY_TYPE_DISPLAY: Record<string, string> = {
  "think-pair-share": "Chia sẻ cặp đôi",

  matching: "Nối ghép thẻ",

  "role-play": "Đóng vai",

  quiz: "Đố vui trắc nghiệm",

  discussion: "Thảo luận",

  "hỏi đáp": "Hỏi đáp",

  "problem solving": "Giải quyết vấn đề",

  game: "Trò chơi",

  presentation: "Thuyết trình",

  "practice task": "Luyện tập thực hành",
}

const GROUP_TYPE_DISPLAY: Record<string, string> = {
  individual: "Cá nhân",

  pair: "Theo cặp",

  group: "Theo nhóm",

  whole_class: "Cả lớp",
}

const CATEGORY_DISPLAY: Record<string, string> = {
  opening: "Mở đầu buổi học",

  content_intro: "Giới thiệu bài giảng",

  instruction: "Hướng dẫn hoạt động",

  questioning: "Đặt câu hỏi",

  comprehension_check: "Kiểm tra độ hiểu",

  encouragement: "Khích lệ, động viên",

  transition: "Chuyển tiếp nội dung",

  closing: "Tổng kết, kết thúc",
}

const POS_DISPLAY: Record<string, string> = {
  noun: "Danh từ",

  verb: "Động từ",

  adjective: "Tính từ",

  adverb: "Trạng từ",

  phrase: "Cụm từ",

  preposition: "Giới từ",

  conjunction: "Liên từ",
}

const TABS = [
  "Từ vựng",

  "Mẫu câu",

  "Hoạt động",

  "Kịch bản bài giảng",

  "Câu hỏi học sinh",

  "Đánh giá",
]

function formatDate(iso: string) {
  if (!iso) return "-"

  const d = new Date(iso)

  if (isNaN(d.getTime())) return "-"

  const day = String(d.getDate()).padStart(2, "0")

  const month = String(d.getMonth() + 1).padStart(2, "0")

  const year = d.getFullYear()

  const hours = String(d.getHours()).padStart(2, "0")

  const minutes = String(d.getMinutes()).padStart(2, "0")

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function ActionBtn({
  icon: Icon,

  label,

  primary,

  danger,

  warning,

  onClick,

  loading: isLoading,

  disabled,
}: {
  icon: ComponentType<{ width?: number height?: number className?: string }>

  label: string

  primary?: boolean

  danger?: boolean

  warning?: boolean

  onClick?: () => void

  loading?: boolean

  disabled?: boolean
}) {
  const cls = warning
    ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-600/25"
    : primary
      ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/25"
      : danger
        ? "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200"
        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"

  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all disabled:opacity-50 ${cls}`}
    >
      {isLoading ? (
        <span className="lk-spin h-3.5 w-3.5 rounded-full border-2 border-current/30 border-t-current" />
      ) : (
        <Icon width={15} height={15} />
      )}
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}

// ─── Tab Components ───────────────────────────────────────────────

function ExpressionsTab({ data }: { data: Expression[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, {
      category: string
      label: string
      items: Expression[]
    }>()

    for (const item of data) {
      const catKey = (item.category || "other").toLowerCase()

      const label = CATEGORY_DISPLAY[catKey] || item.category || "Khác"

      if (!map.has(catKey)) {
        map.set(catKey, { category: item.category, label, items: [] })
      }

      map.get(catKey)!.items.push(item)
    }

    return Array.from(map.values())
  }, [data])

  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[14px] text-slate-400">
        Chưa có mẫu câu nào cho bài giảng này.
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5">
      {groups.map((group, groupIdx) => (
        <div
          key={group.category || groupIdx}
          className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-xs"
        >
          {/* Category Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 font-mono text-[12px] font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200/60">
                {groupIdx + 1}
              </span>
              <h4 className="text-[14.5px] font-bold text-slate-800">
                {group.label}
              </h4>
            </div>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
              {group.items.length} mẫu câu
            </span>
          </div>

          {/* List of expressions */}
          <div className="divide-y divide-slate-100">
            {group.items.map((e, idx) => (
              <div
                key={e._id || idx}
                className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] font-semibold text-slate-500">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-relaxed text-slate-900">
                    <MathText text={e.expression_en} />
                  </p>
                  <p className="mt-1 text-[13.5px] font-normal leading-relaxed text-slate-600">
                    <MathText text={e.translation_vi} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Parse an instruction string into individual steps.
 * Handles both "\n"-separated steps and inline "1. ... 2. ..." patterns.
 */

function parseInstructionSteps(text: string): string[] {
  if (!text.trim()) return []

  // First try splitting by newlines

  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length > 1) return lines

  // Fallback: split inline numbered steps like "1. xxx 2. yyy 3. zzz"

  const stepRegex = /(?:^|\s)(\d+)\.\s/g

  const positions: number[] = []

  let m: RegExpExecArray | null

  while ((m = stepRegex.exec(text)) !== null) {
    positions.push(m.index === 0 ? 0 : m.index + 1)
  }

  if (positions.length > 1) {
    const steps: string[] = []

    for (let j = 0; j < positions.length; j++) {
      const start = positions[j]

      const end = j + 1 < positions.length ? positions[j + 1] : text.length

      const step = text
        .slice(start, end)
        .trim()
        .replace(/\.\s*$/, ".")

      if (step) steps.push(step)
    }

    return steps
  }

  return [text.trim()]
}

function ActivitiesTab({ data }: { data: Activity[] }) {
  const [openViIds, setOpenViIds] = useState<Record<string, boolean>>({})

  const allViOpen =
    data.length > 0 && data.every((a, i) => openViIds[a._id || i])

  const toggleAllVi = () => {
    if (allViOpen) {
      setOpenViIds({})
    } else {
      const next: Record<string, boolean> = {}

      data.forEach((a, i) => {
        next[a._id || i] = true
      })

      setOpenViIds(next)
    }
  }

  const toggleOneVi = (id: string | number) => {
    setOpenViIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[14px] text-slate-400">
        Chưa có hoạt động nào cho bài giảng này.
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5">
      {/* Utility Bar */}
      <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-4 py-2.5 text-[13px]">
        <span className="font-medium text-slate-600">
          {data.length} hoạt động
        </span>
        <button
          type="button"
          onClick={toggleAllVi}
          className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500"
        >
          {allViOpen ? "Ẩn tất cả tiếng Việt" : "Hiện tất cả tiếng Việt"}
        </button>
      </div>

      {data.map((a, i) => {
        const id = a._id || i

        const isViOpen = !!openViIds[id]

        return (
          <div
            key={a._id || i}
            className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-xs"
          >
            {/* Activity Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 font-mono text-[12px] font-bold text-white shadow-xs">
                  {i + 1}
                </span>
                <h3 className="text-[15.5px] font-bold text-slate-900">
                  {a.activity_name}
                </h3>
              </div>

              {/* Badges / Metadata + VI Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[12.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                  <Clock width={13} height={13} className="text-slate-400" />{" "}
                  {a.duration_minutes} phút
                </span>
                {a.activity_type && (
                  <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-[12.5px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200/60">
                    {ACTIVITY_TYPE_DISPLAY[a.activity_type.toLowerCase()] ||
                      a.activity_type}
                  </span>
                )}
                {a.group_type && (
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[12.5px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/60">
                    {GROUP_TYPE_DISPLAY[a.group_type.toLowerCase()] ||
                      a.group_type}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleOneVi(id)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    isViOpen
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="font-mono text-[10.5px] font-bold">
                    {isViOpen ? "VI ON" : "VI"}
                  </span>
                  <span>{isViOpen ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}</span>
                  <ChevronDown
                    width={13}
                    height={13}
                    className={`transition-transform duration-200 ${
                      isViOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* 1. Merged: Mục tiêu hoạt động + Mô tả tổng quan */}
              {(a.objective || a.description) && (
                <div className="rounded-[12px] border border-emerald-200/70 bg-emerald-50/40 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Mục tiêu & Tổng quan
                  </p>
                  {a.objective && (
                    <p className="text-[13.5px] leading-relaxed text-slate-800">
                      <span className="font-semibold text-emerald-700">
                        Mục tiêu:{" "}
                      </span>
                      <MathText text={a.objective} />
                    </p>
                  )}
                  {a.description && (
                    <p
                      className={`text-[13.5px] leading-relaxed text-slate-700 ${
                        a.objective ? "mt-2" : ""
                      }`}
                    >
                      <span className="font-semibold text-slate-600">
                        Mô tả:{" "}
                      </span>
                      <MathText text={a.description} />
                    </p>
                  )}
                </div>
              )}

              {/* 2. Hướng dẫn chi tiết: EN primary + collapsible VI */}
              {(() => {
                const instEn =
                  a.instructions_en || (a as any).english_instructions

                const instVn = a.instructions_vn || (a as any).instructions

                if (!instEn && !instVn) return null

                return (
                  <div className="rounded-[12px] border border-indigo-200/70 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                        EN
                      </span>
                      <p className="text-[11.5px] font-bold uppercase tracking-wide text-indigo-800">
                        Các bước thực hiện chi tiết
                      </p>
                    </div>
                    {instEn && (
                      <ol className="space-y-2 text-[13.5px] leading-relaxed text-indigo-950">
                        {parseInstructionSteps(instEn).map((step, si) => (
                          <li key={si} className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-mono text-[11px] font-bold text-indigo-700">
                              {si + 1}
                            </span>
                            <span className="flex-1 font-medium">
                              <MathText text={step.replace(/^\d+\.\s*/, "")} />
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {/* Collapsible Vietnamese Instructions */}
                    {isViOpen && instVn && (
                      <div className="lk-fade-up mt-4 rounded-[10px] border border-emerald-200/70 bg-emerald-50/40 p-3.5">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] text-white">
                            VI
                          </span>
                          Các bước thực hiện chi tiết (Tiếng Việt)
                        </div>
                        <ol className="space-y-2 text-[13.5px] leading-relaxed text-slate-700">
                          {parseInstructionSteps(instVn).map((step, si) => (
                            <li key={si} className="flex items-start gap-2">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-mono text-[11px] font-bold text-emerald-700">
                                {si + 1}
                              </span>
                              <span className="flex-1">
                                <MathText
                                  text={step.replace(/^\d+\.\s*/, "")}
                                />
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 3. Merged: Nhiệm vụ học sinh + Kết quả mong đợi */}
              {(a.student_task || a.expected_outcome) && (
                <div className="rounded-[12px] border border-amber-200/70 bg-amber-50/40 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-amber-800">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Nhiệm vụ & Kết quả mong đợi
                  </p>
                  {a.student_task && (
                    <p className="text-[13.5px] leading-relaxed text-slate-700">
                      <span className="font-semibold text-amber-700">
                        Nhiệm vụ HS:{" "}
                      </span>
                      <MathText text={a.student_task} />
                    </p>
                  )}
                  {a.expected_outcome && (
                    <p
                      className={`text-[13.5px] leading-relaxed text-slate-700 ${
                        a.student_task ? "mt-2" : ""
                      }`}
                    >
                      <span className="font-semibold text-blue-700">
                        Kết quả mong đợi:{" "}
                      </span>
                      <MathText text={a.expected_outcome} />
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QATab({ data }: { data: StudentQuestion[] }) {
  const [openVi, setOpenVi] = useState<Record<string, boolean>>({})

  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>(
    {},
  )

  const allViOpen =
    data.length > 0 && data.every((item, i) => openVi[item._id || i])

  const toggleAllVi = () => {
    if (allViOpen) {
      setOpenVi({})
    } else {
      const next: Record<string, boolean> = {}

      data.forEach((item, i) => {
        next[item._id || i] = true
      })

      setOpenVi(next)
    }
  }

  const toggleVi = (id: string) => {
    setOpenVi((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleCard = (id: string) => {
    setCollapsedCards((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[14px] text-slate-400">
        Chưa có câu hỏi học sinh nào cho bài giảng này.
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5">
      {/* Utility Bar */}
      <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-4 py-2.5 text-[13px]">
        <span className="font-medium text-slate-600">
          {data.length} câu hỏi học sinh
        </span>
        <button
          type="button"
          onClick={toggleAllVi}
          className="cursor-pointer font-medium text-indigo-600 transition-colors hover:text-indigo-500"
        >
          {allViOpen ? "Ẩn tất cả tiếng Việt" : "Hiện tất cả tiếng Việt"}
        </button>
      </div>

      {data.map((item, i) => {
        const id = item._id || String(i)

        const isCollapsed = !!collapsedCards[id]

        const isViOpen = !!openVi[id]

        return (
          <div
            key={id}
            className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
          >
            {/* Question Header (Clickable to collapse/expand answer) */}
            <div
              onClick={() => toggleCard(id)}
              className="flex cursor-pointer items-start justify-between gap-3 bg-white p-4.5 transition-colors hover:bg-slate-50/60"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-[11px] font-bold text-white shadow-xs">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14.5px] font-bold leading-snug text-slate-900">
                    <MathText text={item.question_en} />
                  </h4>
                  <p className="mt-1 text-[13px] font-normal leading-snug text-slate-600">
                    <MathText text={item.question_vi} />
                  </p>
                </div>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-2">
                <span className="hidden text-[12px] font-medium text-slate-400 sm:inline">
                  {isCollapsed ? "Xem câu trả lời" : "Thu gọn"}
                </span>
                <div
                  className={`p-1 text-slate-400 transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                >
                  <ChevronDown width={16} height={16} />
                </div>
              </div>
            </div>

            {/* Answer Section */}
            {!isCollapsed && (
              <div className="space-y-3.5 border-t border-slate-100 bg-slate-50/40 p-4.5">
                {/* English Answer Box */}
                <div className="rounded-[12px] border border-indigo-100/80 bg-white p-4 shadow-xs">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 font-mono text-[10px] text-white">
                        EN
                      </span>
                      Gợi ý trả lời cho giáo viên
                    </span>

                    {/* Toggle Vietnamese button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()

                        toggleVi(id)
                      }}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        isViOpen
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="font-mono text-[10.5px] font-bold">
                        {isViOpen ? "VI ON" : "VI"}
                      </span>
                      <span>
                        {isViOpen ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}
                      </span>
                      <ChevronDown
                        width={13}
                        height={13}
                        className={`transition-transform duration-200 ${
                          isViOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[14px] font-medium leading-relaxed text-slate-800">
                    <MathText text={item.suggested_answer_en} />
                  </p>
                </div>

                {/* Vietnamese Translation Box */}
                {isViOpen && (
                  <div className="lk-fade-up rounded-[12px] border border-emerald-200/70 bg-emerald-50/40 p-4">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] text-white">
                        VI
                      </span>
                      Bản dịch tiếng Việt
                    </div>
                    <p className="text-[13.5px] font-normal leading-relaxed text-slate-700">
                      <MathText text={item.suggested_answer_vi} />
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function parseNumberedItems(str: string): string[] {
  const cleaned = str

    .replace(
      /^(?:\[?Column\s*(?:A|1|I)\]?|\[?Cột\s*(?:A|1|I)\]?|\[?Group\s*(?:A|1|I)\]?)[\s:.-]*/i,
      "",
    )

    .trim()

  // 1. Try line-by-line

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const lineMatches: string[] = []

  for (const line of lines) {
    if (/^\(?\d+[.)]/.test(line)) {
      lineMatches.push(line)
    } else if (lineMatches.length > 0) {
      lineMatches[lineMatches.length - 1] += " " + line
    }
  }

  if (lineMatches.length >= 2) return lineMatches

  // 2. Fallback regex for single line: match items starting with digits

  const regexMatches = cleaned.match(
    /(?:^|\s)(?:\(?\d+[.)])\s+[\s\S]*?(?=(?:\s\(?\d+[.)]\s+)|$)/g,
  )

  if (regexMatches && regexMatches.length >= 2) {
    return regexMatches.map((s) => s.trim())
  }

  return []
}

function parseLetteredItems(str: string): string[] {
  const cleaned = str

    .replace(
      /^(?:\[?Column\s*(?:B|2|II)\]?|\[?Cột\s*(?:B|2|II)\]?|\[?Group\s*(?:B|2|II)\]?)[\s:.-]*/i,
      "",
    )

    .trim()

  // 1. Try line-by-line: strictly letter a-h

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const lineMatches: string[] = []

  for (const line of lines) {
    if (/^(?:\([a-hA-H]\)|[a-hA-H][.)])\s+/.test(line)) {
      lineMatches.push(line)
    } else if (lineMatches.length > 0) {
      lineMatches[lineMatches.length - 1] += " " + line
    }
  }

  if (lineMatches.length >= 2) return lineMatches

  // 2. Fallback regex for single line: strictly letter a-h to avoid word endings like "kilograms."

  const regexMatches = cleaned.match(
    /(?:^|\s)(?:\([a-hA-H]\)|[a-hA-H][.)])\s+[\s\S]*?(?=(?:\s(?:\([a-hA-H]\)|[a-hA-H][.)])\s+)|$)/g,
  )

  if (regexMatches && regexMatches.length >= 2) {
    return regexMatches.map((s) => s.trim())
  }

  return []
}

function parseMatchingQuestion(
  text?: string,
): {
  prompt: string

  leftItems: string[]

  rightItems: string[]
} | null {
  if (!text) return null

  let prompt = ""

  let colAStr = ""

  let colBStr = ""

  // Strategy 1: Check for explicit [COLUMN_A] / [COLUMN_B] tags (New standard)

  const tagAIdx = text.search(
    /\[(?:COLUMN[_\s-]?A|CỘT[_\s-]?A|GROUP[_\s-]?A)\]/i,
  )

  const tagBIdx = text.search(
    /\[(?:COLUMN[_\s-]?B|CỘT[_\s-]?B|GROUP[_\s-]?B)\]/i,
  )

  if (tagAIdx !== -1 && tagBIdx !== -1 && tagAIdx < tagBIdx) {
    const rawPrompt = text.slice(0, tagAIdx).trim()

    prompt = rawPrompt
      .replace(/^\[(?:INSTRUCTION|PROMPT|CÂU[_\s-]?HỎI)\]\s*/i, "")
      .trim()

    const matchA = text
      .slice(tagAIdx)
      .match(/\[(?:COLUMN[_\s-]?A|CỘT[_\s-]?A|GROUP[_\s-]?A)\]\s*/i)

    const aContentStart = tagAIdx + (matchA ? matchA[0].length : 0)

    colAStr = text.slice(aContentStart, tagBIdx).trim()

    const matchB = text
      .slice(tagBIdx)
      .match(/\[(?:COLUMN[_\s-]?B|CỘT[_\s-]?B|GROUP[_\s-]?B)\]\s*/i)

    const bContentStart = tagBIdx + (matchB ? matchB[0].length : 0)

    colBStr = text.slice(bContentStart).trim()
  } else {
    // Strategy 2: Legacy fallback - look for Column B marker.

    // Pick the LAST occurrence to avoid matching "Column B" inside the prompt sentence!

    const colBMatches = Array.from(
      text.matchAll(
        /(?:\r?\n|:\s*|^)\s*(?:Column\s*(?:B|2|II)|Cột\s*(?:B|2|II)|Group\s*(?:B|2|II)|Set\s*(?:B|2|II)|Part\s*(?:B|2|II))[\s:.-]*/gi,
      ),
    )

    let chosenColBMatch = null

    if (colBMatches.length > 0) {
      chosenColBMatch = colBMatches[colBMatches.length - 1]
    } else {
      const directColB = text.match(
        /(?:Column\s*(?:B|2|II)|Cột\s*(?:B|2|II)|Group\s*(?:B|2|II))[\s:.-]*/i,
      )

      if (directColB && directColB.index !== undefined) {
        chosenColBMatch = directColB
      }
    }

    if (chosenColBMatch && chosenColBMatch.index !== undefined) {
      const splitIndex =
        chosenColBMatch.index +
        (chosenColBMatch[0].startsWith("\n") ||
        chosenColBMatch[0].startsWith("\r") ||
        chosenColBMatch[0].startsWith(":")
          ? 1
          : 0)

      const leftPart = text.slice(0, splitIndex).trim()

      colBStr = text
        .slice(chosenColBMatch.index + chosenColBMatch[0].length)
        .trim()

      // In leftPart, find Column A marker

      const colAMatches = Array.from(
        leftPart.matchAll(
          /(?:\r?\n|:\s*|^)\s*(?:Column\s*(?:A|1|I)|Cột\s*(?:A|1|I)|Group\s*(?:A|1|I)|Set\s*(?:A|1|I)|Part\s*(?:A|1|I))[\s:.-]*/gi,
        ),
      )

      if (colAMatches.length > 0) {
        const lastColA = colAMatches[colAMatches.length - 1]

        prompt = leftPart.slice(0, lastColA.index).trim()

        colAStr = leftPart.slice(lastColA.index + lastColA[0].length).trim()
      } else {
        const firstNum = leftPart.match(/(?:\r?\n|^|:\s*)\s*(\d+[.)]\s+.*)/)

        if (firstNum && firstNum.index !== undefined) {
          prompt = leftPart.slice(0, firstNum.index).trim()

          colAStr = leftPart.slice(firstNum.index).trim()
        } else {
          colAStr = leftPart
        }
      }
    } else {
      // Check for arrow separators

      const arrowMatch = text.match(/\s*(?:→|->|=>|–>|\|)\s*/)

      if (arrowMatch && arrowMatch.index !== undefined) {
        colAStr = text.slice(0, arrowMatch.index).trim()

        colBStr = text.slice(arrowMatch.index + arrowMatch[0].length).trim()
      } else {
        const letterMatch = text.match(
          /(?:\r?\n|^)\s*(?:[a-dA-D][.)]|\([a-dA-D]\))\s+/,
        )

        if (letterMatch && letterMatch.index !== undefined) {
          colAStr = text.slice(0, letterMatch.index).trim()

          colBStr = text.slice(letterMatch.index).trim()
        } else {
          return null
        }
      }
    }
  }

  // Clean prompt trailing headers

  prompt = prompt

    .replace(/^\[(?:INSTRUCTION|PROMPT|CÂU[_\s-]?HỎI)\]\s*/i, "")

    .replace(
      /(?:Column\s*(?:A|1|I)|Cột\s*(?:A|1|I)|Group\s*(?:A|1|I))[\s:.-]*$/i,
      "",
    )

    .replace(/[:\s]+$/, "")

    .trim()

  const leftItems = parseNumberedItems(colAStr)

  const rightItems = parseLetteredItems(colBStr)

  if (leftItems.length > 0 && rightItems.length > 0) {
    return {
      prompt: prompt ? prompt + ":" : "Nối các mục tương ứng ở hai cột:",

      leftItems,

      rightItems,
    }
  }

  return null
}

function AssessmentsTab({ data }: { data: Assessment[] }) {
  const [openViIds, setOpenViIds] = useState<Record<string, boolean>>({})

  const hasAnyVi = data.some(
    (a) => a.explanation_vn || (a as any).explanation_vi,
  )

  const allViOpen =
    data.length > 0 && data.every((a, i) => openViIds[a._id || i])

  const toggleAllVi = () => {
    if (allViOpen) {
      setOpenViIds({})
    } else {
      const next: Record<string, boolean> = {}

      data.forEach((a, i) => {
        next[a._id || i] = true
      })

      setOpenViIds(next)
    }
  }

  const toggleOneVi = (id: string | number) => {
    setOpenViIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-4 py-2.5 text-[13px]">
        <span className="font-medium text-slate-600">
          {data.length} câu hỏi đánh giá
        </span>
        {hasAnyVi && (
          <button
            type="button"
            onClick={toggleAllVi}
            className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500"
          >
            {allViOpen ? "Ẩn tất cả tiếng Việt" : "Hiện tất cả tiếng Việt"}
          </button>
        )}
      </div>
      {data.map((a, i) => {
        const id = a._id || i

        const isViOpen = !!openViIds[id]

        const matchingData =
          a.question_type === "matching"
            ? parseMatchingQuestion(a.question_text)
            : null

        const explanationEn = a.explanation_en || a.explanation

        const explanationVn = a.explanation_vn || (a as any).explanation_vi

        return (
          <div
            key={a._id || i}
            className="rounded-[13px] border border-slate-200 p-4 bg-white shadow-2xs"
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11.5px] font-semibold text-violet-700">
                {a.question_type === "multiple_choice"
                  ? "Trắc nghiệm"
                  : a.question_type === "true_false"
                    ? "Đúng/Sai"
                    : a.question_type === "short_answer"
                      ? "Tự luận ngắn"
                      : a.question_type === "matching"
                        ? "Nối cột"
                        : a.question_type}
              </span>

              {explanationVn && (
                <button
                  type="button"
                  onClick={() => toggleOneVi(id)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    isViOpen
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="font-mono text-[10.5px] font-bold">
                    {isViOpen ? "VI ON" : "VI"}
                  </span>
                  <span>{isViOpen ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}</span>
                  <ChevronDown
                    width={13}
                    height={13}
                    className={`transition-transform duration-200 ${
                      isViOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            {matchingData ? (
              <div>
                <p className="text-[14px] font-medium text-slate-900">
                  <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                  <MathText text={matchingData.prompt} />
                </p>
                <div className="my-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Column A */}
                  <div className="rounded-[12px] border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Cột 1 (Hiện tượng / Khái niệm)
                    </div>
                    <ul className="space-y-2">
                      {matchingData.leftItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 rounded-[9px] border border-slate-200/80 bg-white p-2.5 text-[13.5px] font-medium text-slate-800 shadow-2xs"
                        >
                          <MathText text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column B */}
                  <div className="rounded-[12px] border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Cột 2 (Nguyên nhân / Định nghĩa)
                    </div>
                    <ul className="space-y-2">
                      {matchingData.rightItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 rounded-[9px] border border-slate-200/80 bg-white p-2.5 text-[13.5px] font-medium text-slate-800 shadow-2xs"
                        >
                          <MathText text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[14px] font-medium text-slate-900">
                <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                <MathText text={a.question_text} />
              </p>
            )}

            {a.options && a.options.length > 0 && (
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {a.options.map((o, oi) => {
                  const cleanAns = (a.correct_answer || "").trim()

                  const optTrimmed = o.trim()

                  const letterMatch = cleanAns.match(
                    /^[(\[]?([A-Za-z0-9]+)[)\]]?$/,
                  )

                  const ansKey = letterMatch
                    ? letterMatch[1].toUpperCase()
                    : null

                  const isLetterMatch = ansKey
                    ? new RegExp(`^\\(?${ansKey}[).\\s]`, "i").test(
                        optTrimmed,
                      ) || optTrimmed.toUpperCase() === ansKey
                    : false

                  const correct =
                    isLetterMatch ||
                    optTrimmed === cleanAns ||
                    optTrimmed.startsWith(cleanAns + ".") ||
                    optTrimmed.startsWith(cleanAns + " ")

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
                          correct
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {correct ? (
                          <Check width={13} height={13} strokeWidth={2.6} />
                        ) : (
                          String.fromCharCode(65 + oi)
                        )}
                      </span>
                      <MathText text={o} />
                    </li>
                  )
                })}
              </ul>
            )}

            {(!a.options || a.options.length === 0) && a.correct_answer && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[13px] font-medium text-emerald-900">
                <Check
                  width={14}
                  height={14}
                  strokeWidth={2.5}
                  className="text-emerald-600 shrink-0"
                />
                <span>
                  {a.question_type === "matching" ? (
                    <>
                      Đáp án nối đúng:{" "}
                      <strong className="font-mono text-[13.5px] text-emerald-700">
                        {a.correct_answer}
                      </strong>
                    </>
                  ) : (
                    <>
                      Gợi ý đáp án:{" "}
                      <strong className="text-[13.5px] text-emerald-700">
                        <MathText text={a.correct_answer} />
                      </strong>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Explanations (English & expandable Vietnamese) */}
            {(explanationEn || (isViOpen && explanationVn)) && (
              <div className="mt-3 space-y-2">
                {explanationEn && (
                  <div className="rounded-[9px] border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-[12.5px] text-slate-600">
                    <span className="font-semibold text-slate-700">
                      Giải thích (EN):{" "}
                    </span>
                    <MathText text={explanationEn} />
                  </div>
                )}
                {isViOpen && explanationVn && (
                  <div className="lk-fade-up rounded-[10px] border border-emerald-200/70 bg-emerald-50/40 p-3 text-[12.5px] text-emerald-950">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                      <span className="rounded bg-emerald-600 px-1.5 py-0.2 font-mono text-[10px] text-white">
                        VI
                      </span>
                      Giải thích tiếng Việt
                    </div>
                    <p className="leading-relaxed text-slate-700">
                      <MathText text={explanationVn} />
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScriptTab({ data }: { data: TeachingScript[] }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  const allOpen = data.length > 0 && data.every((s, i) => openIds[s._id || i])

  const toggleAll = () => {
    if (allOpen) {
      setOpenIds({})
    } else {
      const next: Record<string, boolean> = {}

      data.forEach((s, i) => {
        next[s._id || i] = true
      })

      setOpenIds(next)
    }
  }

  const toggleOne = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[14px] text-slate-400">
        Chưa có kịch bản giảng dạy cho bài giảng này.
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5">
      {/* Utility Bar */}
      <div className="flex items-center justify-between rounded-[11px] bg-slate-50 px-4 py-2.5 text-[13px]">
        <span className="font-medium text-slate-600">
          {data.length} bước giảng dạy
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500"
        >
          {allOpen ? "Ẩn tất cả tiếng Việt" : "Hiện tất cả tiếng Việt"}
        </button>
      </div>

      {data.map((s, i) => {
        const id = s._id || String(i)

        const isOpen = !!openIds[id]

        const stepNum = s.step_order ?? s.step_number ?? i + 1

        const stepTitle =
          s.activity_name ?? s.step_title ?? `Hoạt động ${stepNum}`

        return (
          <div
            key={id}
            className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm"
          >
            {/* Step Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 font-mono text-[11.5px] font-semibold text-white">
                  {stepNum}
                </span>
                <span className="text-[14.5px] font-bold text-slate-800">
                  Bước {stepNum}: {stepTitle}
                </span>
                {s.duration_minutes && (
                  <span className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[12px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
                    <Clock width={13} height={13} /> {s.duration_minutes} phút
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleOne(id)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  isOpen
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="font-mono text-[10.5px] font-bold">
                  {isOpen ? "VI ON" : "VI"}
                </span>
                <span>{isOpen ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}</span>
                <ChevronDown
                  width={14}
                  height={14}
                  className={`transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Primary English Content */}
            <div className="p-5">
              {s.objective && (
                <div className="mb-3.5 rounded-[11px] border border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5 text-[13px] text-indigo-950">
                  <span className="font-semibold text-indigo-700">
                    Mục tiêu:{" "}
                  </span>
                  <MathText text={s.objective} />
                </div>
              )}

              {/* Hành động của giáo viên */}
              {s.teacher_action && (
                <div className="rounded-[12px] border border-amber-200/70 bg-amber-50/30 p-3.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                      GV
                    </span>{" "}
                    Hành động của giáo viên
                  </p>
                  <div className="text-[13.5px] leading-relaxed text-slate-800">
                    <MathText text={s.teacher_action} />
                  </div>
                </div>
              )}

              {/* Lời giảng của giáo viên (EN) */}
              {s.teacher_speech_en && (
                <div className="mt-3 rounded-[12px] border border-indigo-200/70 bg-indigo-50/25 p-3.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-800">
                      EN
                    </span>{" "}
                    Lời giảng của giáo viên
                  </p>
                  <div className="text-[14px] font-medium leading-relaxed text-slate-900">
                    <MathText text={s.teacher_speech_en} />
                  </div>
                </div>
              )}

              {/* Expandable Vietnamese Support (chỉ hiển thị khi click hỗ trợ tiếng Việt) */}
              {isOpen && s.teacher_speech_vi && (
                <div className="lk-fade-up mt-3 rounded-[12px] border border-emerald-200/70 bg-emerald-50/25 p-3.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      VI
                    </span>{" "}
                    Hỗ trợ tiếng Việt
                  </p>
                  <div className="text-[14px] leading-relaxed text-slate-800">
                    <MathText text={s.teacher_speech_vi} />
                  </div>
                </div>
              )}

              {/* Dự kiến phản hồi của học sinh (ở cuối cùng) */}
              {s.expected_student_response && (
                <div className="mt-3 rounded-[12px] border border-sky-200/70 bg-sky-50/30 p-3.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-800">
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-800">
                      HS
                    </span>{" "}
                    Dự kiến phản hồi của học sinh
                  </p>
                  <div className="text-[13.5px] leading-relaxed text-slate-800">
                    <MathText text={s.expected_student_response} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VocabTab({ data }: { data: Vocabulary[] }) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-[14px] text-slate-400">
        Chưa có từ vựng nào cho bài giảng này.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto p-5">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 whitespace-nowrap">Từ vựng</th>
            <th className="px-4 py-3 whitespace-nowrap">Phiên âm IPA</th>
            <th className="px-4 py-3 whitespace-nowrap">Loại từ</th>
            <th className="px-4 py-3">Nghĩa</th>
            <th className="px-4 py-3">Ví dụ</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v) => (
            <tr
              key={v._id}
              className="border-b border-slate-100 align-top text-[13.5px] last:border-0 hover:bg-slate-50/50 transition-colors"
            >
              <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                {v.word}
              </td>
              <td className="px-4 py-3.5 font-mono text-[12.5px] text-indigo-600 whitespace-nowrap">
                {v.phonetic}
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <span className="inline-block whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-600">
                  {POS_DISPLAY[v.part_of_speech?.toLowerCase()] ||
                    v.part_of_speech}
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-600">
                <span className="text-slate-900 font-medium">
                  <MathText text={v.meaning_vi} />
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-800 leading-relaxed">
                <MathText
                  text={(v.example_sentence || "").replace(
                    /^["'“](.*)["'”]$/,
                    "$1",
                  )}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Detail Page ──────────────────────────────────────────────────

const COMPONENT_MAP: Record<string, string> = {
  "Từ vựng": "vocabulary",

  "Mẫu câu": "expressions",

  "Hoạt động": "activities",

  "Kịch bản bài giảng": "script",

  "Kịch bản giảng": "script",

  "Câu hỏi học sinh": "questions",

  "Câu hỏi HS": "questions",

  "Đánh giá": "assessment",
}

const COMPONENT_TO_TAB: Record<string, string> = {
  vocabulary: "Từ vựng",

  expressions: "Mẫu câu",

  activities: "Hoạt động",

  script: "Kịch bản bài giảng",

  questions: "Câu hỏi học sinh",

  assessment: "Đánh giá",
}

export function Detail({
  kitId,

  initialTab,

  onBack,

  onTabChange,
}: {
  kitId: string

  initialTab?: string

  onBack: () => void

  onTabChange?: (tab: string) => void
}) {
  const [kit, setKit] = useState<LessonKitDetail | null>(null)

  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState(() => {
    if (initialTab && TABS.includes(initialTab)) return initialTab

    const saved = localStorage.getItem(`kit_${kitId}_tab`)

    if (saved === "Câu hỏi HS") return "Câu hỏi học sinh"

    if (saved && TABS.includes(saved)) return saved

    return TABS[0]
  })

  const [regenerating, setRegenerating] = useState(false)

  const [regeneratingAll, setRegeneratingAll] = useState(false)

  const [deleting, setDeleting] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const tabCounts = useMemo<Record<string, number>>(
    () => ({
      "Từ vựng": kit?.vocabularies?.length ?? 0,

      "Mẫu câu": kit?.classroom_expressions?.length ?? 0,

      "Hoạt động": kit?.activities?.length ?? 0,

      "Kịch bản bài giảng": kit?.teaching_scripts?.length ?? 0,

      "Câu hỏi học sinh": kit?.student_questions?.length ?? 0,

      "Đánh giá": kit?.assessments?.length ?? 0,
    }),
    [kit],
  )

  const [dismissedTabs, setDismissedTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`kit_${kitId}_dismissed_stale`)

      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const handleDismissStale = (tabName: string) => {
    setDismissedTabs((prev) => {
      if (prev.includes(tabName)) return prev

      const next = [...prev, tabName]

      try {
        localStorage.setItem(
          `kit_${kitId}_dismissed_stale`,
          JSON.stringify(next),
        )
      } catch {}

      return next
    })
  }

  const staleTabs = useMemo(() => {
    if (!kit?.stale_components || !Array.isArray(kit.stale_components))
      return []

    return kit.stale_components

      .map((c) => COMPONENT_TO_TAB[c])

      .filter(Boolean)

      .filter((t) => !dismissedTabs.includes(t)) as string[]
  }, [kit?.stale_components, dismissedTabs])

  const isCurrentTabStale = staleTabs.includes(tab)

  useEffect(() => {
    const target = initialTab === "Câu hỏi HS" ? "Câu hỏi học sinh" : initialTab

    if (target && TABS.includes(target) && target !== tab) {
      setTab(target)
    }
  }, [initialTab])

  const handleTabChange = (newTab: string) => {
    setTab(newTab)

    localStorage.setItem(`kit_${kitId}_tab`, newTab)

    onTabChange?.(newTab)
  }

  useEffect(() => {
    setLoading(true)

    getKitDetail(kitId)

      .then((data) => {
        if (data.status?.toLowerCase() === "generating") {
          navigateTo(`/progress/${kitId}`, true)

          return
        }

        setKit(data)
      })

      .catch(() => toast("Không thể tải chi tiết kit", "error"))

      .finally(() => setLoading(false))
  }, [kitId])

  async function handleRegenerate() {
    const comp = COMPONENT_MAP[tab]

    if (!comp || regeneratingAll) return

    setRegenerating(true)

    toast(`Hệ thống đang tạo lại ${tab}, vui lòng đợi giây lát...`, "info")

    try {
      await regenerateComponent(kitId, comp)

      const updated = await getKitDetail(kitId)

      setKit(updated)

      setDismissedTabs((prev) => {
        const next = prev.filter((t) => t !== tab)

        try {
          localStorage.setItem(
            `kit_${kitId}_dismissed_stale`,
            JSON.stringify(next),
          )
        } catch {}

        return next
      })

      toast(`Đã tạo lại ${tab} thành công!`, "success")
    } catch (err: any) {
      toast(err?.message || `Tạo lại ${tab} thất bại`, "error")
    } finally {
      setRegenerating(false)
    }
  }

  async function handleRegenerateAllStale() {
    if (regenerating || regeneratingAll) return

    setRegeneratingAll(true)

    const count = staleTabs.length

    toast(`Đang cập nhật toàn bộ ${count} phần theo đúng thứ tự...`, "info")

    try {
      const result = await regenerateAllStale(kitId)

      const updated = await getKitDetail(kitId)

      setKit(updated)

      setDismissedTabs(() => {
        try {
          localStorage.setItem(
            `kit_${kitId}_dismissed_stale`,
            JSON.stringify([]),
          )
        } catch {}

        return []
      })

      if (result.status === "completed") {
        toast(
          `Đã cập nhật toàn bộ ${result.regenerated.length} phần thành công!`,
          "success",
        )
      } else {
        const failedNames = result.failed
          .map((f) => COMPONENT_TO_TAB[f.component] || f.component)
          .join(", ")

        toast(
          `Đã cập nhật ${result.regenerated.length} phần. Lỗi: ${failedNames}`,
          "error",
        )
      }
    } catch (err: any) {
      toast(err?.message || "Cập nhật toàn bộ thất bại", "error")
    } finally {
      setRegeneratingAll(false)
    }
  }

  function handleDelete() {
    setShowDeleteModal(true)
  }

  async function confirmDelete() {
    setShowDeleteModal(false)

    setDeleting(true)

    try {
      await deleteKit(kitId)

      toast("Đã xóa Lesson Kit", "success")

      onBack()
    } catch {
      toast("Xóa thất bại", "error")

      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-8">
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
    )
  }

  if (!kit) {
    return (
      <div className="mx-auto max-w-[1600px] px-6 py-16 text-center">
        <p className="text-[15px] text-slate-500">Không tìm thấy Lesson Kit</p>
        <button
          onClick={onBack}
          className="mt-4 text-indigo-600 hover:text-indigo-500"
        >
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
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
            <SubjectBadge
              subject={SUBJECT_DISPLAY[kit.subject] || kit.subject}
            />
            <span className="flex items-center gap-1">
              <Clock width={14} height={14} /> {kit.duration} phút
            </span>
            <span>·</span>
            <span>Lớp {kit.grade}</span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              CEFR <CefrPill level={kit.support_level} />
            </span>
            {kit.createdAt && (
              <>
                <span>·</span>
                <span>Ngày tạo: {formatDate(kit.createdAt)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {staleTabs.length >= 2 && (
            <ActionBtn
              icon={Refresh}
              label={regeneratingAll ? "Đang cập nhật..." : "Cập nhật toàn bộ"}
              warning
              onClick={handleRegenerateAllStale}
              loading={regeneratingAll}
              disabled={regenerating}
            />
          )}
          <ActionBtn
            icon={Refresh}
            label={`Tạo lại ${tab}`}
            primary={!isCurrentTabStale}
            warning={isCurrentTabStale}
            onClick={handleRegenerate}
            loading={regenerating}
            disabled={regeneratingAll}
          />
          <ActionBtn
            icon={Trash}
            label="Xóa"
            danger
            onClick={handleDelete}
            loading={deleting}
          />
        </div>
      </div>

      {/* Tabs + content */}
      <Card className="overflow-hidden">
        <div className="px-3">
          <Tabs
            tabs={TABS}
            active={tab}
            onChange={handleTabChange}
            staleTabs={staleTabs}
            counts={tabCounts}
          />
        </div>

        {/* ── Stale notification: informational only ────────────── */}
        {isCurrentTabStale && (
          <div className="mx-5 mt-3 flex items-center gap-3 rounded-[10px] border border-amber-200/80 bg-amber-50/50 px-4 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertCircle width={13} height={13} strokeWidth={2.4} />
            </span>
            <p className="flex-1 text-[12.5px] leading-snug text-amber-800">
              <strong>{tab}</strong> có thể chưa đồng bộ với nội dung mới. Nhấn{" "}
              <strong className="text-amber-900">Tạo lại {tab}</strong> ở trên
              để cập nhật.
            </p>
            <button
              type="button"
              onClick={() => handleDismissStale(tab)}
              disabled={regeneratingAll}
              className="shrink-0 rounded-[8px] border border-amber-300/80 bg-white px-3 py-1 text-[12px] font-medium text-amber-800 hover:bg-amber-100/60 transition-colors shadow-2xs disabled:opacity-40"
            >
              Bỏ qua
            </button>
          </div>
        )}
        <div className="lk-fade-up" key={tab}>
          {tab === "Từ vựng" && <VocabTab data={kit.vocabularies ?? []} />}
          {tab === "Mẫu câu" && (
            <ExpressionsTab data={kit.classroom_expressions ?? []} />
          )}
          {tab === "Hoạt động" && <ActivitiesTab data={kit.activities ?? []} />}
          {tab === "Kịch bản bài giảng" && (
            <ScriptTab data={kit.teaching_scripts ?? []} />
          )}
          {(tab === "Câu hỏi học sinh" || tab === "Câu hỏi HS") && (
            <QATab data={kit.student_questions ?? []} />
          )}
          {tab === "Đánh giá" && (
            <AssessmentsTab data={kit.assessments ?? []} />
          )}
        </div>
      </Card>

      <ConfirmModal
        open={showDeleteModal}
        title="Xác nhận xóa Lesson Kit"
        message="Bạn có chắc chắn muốn xóa Lesson Kit này không? Dữ liệu đã xóa sẽ không thể khôi phục."
        confirmLabel="Xóa bài giảng"
        cancelLabel="Hủy"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
