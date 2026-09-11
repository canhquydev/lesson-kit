import { Bell, Plus, Search, Sparkle } from "./icons";

export function TopBar({
  onCreate,
  onHome,
}: {
  onCreate: () => void;
  onHome: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-6">
        <button onClick={onHome} className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <Sparkle width={17} height={17} />
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight text-slate-900">
            LessonKit <span className="text-indigo-600">AI</span>
          </span>
        </button>

        <div className="relative mx-2 hidden max-w-md flex-1 md:block">
          <Search
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Tìm kiếm bài giảng, chủ đề, từ vựng..."
            className="w-full rounded-[10px] border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-[13.5px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <button className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <Bell width={18} height={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
          </button>

          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-[10px] bg-indigo-600 px-3.5 py-2 text-[13.5px] font-semibold text-white shadow-sm shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
          >
            <Plus width={16} height={16} />
            <span className="hidden sm:inline">Tạo Lesson Kit</span>
          </button>

          <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[13px] font-semibold text-white ring-2 ring-white">
            MT
          </button>
        </div>
      </div>
    </header>
  );
}
