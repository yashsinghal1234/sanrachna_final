import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Clock3,
  Download,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { ProjectContextBanner } from '@/components/ProjectContextBanner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useActiveProject } from '@/hooks/useActiveProject'
import { computeAutoEscalations, computeMetrics, useRfiStore } from '@/store/useRfiStore'
import type { RfiCategory, RfiItem, RfiPriority, RfiStatus } from '@/types/rfi.types'
import { cn } from '@/utils/cn'

const STATUSES: RfiStatus[] = ['Open', 'In Review', 'Awaiting Response', 'Answered', 'Closed', 'Escalated']
const PRIORITIES: RfiPriority[] = ['Critical', 'High', 'Medium', 'Low']
const CATEGORIES: RfiCategory[] = ['Structure', 'MEP', 'Architecture', 'Facade', 'Finishing', 'General']

function parseIso(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function formatDateTime(iso: string) {
  const d = parseIso(iso)
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d)
  } catch {
    return iso
  }
}

function hoursUntil(iso: string) {
  const ms = parseIso(iso).getTime() - Date.now()
  return Math.round(ms / (60 * 60 * 1000))
}

function priorityPill(p: RfiPriority) {
  const cls =
    p === 'Critical'
      ? 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]'
      : p === 'High'
        ? 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
        : p === 'Medium'
          ? 'bg-[color:var(--color-info)]/10 text-[color:var(--color-info)]'
          : 'bg-slate-900/5 text-slate-700'
  return <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', cls)}>{p}</span>
}

function statusTone(s: RfiStatus) {
  if (s === 'Escalated') return 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]'
  if (s === 'Open') return 'bg-slate-900/5 text-slate-700'
  if (s === 'In Review') return 'bg-[color:var(--color-info)]/10 text-[color:var(--color-info)]'
  if (s === 'Awaiting Response') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  if (s === 'Answered') return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
  return 'bg-slate-900/5 text-slate-700'
}

function isOverdue(item: RfiItem) {
  if (item.status === 'Answered' || item.status === 'Closed') return false
  return parseIso(item.dueAt).getTime() < Date.now()
}

function exportJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function RfiPage() {
  const { role, user } = useAuth()
  const { project, projectId } = useActiveProject()

  const {
    rfis,
    selectedId,
    setSelected,
    registerView,
    setRegisterView,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    search,
    setSearch,
    createRfi,
    moveStatus,
    addComment,
    escalate,
    isDirty,
    saveChanges,
  } = useRfiStore()
  const fetchRfis = useRfiStore((s) => s.fetchRfis)
  const rfiLoadStatus = useRfiStore((s) => s.loadStatus)
  const rfiLoadError = useRfiStore((s) => s.loadError)

  useEffect(() => {
    void fetchRfis(projectId)
  }, [projectId, fetchRfis])

  const [toast, setToast] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newRfi, setNewRfi] = useState<{
    title: string
    description: string
    category: RfiCategory
    priority: RfiPriority
    assignedTo: string
    dueDays: number
    linkedDoc: string
    linkedTask: string
    linkedPhase: string
    location: string
  }>({
    title: '',
    description: '',
    category: 'General',
    priority: 'Medium',
    assignedTo: 'Engineer — R. Jain',
    dueDays: 2,
    linkedDoc: '',
    linkedTask: '',
    linkedPhase: '',
    location: '',
  })

  const selected = useMemo(() => (selectedId ? rfis.find((r) => r.id === selectedId) ?? null : null), [rfis, selectedId])
  const metrics = useMemo(() => computeMetrics(rfis), [rfis])
  const auto = useMemo(() => computeAutoEscalations(rfis), [rfis])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rfis
      .filter((r) => (filterStatus === 'All' ? true : r.status === filterStatus))
      .filter((r) => (filterPriority === 'All' ? true : r.priority === filterPriority))
      .filter((r) => (q ? `${r.id} ${r.title} ${r.description} ${r.raisedBy} ${r.assignedTo}`.toLowerCase().includes(q) : true))
  }, [rfis, filterStatus, filterPriority, search])

  const can = useMemo(() => {
    const r = role ?? 'engineer'
    return {
      isWorker: r === 'worker',
      isEngineer: r === 'engineer',
      isOwner: r === 'owner',
      canRespond: r !== 'worker',
      canApprove: r === 'owner' || r === 'engineer',
      canEscalate: r !== 'worker',
      canClose: r !== 'worker',
    }
  }, [role])

  const onToast = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 2600)
  }

  const exportRegister = () => {
    exportJson(`sanrachna_rfi_register_${project?.id ?? 'project'}.json`, { projectId: project?.id ?? null, rfis })
    onToast('Exported RFI register JSON.')
  }

  const create = () => {
    if (!projectId) { onToast('Select a project first.'); return }
    const dueAt = new Date(Date.now() + Math.max(1, newRfi.dueDays) * 24 * 60 * 60 * 1000).toISOString()
    createRfi(projectId, {
      title: newRfi.title.trim() || 'Untitled RFI',
      description: newRfi.description.trim() || '—',
      category: newRfi.category,
      priority: newRfi.priority,
      assignedTo: newRfi.assignedTo.trim() || 'Engineer',
      raisedBy: user?.name ? `${user.name}` : can.isWorker ? 'Worker' : 'Engineer',
      dueAt,
      linkedDoc: newRfi.linkedDoc.trim() || undefined,
      linkedTask: newRfi.linkedTask.trim() || undefined,
      linkedPhase: newRfi.linkedPhase.trim() || undefined,
      location: newRfi.location.trim() || undefined,
    })
    setCreateOpen(false)
    setNewRfi({ ...newRfi, title: '', description: '' })
    onToast('Created new RFI.')
  }

  const statusCounts = useMemo(() => {
    const map = new Map<RfiStatus, number>()
    for (const s of STATUSES) map.set(s, 0)
    for (const r of rfis) map.set(r.status, (map.get(r.status) ?? 0) + 1)
    return map
  }, [rfis])

  return (
    <div className="space-y-6">
      {rfiLoadStatus === 'loading' ? (
        <Card>
          <CardContent className="p-4 text-sm text-[color:var(--color-text_secondary)]">Loading RFIs…</CardContent>
        </Card>
      ) : null}
      {rfiLoadStatus === 'error' && rfiLoadError ? (
        <Card className="border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/5 shadow-none">
          <CardContent className="p-4 text-sm font-semibold text-[color:var(--color-error)]">{rfiLoadError}</CardContent>
        </Card>
      ) : null}
      {/* 1. Header / Controls */}
      <Card className="sticky top-0 z-30 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">RFI</div>
            <div className="mt-1 text-xl font-bold">Clarifications & approvals workflow</div>
            <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
              RFI = information/clarification. Issue = physical site problem.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-800">
              Open: {metrics.open} · Escalated: {metrics.escalated} · Overdue: {metrics.overdue}
            </span>
            <Button variant="outline" onClick={exportRegister}>
              <Download className="size-4" />
              Export RFI Register
            </Button>
            <Button
              variant="primary"
              onClick={() => setCreateOpen(true)}
              disabled={!project}
              title={!project ? 'Select a project first' : undefined}
            >
              <Plus className="size-4" />
              Create New RFI
            </Button>
          </div>
        </div>
      </Card>

      <ProjectContextBanner />

      {/* 2. Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Open RFIs', value: metrics.open, icon: FileText, tone: 'bg-[#EEF3FB] ring-[#DBE9F8]' },
          { label: 'Overdue RFIs', value: metrics.overdue, icon: Timer, tone: 'bg-[#FFEef0] ring-[#F8D8DD]' },
          { label: 'Answered This Week', value: metrics.answeredThisWeek, icon: Users, tone: 'bg-[#E9F7F2] ring-[#CFE8DE]' },
          { label: 'Avg Response Time', value: `${metrics.avgResponseHours}h`, icon: Clock3, tone: 'bg-[#F8FAFC] ring-[#E2E8F0]' },
          { label: 'Escalated RFIs', value: metrics.escalated, icon: Bell, tone: 'bg-[#FFF7E8] ring-[#F6E4BB]' },
          { label: 'Critical RFIs', value: metrics.critical, icon: ShieldAlert, tone: 'bg-[#F2F5FC] ring-[#E1E8F7]' },
        ].map((c) => (
          <Card key={c.label} className={`${c.tone} shadow-none ring-1`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">{c.label}</div>
                <c.icon className="size-4 text-[color:var(--color-text_muted)]" />
              </div>
              <div className="mt-1 text-xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View controls */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search RFI ID, title, people…"
                className="h-10 w-80 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-primary_light)]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-10 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="All">All status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s} ({statusCounts.get(s) ?? 0})
                </option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="h-10 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
            >
              <option value="All">All priority</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-filter_segment_bg)] p-1 shadow-sm">
              <button
                type="button"
                className={cn(
                  'rounded-[var(--radius-xl)] px-3 py-2 text-sm font-semibold transition',
                  registerView === 'kanban' ? 'bg-[color:var(--color-primary)] text-white' : 'text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_hover)]',
                )}
                onClick={() => setRegisterView('kanban')}
              >
                Kanban
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-[var(--radius-xl)] px-3 py-2 text-sm font-semibold transition',
                  registerView === 'table' ? 'bg-[color:var(--color-primary)] text-white' : 'text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_hover)]',
                )}
                onClick={() => setRegisterView('table')}
              >
                Register
              </button>
            </div>

            {isDirty ? (
              <Button
                variant="secondary"
                onClick={() => {
                  saveChanges()
                  onToast('Saved changes.')
                }}
              >
                Save Changes
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* 3. Kanban / Status board (Hero) */}
      {registerView === 'kanban' ? (
        <div className="grid gap-3 xl:grid-cols-6">
          {STATUSES.map((status) => {
            const col = filtered.filter((r) => r.status === status)
            return (
              <Card key={status} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{status}</CardTitle>
                    <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusTone(status))}>
                      {col.length}
                    </span>
                  </div>
                  <CardDescription>Drag/drop comes next — click cards for details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {col.length === 0 ? (
                    <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-xs text-[color:var(--color-text_secondary)]">
                      No RFIs
                    </div>
                  ) : (
                    col.map((r) => {
                      const dueH = hoursUntil(r.dueAt)
                      const overdue = isOverdue(r)
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-3 text-left shadow-sm transition hover:bg-[color:var(--color-surface_hover)]/40"
                          onClick={() => setSelected(r.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">{r.id}</div>
                              <div className="mt-1 truncate text-sm font-semibold">{r.title}</div>
                            </div>
                            {priorityPill(r.priority)}
                          </div>
                          <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                            Raised: {r.raisedBy}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                            Assigned: {r.assignedTo}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className={cn('font-semibold', overdue ? 'text-[color:var(--color-error)]' : 'text-[color:var(--color-text_secondary)]')}>
                              {overdue ? `Overdue ${Math.abs(dueH)}h` : `Due in ${dueH}h`}
                            </span>
                            <span className="text-[color:var(--color-text_muted)]">{r.attachments.length} attachments</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* 4. Detailed RFI register table */
        <Card>
          <CardHeader>
            <CardTitle>RFI register</CardTitle>
            <CardDescription>Structured view for formal reporting and exports.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                  <th className="px-3 py-2">RFI ID</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Raised By</th>
                  <th className="px-3 py-2">Assigned To</th>
                  <th className="px-3 py-2">Linked Drawing/Doc</th>
                  <th className="px-3 py-2">Raised Date</th>
                  <th className="px-3 py-2">Due Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[color:var(--color-surface_hover)]/40">
                    <td className="px-3 py-3 font-semibold">{r.id}</td>
                    <td className="px-3 py-3">{r.title}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{r.category}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{r.raisedBy}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{r.assignedTo}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{r.linkedDoc ?? '—'}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{formatDateTime(r.raisedAt)}</td>
                    <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{formatDateTime(r.dueAt)}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusTone(r.status))}>{r.status}</span>
                    </td>
                    <td className="px-3 py-3">{priorityPill(r.priority)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelected(r.id)}>
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!can.canRespond) return
                            addComment(projectId ?? '', r.id, { kind: 'response', author: user?.name ?? 'Engineer', text: 'Acknowledged. Will revert shortly.' })
                            moveStatus(projectId ?? '', r.id, 'In Review')
                            onToast('Responded.')
                          }}
                          disabled={!can.canRespond}
                        >
                          Respond
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!can.canEscalate) return
                            escalate(projectId ?? '', r.id, 'Manual escalation by user', can.isOwner ? 'Owner' : 'Owner — K. Iyer')
                            onToast('Escalated (demo).')
                          }}
                          disabled={!can.canEscalate}
                        >
                          Escalate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-sm text-[color:var(--color-text_secondary)]">
                      No RFIs match this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 6. Auto escalation panel */}
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-[color:var(--color-warning)]" />
              Auto-escalation panel
            </CardTitle>
            <CardDescription>RFIs nearing SLA breach and auto-escalations after 48h.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
              <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">NEARING SLA BREACH (24h)</div>
              <div className="mt-2 space-y-2">
                {auto.nearing.length === 0 ? (
                  <div className="text-sm text-[color:var(--color-text_secondary)]">No RFIs within 24h window.</div>
                ) : (
                  auto.nearing.slice(0, 4).map((x) => (
                    <div key={x.item.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{x.item.id} · {x.item.title}</div>
                        <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">Escalates in: {Math.max(0, Math.round(x.msLeft / 3600000))}h</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!can.canEscalate) return
                          escalate(projectId ?? '', x.item.id, 'Nearing SLA breach (24h window)', 'Owner — K. Iyer')
                          onToast('Auto-escalated.')
                        }}
                        disabled={!can.canEscalate}
                      >
                        Escalate now
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
              <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">AUTO-ESCALATED AFTER 48h</div>
              <div className="mt-2 space-y-2">
                {auto.breached48h.length === 0 ? (
                  <div className="text-sm text-[color:var(--color-text_secondary)]">No 48h breaches.</div>
                ) : (
                  auto.breached48h.slice(0, 4).map((i) => (
                    <div key={i.id} className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                      <div className="text-sm font-semibold">{i.id} · {i.title}</div>
                      <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">Next target: Owner</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Analytics / insights + 8. AI assistant */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="size-4 text-[color:var(--color-primary_dark)]" />
                Analytics / insights
              </CardTitle>
              <CardDescription>Management view (lightweight demo).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[color:var(--color-text_secondary)]">
              <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                Avg response time: <span className="font-semibold text-[color:var(--color-text)]">{metrics.avgResponseHours} hours</span>
              </div>
              <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                Most delayed category: <span className="font-semibold text-[color:var(--color-text)]">MEP coordination</span>
              </div>
              <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                RFIs by phase: <span className="font-semibold text-[color:var(--color-text)]">Finishing + MEP highest</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-[#d6ece7] bg-[#f2fcf9]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-[color:var(--color-primary_dark)]" />
                AI assistant (demo)
              </CardTitle>
              <CardDescription>Premium feel suggestions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                'Suggest likely approver based on category (Structure → Consultant).',
                'Detect duplicate RFIs by title similarity.',
                'Draft response template for common MEP clashes.',
              ].map((s) => (
                <div key={s} className="rounded-[var(--radius-xl)] bg-white px-3 py-2 ring-1 ring-[#dcece9]">
                  {s}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Detail drawer/modal */}
      <Modal
        open={Boolean(selected)}
        onOpenChange={(o) => setSelected(o ? selected?.id ?? null : null)}
        title={selected ? `${selected.id} · ${selected.title}` : 'RFI'}
        description={selected ? `${selected.category} · ${selected.status} · Priority ${selected.priority}` : undefined}
        className="max-w-3xl"
        footer={
          selected ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (!can.canEscalate) return
                  escalate(projectId ?? '', selected.id, 'Escalated from detail drawer', 'Owner — K. Iyer')
                  onToast('Escalated.')
                }}
                disabled={!can.canEscalate}
              >
                Escalate
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (!can.canRespond) return
                  addComment(projectId ?? '', selected.id, { kind: 'response', author: user?.name ?? 'Engineer', text: 'Proposed resolution: proceed with revised routing; awaiting approval.' })
                  moveStatus(projectId ?? '', selected.id, 'Answered')
                  onToast('Marked answered.')
                }}
                disabled={!can.canRespond}
              >
                Respond
              </Button>
              <Button variant="primary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-sm font-semibold">Basic info</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[color:var(--color-text_secondary)]">
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                    Raised by
                    <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{selected.raisedBy}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                    Assigned to
                    <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{selected.assignedTo}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                    Raised
                    <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{formatDateTime(selected.raisedAt)}</div>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                    Due
                    <div className={cn('mt-1 text-sm font-semibold', isOverdue(selected) ? 'text-[color:var(--color-error)]' : 'text-[color:var(--color-text)]')}>
                      {formatDateTime(selected.dueAt)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-[color:var(--color-text_secondary)]">{selected.description}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {priorityPill(selected.priority)}
                  <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusTone(selected.status))}>{selected.status}</span>
                  {selected.linkedDoc ? <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-semibold text-slate-700">{selected.linkedDoc}</span> : null}
                  {selected.linkedTask ? <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-semibold text-slate-700">{selected.linkedTask}</span> : null}
                </div>
              </div>

              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-sm font-semibold">Response thread</div>
                <div className="mt-3 space-y-2">
                  {selected.thread.map((c) => (
                    <div key={c.id} className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--color-text_muted)]">
                        <span className="font-semibold">{c.author}</span>
                        <span>{formatDateTime(c.at)}</span>
                      </div>
                      <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">{c.text}</div>
                    </div>
                  ))}
                </div>
                {can.canRespond ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        addComment(projectId ?? '', selected.id, { kind: 'comment', author: user?.name ?? 'Engineer', text: 'Adding note: awaiting drawing markups from consultant.' })
                        onToast('Added comment.')
                      }}
                    >
                      Add comment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        moveStatus(projectId ?? '', selected.id, selected.status === 'Open' ? 'In Review' : 'Awaiting Response')
                        onToast('Updated status.')
                      }}
                    >
                      Move status
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-sm font-semibold">Evidence & attachments</div>
                <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">
                  {selected.attachments.length ? (
                    <ul className="space-y-2">
                      {selected.attachments.map((a) => (
                        <li key={a.id} className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2 text-sm">
                          <span className="font-semibold">{a.kind}</span> · {a.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'No attachments.'
                  )}
                </div>
              </div>

              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-sm font-semibold">Approval info</div>
                <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">
                  {selected.approval ? (
                    <div className="space-y-1">
                      <div>
                        Approved by <span className="font-semibold">{selected.approval.approvedBy}</span>
                      </div>
                      <div>At {formatDateTime(selected.approval.approvedAt)}</div>
                      <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">{selected.approval.resolution}</div>
                    </div>
                  ) : (
                    'Not approved/closed yet.'
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Create form modal */}
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create new RFI"
        description="Formal clarification request. Attach evidence, set SLA, assign approver."
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={create}>
              Create RFI
            </Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 font-semibold">Title</div>
            <input
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.title}
              onChange={(e) => setNewRfi((s) => ({ ...s, title: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Category</div>
            <select
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.category}
              onChange={(e) => setNewRfi((s) => ({ ...s, category: e.target.value as RfiCategory }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 font-semibold">Description</div>
            <textarea
              className="min-h-24 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={newRfi.description}
              onChange={(e) => setNewRfi((s) => ({ ...s, description: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Priority</div>
            <select
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.priority}
              onChange={(e) => setNewRfi((s) => ({ ...s, priority: e.target.value as RfiPriority }))}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Assign to</div>
            <input
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.assignedTo}
              onChange={(e) => setNewRfi((s) => ({ ...s, assignedTo: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Due (days)</div>
            <input
              type="number"
              min={1}
              max={14}
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.dueDays}
              onChange={(e) => setNewRfi((s) => ({ ...s, dueDays: Number(e.target.value) }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Linked drawing/doc</div>
            <input
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.linkedDoc}
              onChange={(e) => setNewRfi((s) => ({ ...s, linkedDoc: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Linked task / phase</div>
            <input
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.linkedTask}
              onChange={(e) => setNewRfi((s) => ({ ...s, linkedTask: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 font-semibold">Site location / area</div>
            <input
              className="h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
              value={newRfi.location}
              onChange={(e) => setNewRfi((s) => ({ ...s, location: e.target.value }))}
            />
          </label>
        </div>
      </Modal>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[80] max-w-sm rounded-[var(--radius-2xl)] bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}
