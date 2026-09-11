import { useState } from "react";
import { TopBar } from "./components/TopBar";
import { ToastContainer } from "./components/ui";
import { Dashboard } from "./views/Dashboard";
import { CreateForm } from "./views/CreateForm";
import { Progress } from "./views/Progress";
import { Detail } from "./views/Detail";

type View = "dashboard" | "create" | "progress" | "detail";

export interface FormData {
  subject: string;
  grade: string;
  lesson_topic: string;
  lesson_content_id: string;
  duration: number;
  support_level: string;
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <TopBar onCreate={() => setView("create")} onHome={() => setView("dashboard")} />
      <main>
        {view === "dashboard" && (
          <Dashboard
            onOpenKit={(id) => {
              setSelectedKitId(id);
              setView("detail");
            }}
            onCreate={() => setView("create")}
          />
        )}
        {view === "create" && (
          <CreateForm
            onBack={() => setView("dashboard")}
            onGenerate={(kitId, data) => {
              setSelectedKitId(kitId);
              setFormData(data);
              setView("progress");
            }}
          />
        )}
        {view === "progress" && selectedKitId && (
          <Progress
            kitId={selectedKitId}
            formData={formData}
            onDone={() => setView("detail")}
          />
        )}
        {view === "detail" && selectedKitId && (
          <Detail
            kitId={selectedKitId}
            onBack={() => setView("dashboard")}
          />
        )}
      </main>
      <ToastContainer />
    </div>
  );
}
