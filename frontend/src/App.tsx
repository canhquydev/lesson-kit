import { useEffect, useState } from "react"

import { ToastContainer } from "./components/ui"

import { Dashboard } from "./views/Dashboard"

import { CreateForm } from "./views/CreateForm"

import { Progress } from "./views/Progress"

import { Detail } from "./views/Detail"

import {
  parseCurrentRoute,
  navigateTo,
  TAB_TO_SLUG,
  SLUG_TO_TAB,
  DEFAULT_TAB_SLUG,
  type Route,
} from "./lib/router"

export interface FormData {
  subject: string

  grade: string

  lesson_topic: string

  lesson_content_id: string

  duration: number

  support_level: string
}

function getSavedTabSlug(kitId: string): string {
  try {
    const savedTab = localStorage.getItem(`kit_${kitId}_tab`)
    if (!savedTab) return DEFAULT_TAB_SLUG
    return TAB_TO_SLUG[savedTab] || (SLUG_TO_TAB[savedTab] ? savedTab : DEFAULT_TAB_SLUG)
  } catch {
    return DEFAULT_TAB_SLUG
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseCurrentRoute())

  const [formData, setFormData] = useState<FormData | null>(null)

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseCurrentRoute())
    }

    window.addEventListener("popstate", handleRouteChange)
    window.addEventListener("hashchange", handleRouteChange)

    return () => {
      window.removeEventListener("popstate", handleRouteChange)
      window.removeEventListener("hashchange", handleRouteChange)
    }
  }, [])

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <main>
        {route.view === "dashboard" && (
          <Dashboard
            onOpenKit={(id, status) => {
              if (
                status?.toLowerCase() === "generating" ||
                status?.toLowerCase() === "failed"
              ) {
                setFormData(null)
                navigateTo(`/progress/${id}`)
                return
              }

              const slug = getSavedTabSlug(id)
              navigateTo(`/kit/${id}?tab=${slug}`)
            }}
            onCreate={() => navigateTo("/create")}
          />
        )}
        {route.view === "create" && (
          <CreateForm
            onBack={() => navigateTo("/")}
            onGenerate={(kitId, data) => {
              setFormData(data)

              navigateTo(`/progress/${kitId}`)
            }}
          />
        )}
        {route.view === "progress" && (
          <Progress
            kitId={route.kitId}
            formData={formData}
            onDone={() => {
              const slug = getSavedTabSlug(route.kitId)
              navigateTo(`/kit/${route.kitId}?tab=${slug}`, true)
            }}
          />
        )}
        {route.view === "detail" && (
          <Detail
            kitId={route.kitId}
            initialTab={route.tab}
            onBack={() => navigateTo("/")}
            onTabChange={(newTab) => {
              const slug = TAB_TO_SLUG[newTab] || DEFAULT_TAB_SLUG

              navigateTo(`/kit/${route.kitId}?tab=${slug}`, true)
            }}
          />
        )}
      </main>
      <ToastContainer />
    </div>
  )
}
