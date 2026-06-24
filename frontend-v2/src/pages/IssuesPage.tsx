import {
  CheckCircle2,
  Filter,
  Flag,
  ImagePlus,
  Layers,
  Plus,
  Search,
  ShieldAlert,
  Timer,
  UserPlus,
  X,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useProjectsStore } from '@/store/useProjectsStore'
import { useRfiStore } from '@/store/useRfiStore'
import { useIssueStore, computeIssueMetrics } from '@/store/useIssueStore'
import { apiGetTeam } from '@/api/projectTeamApi'
import { listProjectContacts } from '@/api/projectContactsApi'
import type { IssueCategory, IssueItem, IssueSeverity, IssueStatus } from '@/types/issue.types'
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES, ISSUE_STATUSES } from '@/constants/issues'
import { formatDate } from '@/utils/format'

const field =
  'mt-1.5 flex min-h-10 w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60'

const severityColor: Record<IssueSeverity, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#64748b',
}

function severityBadge(s: IssueSeverity) {
  if (s === 'Critical') return <Badge variant="danger">Critical</Badge>
  if (s === 'High') return <Badge variant="danger">High</Badge>
  if (s === 'Medium') return <Badge variant="warning">Medium</Badge>
  return <Badge variant="info">Low</Badge>
}

function statusBadge(s: IssueStatus) {
  if (s === 'Reported') return <Badge variant="danger">Reported</Badge>
  if (s === 'Assigned') return <Badge variant="warning">Assigned</Badge>
  if (s === 'In Progress') return <Badge variant="warning">In progress</Badge>
  if (s === 'Resolved') return <Badge variant="info">Resolved</Badge>
  if (s === 'Verified') return <Badge variant="success">Verified</Badge>
  return <Badge variant="muted">Closed</Badge>
}

function isBlocked(i: IssueItem) {
  return i.severity === 'Critical' && (i.status === 'Reported' || i.status === 'Assigned' || i.status === 'In Progress')
}

function matchesText(i: IssueItem, q: string) {
  if (!q) return true
  const s = q.toLowerCase()
  return (
    i.id.toLowerCase().includes(s) ||
    i.title.toLowerCase().includes(s) ||
    i.description.toLowerCase().includes(s) ||
    i.location.toLowerCase().includes(s) ||
    (i.assignedTo ?? '').toLowerCase().includes(s) ||
    i.reportedBy.toLowerCase().includes(s)
  )
}

function groupCount<T extends string>(items: IssueItem[], key: (i: IssueItem) => T) {
  const out = new Map<T, number>()
  for (const i of items) out.set(key(i), (out.get(key(i)) ?? 0) + 1)
  return Array.from(out.entries()).map(([name, value]) => ({ name, value }))
}

export function IssuesPage() {
  const { role, user } = useAuth()
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const projects = useProjectsStore((s) => s.projects)
  const setCurrentProjectId = useProjectsStore((s) => s.setCurrentProjectId)
  // Non-null alias – guards all store calls below
  const pid: string = currentProjectId ?? ''

  const issuesByProject = useIssueStore((s) => s.issuesByProject)
  const selectedId = useIssueStore((s) => s.selectedId)
  const setSelected = useIssueStore((s) => s.setSelected)
  const createIssue = useIssueStore((s) => s.createIssue)
  const updateIssue = useIssueStore((s) => s.updateIssue)
  const moveStatus = useIssueStore((s) => s.moveStatus)
  const verifyIssue = useIssueStore((s) => s.verifyIssue)
  const closeIssue = useIssueStore((s) => s.closeIssue)
  const setFilters = useIssueStore((s) => s.setFilters)
  const fetchIssues = useIssueStore((s) => s.fetchIssues)
  const issuesLoadStatus = useIssueStore((s) => s.loadStatus)
  const issuesLoadError = useIssueStore((s) => s.loadError)
  const filterStatus = useIssueStore((s) => s.filterStatus)
  const filterSeverity = useIssueStore((s) => s.filterSeverity)
  const filterCategory = useIssueStore((s) => s.filterCategory)
  const search = useIssueStore((s) => s.search)

  const createRfi = useRfiStore((s) => s.createRfi)

  // State declarations
  const [createOpen, setCreateOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [assignTo, setAssignTo] = useState('')
  const [assignSearch, setAssignSearch] = useState('')
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role: string }[]>([])
  const [assignDropOpen, setAssignDropOpen] = useState(false)
  const afterPhotoRef = useRef<HTMLInputElement | null>(null)
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null)
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null)
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null)
  const [beforePhotoPreview, setBeforePhotoPreview] = useState<string | null>(null)
  const beforePhotoRef = useRef<HTMLInputElement | null>(null)

  // Fetch issues when project changes
  useEffect(() => {
    void fetchIssues(currentProjectId)
  }, [currentProjectId, fetchIssues])

  // Fetch team members and external contacts when project changes
  useEffect(() => {
    if (!currentProjectId) return
    Promise.all([
      apiGetTeam(currentProjectId).catch(() => ({ members: [] })),
      listProjectContacts(currentProjectId).catch(() => ({ contacts: [] }))
    ]).then(([teamRes, contactsRes]) => {
      const team = (teamRes.members ?? []) as { id: string; name: string; role?: string }[]
      const contacts = contactsRes.contacts ?? []
      
      const combined: { id: string; name: string; role: string }[] = team.map((m) => ({ 
        id: m.id, 
        name: m.name, 
        role: m.role ?? 'member' 
      }))

      for (const c of contacts) {
        if (!combined.some(m => m.name === c.name)) {
          combined.push({
            id: c.id ?? c._id ?? `contact-${Math.random()}`,
            name: c.name ?? 'Unknown',
            role: c.contactType || c.role || 'Contact'
          })
        }
      }

      setTeamMembers(combined)
    })
  }, [currentProjectId])

  const filteredTeam = useMemo(() => {
    if (!assignSearch.trim()) return teamMembers
    const q = assignSearch.toLowerCase()
    return teamMembers.filter((m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))
  }, [teamMembers, assignSearch])

  const items = issuesByProject[currentProjectId ?? ''] ?? []
  const filtered = useMemo(() => {
    return items
      .filter((i) => (filterStatus === 'All' ? true : i.status === filterStatus))
      .filter((i) => (filterSeverity === 'All' ? true : i.severity === filterSeverity))
      .filter((i) => (filterCategory === 'All' ? true : i.category === filterCategory))
      .filter((i) => matchesText(i, search))
  }, [items, filterStatus, filterSeverity, filterCategory, search])

  const metrics = useMemo(() => computeIssueMetrics(items), [items])

  const selected = useMemo(() => {
    const fromAll = items.find((i) => i.id === selectedId) ?? null
    return fromAll
  }, [items, selectedId])

  const myKey = useMemo(() => {
    const name = user?.name?.trim()
    if (!name) return null
    return role === 'worker' ? `Worker — ${name}` : role === 'engineer' ? `Engineer — ${name}` : `Owner — ${name}`
  }, [role, user?.name])

  const mySubmitted = useMemo(() => {
    if (!myKey) return []
    return items.filter((i) => i.reportedBy === myKey)
  }, [items, myKey])

  const severityPie = useMemo(() => groupCount(items, (i) => i.severity), [items])
  const categoryBar = useMemo(() => groupCount(items, (i) => i.category), [items])

  const canManage = role === 'engineer' || role === 'owner'
  const canReport = role === 'engineer' || role === 'worker' || role === 'owner'

  const onOpenDetail = (id: string) => {
    setSelected(id)
    setDetailOpen(true)
  }

  const onCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '')
    const description = String(fd.get('description') ?? '')
    const category = String(fd.get('category') ?? 'Other') as IssueCategory
    const severity = String(fd.get('severity') ?? 'Medium') as IssueSeverity
    const location = String(fd.get('location') ?? '')
    const zone = String(fd.get('zone') ?? '').trim()
    const floor = String(fd.get('floor') ?? '').trim()
    const area = String(fd.get('area') ?? '').trim()
    const dueDays = Number(fd.get('dueDays') ?? 3)
    const attachment = beforePhotoFile?.name ?? String(fd.get('photoName') ?? '').trim()
    const reporter = myKey ?? (role === 'worker' ? 'Worker' : role === 'engineer' ? 'Engineer' : 'Owner')
    if (!currentProjectId) return
    createIssue({
      projectId: currentProjectId,
      title,
      description,
      category: ISSUE_CATEGORIES.includes(category) ? category : 'Other',
      severity: ISSUE_SEVERITIES.includes(severity) ? severity : 'Medium',
      location,
      zone: zone || undefined,
      floor: floor || undefined,
      area: area || undefined,
      dueDays: Number.isFinite(dueDays) ? dueDays : 3,
      reportedBy: reporter,
      attachmentName: attachment || undefined,
      attachmentUrl: beforePhotoPreview || undefined,
    })
    setCreateOpen(false)
    setBeforePhotoFile(null)
    setBeforePhotoPreview(null)
    e.currentTarget.reset()
  }

  const onVerify = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const notes = String(fd.get('notes') ?? '')
    const afterPhotoName = afterPhotoFile?.name ?? String(fd.get('afterPhotoName') ?? '').trim()
    if (!afterPhotoName) {
      return // require photo name or file
    }
    const verifier = myKey ?? (role === 'owner' ? 'Owner' : 'Engineer')
    verifyIssue(pid, selected.id, verifier, notes, afterPhotoName || undefined, afterPhotoPreview || undefined)
    setVerifyOpen(false)
    setAfterPhotoFile(null)
    setAfterPhotoPreview(null)
    e.currentTarget.reset()
  }



  const convertToRfi = () => {
    if (!selected || !currentProjectId) return
    createRfi(currentProjectId, {
      title: `Clarification needed: ${selected.title}`,
      description: selected.description,
      category: 'General',
      priority: selected.severity === 'Critical' ? 'Critical' : selected.severity === 'High' ? 'High' : selected.severity === 'Medium' ? 'Medium' : 'Low',
      assignedTo: 'Architect / Consultant',
      raisedBy: myKey ?? 'Engineer',
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: selected.location,
      linkedTask: selected.linkedTask,
      linkedPhase: selected.linkedPhase,
      linkedDoc: `Converted from issue ${selected.id}`,
      attachments: [],
    })
  }

  const Header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">Issues</h1>
        <p className="mt-1 text-sm text-muted">
          Quality, safety, material issues, rework & snags — with verification before close.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">

        {canReport ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create new issue
          </Button>
        ) : null}
      </div>
    </div>
  )

  const Summary = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted">Open issues</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{metrics.openIssues}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted">Critical</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{metrics.criticalIssues}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted">Overdue</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{metrics.overdueIssues}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted">Resolved this week</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{metrics.resolvedThisWeek}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted">Verification pending</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{metrics.verificationPending}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted">Avg resolution (days)</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{metrics.avgResolutionDays}</CardContent>
      </Card>
    </div>
  )

  const Filters = (
    <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm">
          <Filter className="size-4 text-[color:var(--color-text_secondary)]" />
          <select style={{ colorScheme: 'dark' }}
            className="bg-transparent text-sm outline-none"
            value={filterStatus}
            onChange={(e) => setFilters({ filterStatus: e.target.value as IssueStatus | 'All' })}
          >
            <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="All">All status</option>
            {ISSUE_STATUSES.map((s) => (
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm">
          <Flag className="size-4 text-[color:var(--color-text_secondary)]" />
          <select style={{ colorScheme: 'dark' }}
            className="bg-transparent text-sm outline-none"
            value={filterSeverity}
            onChange={(e) => setFilters({ filterSeverity: e.target.value as IssueSeverity | 'All' })}
          >
            <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="All">All severity</option>
            {ISSUE_SEVERITIES.map((s) => (
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm">
          <Layers className="size-4 text-[color:var(--color-text_secondary)]" />
          <select style={{ colorScheme: 'dark' }}
            className="bg-transparent text-sm outline-none"
            value={filterCategory}
            onChange={(e) => setFilters({ filterCategory: e.target.value as IssueCategory | 'All' })}
          >
            <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" value="All">All categories</option>
            {ISSUE_CATEGORIES.map((s) => (
              <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm">
          <Search className="size-4 text-[color:var(--color-text_secondary)]" />
          <input
            className="w-56 bg-transparent text-sm outline-none"
            placeholder="Search issues"
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
      </div>
    </div>
  )

  const Kanban = (
    <div className="-mx-1 overflow-x-auto pb-3">
      <div className="flex gap-3 px-1">
        {ISSUE_STATUSES.map((col) => {
          const colItems = filtered.filter((i) => i.status === col)
          return (
            <div key={col} className="flex min-w-[150px] flex-1 shrink-0 flex-col">
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 shadow-sm">
                <span className="flex-1 truncate text-xs font-bold text-[color:var(--color-text_secondary)]">{col}</span>
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-surface_hover)] text-[11px] font-bold text-[color:var(--color-text_secondary)]">{colItems.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {colItems.length ? (
                  colItems.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => onOpenDetail(i.id)}
                      className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 text-left shadow-sm transition hover:shadow-md hover:border-[color:var(--color-primary)] hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-1">
                        {severityBadge(i.severity)}
                        <span className="max-w-[70px] overflow-hidden truncate font-mono text-[10px] text-[color:var(--color-text_muted)]">
                          {i.issue_id || i.id.slice(-6)}
                        </span>
                      </div>
                      <div className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-[color:var(--color-text)]">{i.title}</div>
                      <div className="mt-1 truncate text-[11px] text-[color:var(--color-text_secondary)]">
                        {i.location || 'No location'}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-[color:var(--color-text_secondary)]">
                        {i.assignedTo ?? 'Unassigned'}
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-[color:var(--color-text_muted)]">
                        <Timer className="size-3 shrink-0" />
                        <span className="truncate">{formatDate(i.dueAt)}</span>
                      </div>
                      {isBlocked(i) ? (
                        <div className="mt-1 rounded-full bg-rose-50 px-2 py-0.5 text-center text-[10px] font-semibold text-rose-700">
                          Blocked tasks
                        </div>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-3 text-center text-[11px] text-[color:var(--color-text_muted)]">
                    Empty
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )



  const Analytics = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Severity distribution</CardTitle>
          <CardDescription>Owner-friendly risk view.</CardDescription>
        </CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={severityPie} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
                {severityPie.map((entry) => (
                  <Cell key={entry.name} fill={severityColor[entry.name as IssueSeverity] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Issues by category</CardTitle>
        </CardHeader>
        <CardContent className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryBar}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )

  const IssueDetailsContent = selected ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {severityBadge(selected.severity)}
        {statusBadge(selected.status)}
        {isBlocked(selected) ? (
          <Badge variant="danger">Linked tasks blocked</Badge>
        ) : (
          <Badge variant="muted">No blocking</Badge>
        )}
      </div>
      <div>
        <div className="text-base font-semibold text-[color:var(--color-text)]">{selected.title}</div>
        <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">{selected.description}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--color-border)] p-3">
          <div className="text-xs text-muted">Reported by</div>
          <div className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <Link to={`/contacts?search=${encodeURIComponent(selected.reportedBy)}`} className="hover:underline">
              {selected.reportedBy}
            </Link>
          </div>
          <div className="mt-1 text-xs text-muted">{formatDate(selected.raisedAt)}</div>
        </div>
        <div className="rounded-xl border border-[color:var(--color-border)] p-3">
          <div className="text-xs text-muted">Assigned to</div>
          <div className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
            {selected.assignedTo ? (
              <Link to={`/contacts?search=${encodeURIComponent(selected.assignedTo)}`} className="hover:underline">
                {selected.assignedTo}
              </Link>
            ) : (
              <span className="text-[color:var(--color-text)]">Unassigned</span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted">Due {formatDate(selected.dueAt)}</div>
        </div>
      </div>

      {canManage && selected.status !== 'Verified' && selected.status !== 'Closed' ? (
        <div className="rounded-xl border border-[color:var(--color-border)] p-3">
          <div className="text-xs font-semibold text-[color:var(--color-text)]">Assignment</div>
          <div className="mt-2 flex flex-col gap-2">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 shadow-sm">
                <Search className="size-4 shrink-0 text-[color:var(--color-text_muted)]" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--color-text_muted)]"
                  placeholder="Search team member…"
                  value={assignSearch}
                  onChange={(e) => { setAssignSearch(e.target.value); setAssignDropOpen(true) }}
                  onFocus={() => setAssignDropOpen(true)}
                />
                {assignSearch && (
                  <button type="button" onClick={() => { setAssignSearch(''); setAssignTo(''); setAssignDropOpen(false) }}>
                    <X className="size-4 text-[color:var(--color-text_muted)]" />
                  </button>
                )}
              </div>
              {assignDropOpen && filteredTeam.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-44 overflow-y-auto rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-lg">
                  {filteredTeam.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[color:var(--color-surface_hover)]"
                      onClick={() => {
                        setAssignTo(m.name)
                        setAssignSearch(m.name)
                        setAssignDropOpen(false)
                      }}
                    >
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 font-medium">{m.name}</span>
                      <span className="text-xs capitalize text-[color:var(--color-text_muted)]">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}
              {assignDropOpen && filteredTeam.length === 0 && assignSearch.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-3 shadow-lg">
                  <p className="text-xs text-[color:var(--color-text_muted)]">No team members found. You can still type a name manually.</p>
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!selected) return
                const next = (assignTo || assignSearch).trim()
                if (!next) return
                updateIssue(pid, selected.id, { assignedTo: next })
                moveStatus(pid, selected.id, 'Assigned', myKey ?? 'Engineer', `Assigned to ${next}`)
                setAssignTo('')
                setAssignSearch('')
                setAssignDropOpen(false)
              }}
            >
              <UserPlus className="size-4" />
              Assign to {assignTo || assignSearch || '…'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[color:var(--color-border)] p-3">
        <div className="text-xs font-semibold text-[color:var(--color-text)]">Attachments</div>
        <div className="mt-2 space-y-1">
          {selected.attachments.length ? (
            selected.attachments.map((a) => (
              <div key={a.id} className="flex flex-col text-xs space-y-2 border-b border-[color:var(--color-border)] last:border-0 pb-2 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--color-text_secondary)] font-medium">{a.name}</span>
                  <span className="text-muted">{a.kind}{a.stage ? ` · ${a.stage}` : ''}</span>
                </div>
                {a.kind === 'photo' ? (
                  <img src={a.url || `https://images.unsplash.com/photo-1541888087525-071c00c335e3?w=800&q=80`} alt={a.name} className="mt-1 w-full max-h-48 object-cover rounded-md bg-[color:var(--color-bg)]" />
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-xs text-muted">No attachments.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--color-border)] p-3">
        <div className="text-xs font-semibold text-[color:var(--color-text)]">Progress log</div>
        <div className="mt-2 space-y-2">
          {selected.progressLog.slice(-6).map((l) => (
            <div key={l.id} className="rounded-lg bg-[color:var(--color-surface_hover)] p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[color:var(--color-text)]">{l.status}</span>
                <span className="text-muted">{formatDate(l.at)}</span>
              </div>
              <div className="mt-1 text-[color:var(--color-text_secondary)]">{l.note}</div>
              <div className="mt-1 text-muted">— {l.author}</div>
            </div>
          ))}
        </div>
      </div>

      {selected.status === 'Resolved' || selected.status === 'Verified' || selected.status === 'Closed' ? (
        <div className="rounded-xl border border-[color:var(--color-border)] p-3">
          <div className="text-xs font-semibold text-[color:var(--color-text)]">Verification</div>
          <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
            {selected.verification ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="font-semibold">Verified</span>
                </div>
                <div className="text-muted">
                  {selected.verification.verifiedBy} · {formatDate(selected.verification.verifiedAt)}
                </div>
                <div>{selected.verification.notes}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Timer className="size-4 text-amber-600" />
                <span>Verification pending (requires after photo before close).</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => moveStatus(pid, selected.id, 'In Progress', myKey ?? (role === 'owner' ? 'Owner' : 'Engineer'), 'Work started.')}
            disabled={selected.status === 'In Progress' || selected.status === 'Closed'}
          >
            <Timer className="size-4" />
            Mark in progress
          </Button>
          <Button
            variant="secondary"
            onClick={() => moveStatus(pid, selected.id, 'Resolved', myKey ?? (role === 'owner' ? 'Owner' : 'Engineer'), 'Resolution completed; pending verification.')}
            disabled={selected.status === 'Resolved' || selected.status === 'Verified' || selected.status === 'Closed'}
          >
            <CheckCircle2 className="size-4" />
            Mark resolved
          </Button>
          <Button
            onClick={() => setVerifyOpen(true)}
            disabled={selected.status !== 'Resolved'}
          >
            <ShieldAlert className="size-4" />
            Verify (after photo)
          </Button>
          <Button
            variant="secondary"
            onClick={() => closeIssue(pid, selected.id, myKey ?? 'Engineer')}
            disabled={selected.status !== 'Verified'}
          >
            Close
          </Button>
          <Button variant="ghost" onClick={convertToRfi}>
            Convert to RFI
          </Button>
        </div>
      ) : null}
    </div>
  ) : null

  const MainLayout = (
    <div className="space-y-6">
      {Header}
      {Filters}
      {Summary}
      {role !== 'worker' ? Analytics : null}
      <div className="space-y-6">
        {Kanban}
      </div>
    </div>
  )

  const EngineerLayout = MainLayout
  const OwnerLayout = MainLayout

  const WorkerLayout = (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">Report issues</h1>
          <p className="mt-1 text-sm text-muted">Quick reporting + track your submitted issues.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm shadow-sm">
            <Layers className="size-4 text-[color:var(--color-text_secondary)]" />
            <select style={{ colorScheme: 'dark' }}
              className="bg-transparent text-sm outline-none"
              value={currentProjectId}
              onChange={(e) => setCurrentProjectId(e.target.value)}
            >
              {Object.values(projects).map((p) => (
                <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Report new issue
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">My open reports</CardTitle>
            <CardDescription>Only issues you submitted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mySubmitted.length ? (
              mySubmitted
                .filter((i) => i.status !== 'Closed')
                .slice(0, 10)
                .map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onOpenDetail(i.id)}
                    className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 text-left shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {severityBadge(i.severity)}
                      {statusBadge(i.status)}
                      <span className="font-mono text-xs text-[color:var(--color-text_muted)]">{i.id}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{i.title}</div>
                    <div className="mt-1 text-xs text-muted">{i.location}</div>
                  </button>
                ))
            ) : (
              <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-3 text-sm text-muted">
                No reports yet.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">My submitted issues status</CardTitle>
            <CardDescription>Submitted → Under review → Assigned → Resolved</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mySubmitted.slice(0, 6).map((i) => (
              <div key={i.id} className="rounded-xl border border-[color:var(--color-border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-[color:var(--color-text_muted)]">{i.id}</span>
                  {statusBadge(i.status)}
                </div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{i.title}</div>
                <div className="mt-1 text-xs text-muted">{formatDate(i.raisedAt)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {issuesLoadStatus === 'loading' ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3 shadow-2xl">
          <div className="size-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent"></div>
          <span className="text-sm font-medium text-[color:var(--color-text)]">Loading issues…</span>
        </div>
      ) : null}
      {issuesLoadStatus === 'error' && issuesLoadError ? (
        <Card className="border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/5 shadow-none">
          <CardContent className="p-4 text-sm font-semibold text-[color:var(--color-error)]">{issuesLoadError}</CardContent>
        </Card>
      ) : null}
      {role === 'worker' ? WorkerLayout : role === 'owner' ? OwnerLayout : EngineerLayout}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={role === 'worker' ? 'Report new issue' : 'Create new issue'}
        description="Keep it short; include location and a photo name for verification trail."
        className="max-w-2xl"
        footer={
          <Button type="submit" form="issue-create-form">
            <ShieldAlert className="size-4" />
            Submit
          </Button>
        }
      >
        <form id="issue-create-form" className="space-y-4" onSubmit={onCreate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="title">
                Title
              </label>
              <Input id="title" name="title" placeholder="e.g., Honeycombing at shear wall" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="location">
                Site location
              </label>
              <Input id="location" name="location" placeholder="Zone / Floor / Area" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-800" htmlFor="description">
              Description
            </label>
            <textarea id="description" name="description" className={`${field} min-h-[100px]`} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="category">
                Category
              </label>
              <select style={{ colorScheme: 'dark' }} id="category" name="category" className={field} defaultValue="Quality">
                {ISSUE_CATEGORIES.map((c) => (
                  <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="severity">
                Severity
              </label>
              <select style={{ colorScheme: 'dark' }} id="severity" name="severity" className={field} defaultValue="Medium">
                {ISSUE_SEVERITIES.map((s) => (
                  <option className="bg-[color:var(--color-bg)] text-[color:var(--color-text)]" key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="dueDays">
                Due (days)
              </label>
              <Input id="dueDays" name="dueDays" type="number" min={1} defaultValue={3} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="zone">
                Site zone
              </label>
              <Input id="zone" name="zone" placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="floor">
                Floor
              </label>
              <Input id="floor" name="floor" placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="area">
                Area
              </label>
              <Input id="area" name="area" placeholder="Optional" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-800">
                Upload photo
              </label>
              <input
                ref={beforePhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setBeforePhotoFile(file)
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => setBeforePhotoPreview(reader.result as string)
                    reader.readAsDataURL(file)
                  } else {
                    setBeforePhotoPreview(null)
                  }
                }}
              />
              {beforePhotoPreview ? (
                <div className="mt-2 relative inline-block">
                  <img src={beforePhotoPreview} alt="Preview" className="h-24 w-auto rounded-lg border border-slate-200 object-cover shadow-sm" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -right-2 -top-2 size-6 rounded-full"
                    onClick={() => {
                      setBeforePhotoFile(null)
                      setBeforePhotoPreview(null)
                      if (beforePhotoRef.current) beforePhotoRef.current.value = ''
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 w-full border-dashed"
                  onClick={() => beforePhotoRef.current?.click()}
                >
                  <Upload className="mr-2 size-4" />
                  Select photo
                </Button>
              )}
            </div>
            {role === 'engineer' ? (
              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface_hover)] p-3 text-xs text-muted">
                <div className="flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                  <UserPlus className="size-4" />
                  Assignments and bulk updates are managed from the issue details panel.
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface_hover)] p-3 text-xs text-muted">
                Optional voice note can be attached in next iteration.
              </div>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selected ? `${selected.id} — ${selected.title}` : 'Issue details'}
        description={selected ? `${selected.category} · ${selected.location}` : undefined}
        className="max-w-3xl"
        footer={
          selected && role !== 'engineer' && role !== 'owner' ? (
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          ) : null
        }
      >
        {selected ? (
          IssueDetailsContent
        ) : (
          <div className="text-sm text-muted">No issue selected.</div>
        )}
      </Modal>

      <Modal
        open={verifyOpen}
        onOpenChange={(o) => { setVerifyOpen(o); if (!o) { setAfterPhotoFile(null); setAfterPhotoPreview(null) } }}
        title="Verify resolution"
        description={`Only engineers and owners can verify. Upload an after-photo to confirm the fix is complete.`}
        footer={
          <Button type="submit" form="issue-verify-form" disabled={!afterPhotoFile && !afterPhotoPreview}>
            <CheckCircle2 className="size-4" />
            Verify & Close
          </Button>
        }
      >
        <form id="issue-verify-form" className="space-y-4" onSubmit={onVerify}>
          {/* Who verifies callout */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-800">Verification required</p>
              <p className="mt-0.5 text-xs text-blue-600">The assigned engineer or owner must physically inspect the fix and upload an after-photo before this issue can be closed.</p>
            </div>
          </div>

          {/* After photo upload */}
          <div>
            <label className="text-sm font-medium text-slate-800">After photo <span className="text-red-500">*</span></label>
            <input
              ref={afterPhotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setAfterPhotoFile(file)
                if (file) {
                  const reader = new FileReader()
                  reader.onload = () => setAfterPhotoPreview(reader.result as string)
                  reader.readAsDataURL(file)
                } else {
                  setAfterPhotoPreview(null)
                }
              }}
            />
            {afterPhotoPreview ? (
              <div className="relative mt-2">
                <img src={afterPhotoPreview} alt="After photo preview" className="h-48 w-full rounded-xl object-cover ring-1 ring-slate-200" />
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-full bg-[color:var(--color-card)] p-1 shadow ring-1 ring-slate-200"
                  onClick={() => { setAfterPhotoFile(null); setAfterPhotoPreview(null) }}
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[color:var(--color-border)] py-8 text-sm text-[color:var(--color-text_secondary)] hover:border-blue-300 hover:text-blue-600 transition-colors"
                onClick={() => afterPhotoRef.current?.click()}
              >
                <ImagePlus className="size-5" />
                Click to upload after-photo
              </button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800" htmlFor="notes">
              Verification notes
            </label>
            <textarea id="notes" name="notes" className={`${field} min-h-[90px]`} placeholder="Describe what was inspected and confirmed fixed…" />
          </div>
        </form>
      </Modal>
    </div>
  )
}



