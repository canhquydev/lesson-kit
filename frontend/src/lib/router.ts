export type Route =
  | { view: "dashboard" }
  | { view: "create" }
  | { view: "progress"; kitId: string }
  | { view: "detail"; kitId: string; tab?: string };

export const TAB_TO_SLUG: Record<string, string> = {
  "Từ vựng": "tu-vung",
  "Mẫu câu": "mau-cau",
  "Hoạt động": "hoat-dong",
  "Kịch bản bài giảng": "kich-ban",
  "Kịch bản giảng": "kich-ban",
  "Câu hỏi HS": "cau-hoi",
  "Đánh giá": "danh-gia",
};

export const SLUG_TO_TAB: Record<string, string> = {
  "tu-vung": "Từ vựng",
  vocab: "Từ vựng",
  vocabulary: "Từ vựng",
  "mau-cau": "Mẫu câu",
  expressions: "Mẫu câu",
  "hoat-dong": "Hoạt động",
  activities: "Hoạt động",
  "kich-ban": "Kịch bản bài giảng",
  script: "Kịch bản bài giảng",
  "cau-hoi": "Câu hỏi HS",
  questions: "Câu hỏi HS",
  "danh-gia": "Đánh giá",
  assessment: "Đánh giá",
};

export function parseCurrentRoute(): Route {
  let path = window.location.pathname.replace(/\/+$/, "") || "/";
  let search = window.location.search;

  // Support hash fallback if present (e.g. #/kit/123?tab=danh-gia)
  if (window.location.hash.startsWith("#/")) {
    const hashVal = window.location.hash.slice(1);
    const [hPath, hSearch] = hashVal.split("?");
    path = hPath || "/";
    if (hSearch) search = "?" + hSearch;
  }

  const searchParams = new URLSearchParams(search);
  const tabQuery = searchParams.get("tab") || "";

  // Route: /create
  if (path === "/create") {
    return { view: "create" };
  }

  // Route: /progress/:id
  const progressMatch = path.match(/^\/progress\/([a-zA-Z0-9_-]+)/);
  if (progressMatch) {
    return { view: "progress", kitId: progressMatch[1] };
  }

  // Route: /kit/:id/:tab or /kit/:id
  const kitMatch = path.match(/^\/kit\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?/);
  if (kitMatch) {
    const kitId = kitMatch[1];
    const pathTab = kitMatch[2];
    const tabSlug = (tabQuery || pathTab || "").toLowerCase();
    const resolvedTab =
      SLUG_TO_TAB[tabSlug] ||
      localStorage.getItem(`kit_${kitId}_tab`) ||
      undefined;

    return { view: "detail", kitId, tab: resolvedTab };
  }

  return { view: "dashboard" };
}

export function navigateTo(url: string, replace = false) {
  if (replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
