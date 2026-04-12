import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { GanttTask, Phase, TaskStatus } from '@/types/timeline.types'
import { useTimelineStore } from '@/store/useTimelineStore'
import { cn } from '@/utils/cn'

function formatDate(d: unknown) {
  const dt = safeDate(d)
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(dt)
  } catch {
    return dt.toISOString().slice(0, 10)
  }
}

/** Coerce a value that may be a Date object or ISO string into a valid Date. */
function safeDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v as string | number)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
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
  const [isAdding, setIsAdding] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const [newTask, setNewTask] = useState({
    name: '', phase: 'Foundation' as Phase, assignedCrew: '',
    startDate: today, endDate: weekLater,
    status: 'not-started' as TaskStatus,
    percentComplete: 0, isCriticalPath: false, isMilestone: false,
  })
  const pageSize = 8

  const filtered = useMemo(() => {
    if (!timeline) return []
    const needle = q.trim().toLowerCase()
    return timeline.tasks
      .filter((t) => (phase === 'All' ? true : t.phase === phase))
      .filter((t) => (status === 'All' ? true : t.status === status))
      .filter((t) => (needle ? `${t.name} ${t.assignedCrew}`.toLowerCase().includes(needle) : true))
      .sort((a, b) => safeDate(a.startDate).getTime() - safeDate(b.startDate).getTime())
  }, [timeline, q, phase, status])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleAddTask = () => {
    if (!newTask.name.trim()) { onToast('Task name is required.'); return }
    const start = parseDateInput(newTask.startDate) ?? new Date()
    const end = parseDateInput(newTask.endDate) ?? new Date(Date.now() + 7 * 86400000)
    addTask({
      name: newTask.name.trim(),
      phase: newTask.phase,
      assignedCrew: newTask.assignedCrew.trim() || 'Crew',
      status: newTask.status,
      percentComplete: Math.max(0, Math.min(100, newTask.percentComplete)),
      dependsOn: [],
      isMilestone: newTask.isMilestone,
      isCriticalPath: newTask.isCriticalPath,
      startDate: start,
      endDate: end,
    })
    setIsAdding(false)
    setNewTask({ name: '', phase: 'Foundation', assignedCrew: '', startDate: today, endDate: weekLater, status: 'not-started', percentComplete: 0, isCriticalPath: false, isMilestone: false })
    onToast(`Task "${newTask.name.trim()}" added — syncing to database…`)
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
    <>
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
              <Button variant="secondary" onClick={() => setIsAdding(true)}>
                <Plus className="size-4" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <div className="text-3xl">📋</div>
              <div>
                <div className="text-sm font-semibold text-slate-700">
                  {q || phase !== 'All' || status !== 'All' ? 'No tasks match your filters' : 'No tasks yet — add your first one'}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {q || phase !== 'All' || status !== 'All' ? 'Try clearing the search or filter.' : 'Click "Add Task" to create a schedule task and assign it to a worker.'}
                </div>
              </div>
              {!q && phase === 'All' && status === 'All' ? (
                <Button variant="primary" onClick={() => {
                  setNewTask({ name: '', phase: 'Foundation', assignedCrew: '', startDate: today, endDate: weekLater, status: 'not-started', percentComplete: 0, isCriticalPath: false, isMilestone: false })
                  setIsAdding(true)
                }}>
                  <Plus className="size-4" />
                  Add First Task
                </Button>
              ) : null}
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
                            value={safeDate(t.startDate).toISOString().slice(0, 10)}
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
                            value={safeDate(t.endDate).toISOString().slice(0, 10)}
                            onChange={(e) => {
                              const nd = parseDateInput(e.target.value)
                              if (nd) editCell(t, 'endDate', nd)
                            }}
                          />
                        ) : (
                          formatDate(t.endDate)
                        )}
                      </td>
                      <td className="px-3 py-3">{t.durationDays ?? 0}d</td>
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

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Schedule Task</h3>
                <p className="mt-0.5 text-xs text-slate-500">Added to Gantt chart and synced to database. Assigned worker sees it in My Tasks.</p>
              </div>
              <button className="rounded-lg p-1 hover:bg-slate-100" onClick={() => setIsAdding(false)}>
                <X className="size-5 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              {/* Task name — full width */}
              <label className="text-sm md:col-span-2">
                <div className="mb-1 font-semibold text-slate-800">Task name *</div>
                <input
                  autoFocus
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Pour slab — Zone B"
                  value={newTask.name}
                  onChange={(e) => setNewTask((s) => ({ ...s, name: e.target.value }))}
                />
              </label>

              {/* Phase */}
              <label className="text-sm">
                <div className="mb-1 font-semibold text-slate-800">Phase</div>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                  value={newTask.phase}
                  onChange={(e) => setNewTask((s) => ({ ...s, phase: e.target.value as Phase }))}
                >
                  {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>

              {/* Assigned crew */}
              <label className="text-sm">
                <div className="mb-1 font-semibold text-slate-800">Assigned crew / worker</div>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                  placeholder="e.g. Worker — yogesh"
                  value={newTask.assignedCrew}
                  onChange={(e) => setNewTask((s) => ({ ...s, assignedCrew: e.target.value }))}
                />
              </label>

              {/* Start date */}
              <label className="text-sm">
                <div className="mb-1 font-semibold text-slate-800">Start date *</div>
                <input
                  type="date"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                  value={newTask.startDate}
                  onChange={(e) => setNewTask((s) => ({ ...s, startDate: e.target.value }))}
                />
              </label>

              {/* End date */}
              <label className="text-sm">
                <div className="mb-1 font-semibold text-slate-800">End date *</div>
                <input
                  type="date"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                  value={newTask.endDate}
                  onChange={(e) => setNewTask((s) => ({ ...s, endDate: e.target.value }))}
                />
              </label>

              {/* Status */}
              <label className="text-sm">
                <div className="mb-1 font-semibold text-slate-800">Status</div>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                  value={newTask.status}
                  onChange={(e) => setNewTask((s) => ({ ...s, status: e.target.value as TaskStatus }))}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              {/* % Complete */}
              <label className="text-sm">
                <div className="mb-1 font-semibold text-slate-800">% Complete</div>
                <input
                  type="number" min={0} max={100}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                  value={newTask.percentComplete}
                  onChange={(e) => setNewTask((s) => ({ ...s, percentComplete: Number(e.target.value) }))}
                />
              </label>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 md:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 rounded accent-red-600"
                    checked={newTask.isCriticalPath}
                    onChange={(e) => setNewTask((s) => ({ ...s, isCriticalPath: e.target.checked }))}
                  />
                  <span className="font-semibold text-red-700">Critical path</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 rounded accent-blue-600"
                    checked={newTask.isMilestone}
                    onChange={(e) => setNewTask((s) => ({ ...s, isMilestone: e.target.checked }))}
                  />
                  <span className="font-semibold text-blue-700">Milestone</span>
                </label>
              </div>

              {/* Info banner */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 md:col-span-2">
                💡 Assigned worker will see this task in <strong>My Tasks</strong> and can update progress from there.
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAddTask}>
                <Plus className="size-4" />
                Add to Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
