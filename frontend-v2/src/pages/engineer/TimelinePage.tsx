import { useEffect, useMemo, useRef, useState } from 'react'

import { useProjectsStore } from '@/store/useProjectsStore'
import { Keyboard, X } from 'lucide-react'

import { TimelineHeader } from '@/components/timeline/TimelineHeader'
import { ScheduleSummaryCards } from '@/components/timeline/ScheduleSummaryCards'
import { GanttChart } from '@/components/timeline/GanttChart'
import { TaskScheduleTable } from '@/components/timeline/TaskScheduleTable'
import { RiskForecastPanel } from '@/components/timeline/RiskForecastPanel'
import { RecoveryRecommendations } from '@/components/timeline/RecoveryRecommendations'
import { ForecastingBaselines } from '@/components/timeline/ForecastingBaselines'
import { ResourceLoadingTimeline } from '@/components/timeline/ResourceLoadingTimeline'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useTimelineStore } from '@/store/useTimelineStore'
import { useApprovedReport } from '@/hooks/useApprovedReport'
import { reportToTimeline } from '@/lib/reportToTimeline'

type Toast = { id: string; msg: string }

function newId() {
  return `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function TimelinePage() {
  const {
    isDirty,
    saveChanges,
    markPublished,
    toggleBaseline,
    toggleDependencies,
    toggleCriticalPath,
    fetchTimeline,
    refreshFromBackend,
    timelineLoadStatus,
    timelineLoadError,
    timeline,
    setTimeline,
  } = useTimelineStore()
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const projectsById = useProjectsStore((s) => s.projects)
  const { report } = useApprovedReport()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showKeys, setShowKeys] = useState(false)
  const prevProjectRef = useRef<string | null>(null)
  const seededRef = useRef<string | null>(null) // tracks which projectId we already seeded

  // Fetch timeline on project change; auto-save previous project before switching
  useEffect(() => {
    const name = currentProjectId ? projectsById[currentProjectId]?.name ?? 'Project' : 'Project'
    // If switching projects, save the current state first
    if (prevProjectRef.current && prevProjectRef.current !== currentProjectId) {
      saveChanges()
    }
    prevProjectRef.current = currentProjectId
    void fetchTimeline(currentProjectId, name)
  }, [currentProjectId, projectsById, fetchTimeline, saveChanges])

  // Seed timeline from approved report when it has no tasks
  useEffect(() => {
    if (!report || !currentProjectId) return
    if (timelineLoadStatus !== 'ready') return
    if (timeline && timeline.tasks.length > 0) return // already has data
    if (seededRef.current === currentProjectId) return // already seeded for this project
    const name = projectsById[currentProjectId]?.name ?? 'Project'
    const seeded = reportToTimeline(report, currentProjectId, name)
    seededRef.current = currentProjectId
    setTimeline(seeded)
  }, [report, currentProjectId, timeline, timelineLoadStatus, projectsById, setTimeline])

  // Auto-refresh from backend every 60 s while page is visible
  useEffect(() => {
    const run = () => void refreshFromBackend()
    const id = window.setInterval(run, 60_000)
    return () => window.clearInterval(id)
  }, [refreshFromBackend])

  const onToast = (msg: string) => {
    const id = newId()
    setToasts((t) => [...t, { id, msg }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === '?' && e.key === '?') {
        setShowKeys((s) => !s)
        e.preventDefault()
      }

      const meta = e.ctrlKey || e.metaKey
      if (!meta) return
      if (key === 's') {
        e.preventDefault()
        saveChanges()
        onToast('Saved changes.')
      }
      if (key === 'p') {
        e.preventDefault()
        markPublished()
        onToast('Published updates.')
      }
      if (key === 'b') {
        e.preventDefault()
        toggleBaseline()
        onToast('Toggled baseline.')
      }
      if (key === 'd') {
        e.preventDefault()
        toggleDependencies()
        onToast('Toggled dependencies.')
      }
      if (key === 'c') {
        e.preventDefault()
        toggleCriticalPath()
        onToast('Toggled critical path.')
      }
      if (key === 'r') {
        e.preventDefault()
        refreshFromBackend().then(() => onToast('Pulled latest worker updates.'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveChanges, markPublished, toggleBaseline, toggleDependencies, toggleCriticalPath, refreshFromBackend])

  const unsavedBanner = useMemo(() => {
    if (!isDirty) return null
    return (
      <Card className="border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 shadow-none ring-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-[color:var(--color-warning)]">
            You have unsaved schedule changes. Press <span className="rounded bg-white/60 px-2 py-0.5">Ctrl+S</span> to save.
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              saveChanges()
              onToast('Saved changes.')
            }}
          >
            Save now
          </Button>
        </CardContent>
      </Card>
    )
  }, [isDirty, saveChanges])

  return (
    <div className="min-h-screen bg-[#F8F6F0]">
      <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-4 sm:px-6">
        {/* ZONE A */}
        <TimelineHeader onToast={onToast} />

        {timelineLoadStatus === 'loading' ? (
          <Card>
            <CardContent className="p-6 text-sm text-[color:var(--color-text_secondary)]">Loading schedule…</CardContent>
          </Card>
        ) : null}
        {timelineLoadStatus === 'error' && timelineLoadError ? (
          <Card className="border border-[color:var(--color-error)]/25 bg-[color:var(--color-error)]/10 shadow-none">
            <CardContent className="p-4 text-sm font-semibold text-[color:var(--color-error)]">{timelineLoadError}</CardContent>
          </Card>
        ) : null}

        {unsavedBanner}

        {/* ZONE B */}
        <ScheduleSummaryCards />

        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            {/* ZONE C */}
            <GanttChart />

            {/* ZONE D */}
            <TaskScheduleTable onToast={onToast} />

            {/* ZONE F */}
            <ForecastingBaselines />

            {/* ZONE G */}
            <ResourceLoadingTimeline />
          </div>

          {/* ZONE E */}
          <div className="space-y-3">
            <RiskForecastPanel />
            <RecoveryRecommendations onToast={onToast} />

            <Card className="bg-white">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="text-sm font-semibold">Keyboard shortcuts</div>
                <Button variant="outline" size="sm" onClick={() => setShowKeys(true)}>
                  <Keyboard className="size-4" />
                  View
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[80] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="max-w-sm rounded-[var(--radius-2xl)] bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Shortcut modal */}
      {showKeys ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
              <div className="text-sm font-bold">Keyboard shortcuts</div>
              <Button variant="ghost" size="sm" onClick={() => setShowKeys(false)}>
                <X className="size-4" />
                Close
              </Button>
            </div>
            <div className="space-y-2 px-5 py-4 text-sm text-[color:var(--color-text_secondary)]">
              {[
                { label: 'Save changes', shortcut: 'Ctrl + S' },
                { label: 'Publish updates', shortcut: 'Ctrl + P' },
                { label: 'Pull worker updates', shortcut: 'Ctrl + R' },
                { label: 'Toggle baseline', shortcut: 'Ctrl + B' },
                { label: 'Toggle dependencies', shortcut: 'Ctrl + D' },
                { label: 'Toggle critical path', shortcut: 'Ctrl + C' },
                { label: 'Show shortcuts', shortcut: '?' },
              ].map(({ label, shortcut }) => (
                <div key={label} className="flex items-center justify-between rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                  <span>{label}</span>
                  <span className="font-semibold text-[color:var(--color-text)]">{shortcut}</span>
                </div>
              ))}
              <div className="pt-2 text-xs">
                Tip: the Gantt supports drag-to-move and resize handles. Baseline + dependencies are toggles in the chart toolbar.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
