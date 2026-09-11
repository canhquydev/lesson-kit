import { useEffect, useState } from "react";
import { ToastContainer } from "./components/ui";
import { Dashboard } from "./views/Dashboard";
import { CreateForm } from "./views/CreateForm";
import { Progress } from "./views/Progress";
import { Detail } from "./views/Detail";
import { parseCurrentRoute, navigateTo, TAB_TO_SLUG, type Route } from "./lib/router";

export interface FormData {
  subject: string;
  grade: string;
  lesson_topic: string;
  lesson_content_id: string;
  duration: number;
  support_level: string;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseCurrentRoute());
  const [formData, setFormData] = useState<FormData | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <main>
        {route.view === "dashboard" && (
          <Dashboard
            onOpenKit={(id, status) => {
              if (status?.toLowerCase() === "generating") {
                navigateTo(`/progress/${id}`);
                return;
              }
              const savedTab = localStorage.getItem(`kit_${id}_tab`);
              const slug = (savedTab && TAB_TO_SLUG[savedTab]) || "tu-vung";
              navigateTo(`/kit/${id}?tab=${slug}`);
            }}
            onCreate={() => navigateTo("/create")}
          />
        )}
        {route.view === "create" && (
          <CreateForm
            onBack={() => navigateTo("/")}
            onGenerate={(kitId, data) => {
              setFormData(data);
              navigateTo(`/progress/${kitId}`);
            }}
          />
        )}
        {route.view === "progress" && (
          <Progress
            kitId={route.kitId}
            formData={formData}
            onDone={() => {
              const savedTab = localStorage.getItem(`kit_${route.kitId}_tab`);
              const slug = (savedTab && TAB_TO_SLUG[savedTab]) || "tu-vung";
              navigateTo(`/kit/${route.kitId}?tab=${slug}`, true);
            }}
          />
        )}
        {route.view === "detail" && (
          <Detail
            kitId={route.kitId}
            initialTab={route.tab}
            onBack={() => navigateTo("/")}
            onTabChange={(newTab) => {
              const slug = TAB_TO_SLUG[newTab] || "tu-vung";
              navigateTo(`/kit/${route.kitId}?tab=${slug}`, true);
            }}
          />
        )}
      </main>
      <ToastContainer />
    </div>
  );
}

