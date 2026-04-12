import { useMemo, useState } from 'react'
import { Check, Cloud, GitCompare, Save, Upload, Download, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { useProjectsStore } from '@/store/useProjectsStore'
import { useTimelineStore } from '@/store/useTimelineStore'

function badgeTone(status: string) {
  if (status === 'On Track') return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
  if (status === 'At Risk') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  if (status === 'Delayed' || status === 'Critical') return 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]'
  return 'bg-[color:var(--color-info)]/10 text-[color:var(--color-info)]'
}

function safeDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v as string | number)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function formatDateTime(d: unknown) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(safeDate(d))
  } catch {
    return String(d).slice(0, 10)
  }
}

export function TimelineHeader({
  onToast,
}: {
  onToast: (msg: string) => void
}) {
  const { projects, currentProjectId, setCurrentProjectId } = useProjectsStore()
  const { timeline, isDirty, saveChanges, markPublished, toggleBaseline, refreshFromBackend } = useTimelineStore()
  const [refreshing, setRefreshing] = useState(false)

  const projectOptions = useMemo(() => {
    return Object.values(projects)
      .filter((p) => !p.archived)
      .map((p) => ({ id: p.id, name: p.name }))
  }, [projects])

  const status = timeline?.status ?? 'On Track'
  const version = timeline?.version ?? '—'
  const lastSynced = timeline?.lastSynced ? formatDateTime(timeline.lastSynced) : '—'

  const onSave = () => {
    saveChanges()
    onToast('Saved changes.')
  }

  const onPublish = () => {
    markPublished()
    onToast('Published updates.')
  }

  const onCompare = () => {
    toggleBaseline()
    onToast('Toggled baseline comparison.')
  }

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshFromBackend()
      onToast('Pulled latest updates from workers.')
    } catch {
      onToast('Refresh failed — retrying next time.')
    } finally {
      setRefreshing(false)
    }
  }

  const onExport = () => {
    if (!timeline) return
    const json = JSON.stringify(
      {
        ...timeline,
        lastSynced: safeDate(timeline.lastSynced).toISOString(),
        plannedCompletionDate: safeDate(timeline.plannedCompletionDate).toISOString(),
        forecastedCompletionDate: safeDate(timeline.forecastedCompletionDate).toISOString(),
        tasks: timeline.tasks.map((t) => ({
          ...t,
          startDate: safeDate(t.startDate).toISOString(),
          endDate: safeDate(t.endDate).toISOString(),
          baselineStart: safeDate(t.baselineStart).toISOString(),
          baselineEnd: safeDate(t.baselineEnd).toISOString(),
        })),
      },
      null,
      2,
    )
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sanrachna_timeline_${timeline.projectId}_${timeline.version}.json`
    a.click()
    URL.revokeObjectURL(url)
    onToast('Exported schedule JSON.')
  }

  return (
    <Card className="sticky top-0 z-30 bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-[color:var(--color-text_secondary)]">Project</span>
            <div className="relative">
              <select
                className="appearance-none bg-transparent pr-6 font-semibold text-[color:var(--color-text)] focus:outline-none"
                value={currentProjectId ?? ''}
                onChange={(e) => setCurrentProjectId(e.target.value || null)}
                aria-label="Select project"
              >
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                ▾
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text_secondary)]">
            <Cloud className="size-3.5" />
            Last synced: {lastSynced}
          </span>

          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', badgeTone(status))}>{status}</span>

          <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-800">Version {version}</span>

          {isDirty ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-warning)]/12 px-3 py-1 text-xs font-semibold text-[color:var(--color-warning)]">
              <Upload className="size-3.5" />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-success)]/12 px-3 py-1 text-xs font-semibold text-[color:var(--color-success)]">
              <Check className="size-3.5" />
              All changes saved
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            title="Pull latest status and progress updates from workers"
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing…' : 'Pull Worker Updates'}
          </Button>
          <Button variant="secondary" onClick={onSave}>
            <Save className="size-4" />
            Save Changes
          </Button>
          <Button variant="primary" onClick={onPublish}>
            <Upload className="size-4" />
            Publish Updates
          </Button>
          <Button variant="outline" onClick={onCompare}>
            <GitCompare className="size-4" />
            Compare Baseline
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="size-4" />
            Export Schedule
          </Button>
        </div>
      </div>
    </Card>
  )
}
