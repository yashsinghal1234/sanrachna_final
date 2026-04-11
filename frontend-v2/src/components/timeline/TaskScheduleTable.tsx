import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { GanttTask, Phase, TaskStatus } from '@/types/timeline.types'
import { useTimelineStore } from '@/store/useTimelineStore'
import { cn } from '@/utils/cn'

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function parseDateInput(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  return new Date(y, mo - 1, d)
}

function statusPill(s: TaskStatus) {
  const cls =
    s === 'completed'
      ? 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
      : s === 'in-progress'
        ? 'bg-[color:var(--color-info)]/10 text-[color:var(--color-info)]'
        : s === 'delayed'
          ? 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
          : s === 'blocked'
            ? 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]'
            : 'bg-slate-900/5 text-slate-700'
  return <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', cls)}>{s}</span>
}

const PHASES: Phase[] = ['Foundation', 'Substructure', 'Superstructure', 'MEP', 'Finishing', 'Handover']
const STATUSES: TaskStatus[] = ['not-started', 'in-progress', 'completed', 'delayed', 'blocked']

export function TaskScheduleTable({ onToast }: { onToast: (msg: string) => void }) {
  const { timeline, editingTaskId, setEditingTaskId, updateTask, addTask, deleteTask } = useTimelineStore()
  const [q, setQ] = useState('')
  const [phase, setPhase] = useState<Phase | 'All'>('All')
  const [status, setStatus] = useState<TaskStatus | 'All'>('All')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const filtered = useMemo(() => {
    if (!timeline) return []
    const needle = q.trim().toLowerCase()
    return timeline.tasks
      .filter((t) => (phase === 'All' ? true : t.phase === phase))
      .filter((t) => (status === 'All' ? true : t.status === status))
      .filter((t) => (needle ? `${t.name} ${t.assignedCrew}`.toLowerCase().includes(needle) : true))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [timeline, q, phase, status])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const startInlineAdd = () => {
    addTask({
      name: 'New schedule task',
      phase: 'Finishing',
      assignedCrew: 'Crew',
      status: 'not-started',
      percentComplete: 0,
      dependsOn: [],
      isMilestone: false,
      isCriticalPath: false,
    })
    onToast('Added task (draft).')
  }

  const editCell = (t: GanttTask, field: keyof GanttTask, value: unknown) => {
    updateTask(t.id, { [field]: value } as Partial<GanttTask>)
  }

  if (!timeline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task table</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px] animate-pulse">
          <div className="h-full rounded-[var(--radius-2xl)] bg-slate-100" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Task schedule table</CardTitle>
            <CardDescription>Search, filter, edit, add, and paginate tasks.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search tasks / crew…"
              className="h-10 w-64 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-primary_light)]"
            />
            <select
              value={phase}
              onChange={(e) => {
                setPhase(e.target.value as any)
                setPage(1)
              }}
              className="h-10 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="All">All phases</option>
              {PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any)
                setPage(1)
              }}
              className="h-10 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="All">All status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={startInlineAdd}>
              <Plus className="size-4" />
              Add Task
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] py-10 text-center text-sm text-[color:var(--color-text_secondary)]">
            No matching tasks.
          </div>
        ) : (
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                <th className="px-3 py-2">Task Name</th>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2">Assigned Crew</th>
                <th className="px-3 py-2">Start Date</th>
                <th className="px-3 py-2">End Date</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Dependency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">% Complete</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {rows.map((t) => {
                const editing = editingTaskId === t.id
                return (
                  <tr key={t.id} className="group hover:bg-[color:var(--color-surface_hover)]/40">
                    <td className="px-3 py-3 font-semibold">
                      {editing ? (
                        <input
                          className="h-9 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                          value={t.name}
                          onChange={(e) => editCell(t, 'name', e.target.value)}
                        />
                      ) : (
                        t.name
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {editing ? (
                        <select
                          className="h-9 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-2 text-sm"
                          value={t.phase}
                          onChange={(e) => editCell(t, 'phase', e.target.value as Phase)}
                        >
                          {PHASES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-semibold">{t.phase}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                      {editing ? (
                        <input
                          className="h-9 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                          value={t.assignedCrew}
                          onChange={(e) => editCell(t, 'assignedCrew', e.target.value)}
                        />
                      ) : (
                        t.assignedCrew
                      )}
                    </td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                      {editing ? (
                        <input
                          className="h-9 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                          type="date"
                          value={t.startDate.toISOString().slice(0, 10)}
                          onChange={(e) => {
                            const nd = parseDateInput(e.target.value)
                            if (nd) editCell(t, 'startDate', nd)
                          }}
                        />
                      ) : (
                        formatDate(t.startDate)
                      )}
                    </td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                      {editing ? (
                        <input
                          className="h-9 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                          type="date"
                          value={t.endDate.toISOString().slice(0, 10)}
                          onChange={(e) => {
                            const nd = parseDateInput(e.target.value)
                            if (nd) editCell(t, 'endDate', nd)
                          }}
                        />
                      ) : (
                        formatDate(t.endDate)
                      )}
                    </td>
                    <td className="px-3 py-3">{t.durationDays}d</td>
                    <td className="px-3 py-3 text-xs text-[color:var(--color-text_secondary)]">
                      {t.dependsOn.length ? t.dependsOn.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-3">{statusPill(t.status)}</td>
                    <td className="px-3 py-3">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9 w-20 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                          value={t.percentComplete}
                          onChange={(e) => editCell(t, 'percentComplete', Number(e.target.value))}
                        />
                      ) : (
                        <span className="font-semibold">{t.percentComplete}%</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant={editing ? 'secondary' : 'outline'}
                          onClick={() => {
                            setEditingTaskId(editing ? null : t.id)
                            onToast(editing ? 'Stopped editing.' : 'Editing row.')
                          }}
                        >
                          <Pencil className="size-4" />
                          {editing ? 'Done' : 'Edit'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            deleteTask(t.id)
                            onToast('Deleted task.')
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-[color:var(--color-text_secondary)]">
            Showing <span className="font-semibold text-[color:var(--color-text)]">{rows.length}</span> of{' '}
            <span className="font-semibold text-[color:var(--color-text)]">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </Button>
            <span className="text-[color:var(--color-text_secondary)]">
              Page <span className="font-semibold text-[color:var(--color-text)]">{page}</span> / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

