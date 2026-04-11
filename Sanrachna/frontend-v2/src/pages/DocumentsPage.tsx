import {
  AlertTriangle,
  Archive,
  Bot,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GitCompare,
  Link2,
  Lock,
  Search,
  Send,
  Shield,
  Upload,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { fetchWorkspaceDocuments } from '@/api/resources'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useActiveProject } from '@/hooks/useActiveProject'
import type { AccessLevel, DocKind, DocPhase, ProjectDocument } from '@/types/documents.types'
import { cn } from '@/utils/cn'

type ComplianceAlert = { id: string; severity: 'critical' | 'warning' | 'info'; text: string }

type VersionFilter = 'latest' | 'all'
type DateRangeFilter = 'all' | '7d' | '30d' | '90d'

type TableRow = {
  key: string
  doc: ProjectDocument
  displayVersion: number
  versionLabel: string
  rowUploadedAt: string
  rowUploadedBy: string
}

function docIcon(type: DocKind) {
  switch (type) {
    case 'Invoice':
      return <FileSpreadsheet className="size-4 text-[color:var(--color-success)]" />
    case 'Contract':
    case 'Permit':
      return <FileText className="size-4 text-[color:var(--color-info)]" />
    default:
      return <FileText className="size-4 text-[color:var(--color-warning)]" />
  }
}

function reviewPill(status: ProjectDocument['reviewStatus']) {
  const map = {
    Approved: 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]',
    'Under Review': 'bg-[color:var(--color-info)]/12 text-[color:var(--color-info)]',
    'Requires Attention': 'bg-[color:var(--color-error)]/12 text-[color:var(--color-error)]',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', map[status])}>{status}</span>
  )
}

function accessPill(access: AccessLevel) {
  const map = {
    Restricted: 'bg-slate-100 text-[color:var(--color-text_secondary)]',
    'Public-to-Team': 'bg-[color:var(--color-primary_light)]/25 text-[color:var(--color-primary_dark)]',
    'Owner+PM': 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', map[access])}>{access}</span>
  )
}

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function inDateRange(uploadedAt: string, range: DateRangeFilter, anchor: Date) {
  if (range === 'all') return true
  const u = parseDate(uploadedAt).getTime()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const min = anchor.getTime() - days * 24 * 60 * 60 * 1000
  return u >= min
}

function deriveDocumentStats(docs: ProjectDocument[], anchor: Date) {
  const weekAgo = anchor.getTime() - 7 * 24 * 60 * 60 * 1000
  let updatedThisWeek = 0
  for (const d of docs) {
    if (parseDate(d.uploadedAt).getTime() >= weekAgo) updatedThisWeek++
  }
  const pendingReview = docs.filter((d) => d.reviewStatus !== 'Approved').length
  const archivedVersions = docs.reduce((a, d) => a + d.versions.filter((v) => v.archived).length, 0)
  return {
    totalDocuments: docs.length,
    updatedThisWeek,
    pendingReview,
    archivedVersions,
  }
}

function deriveRecentEvents(docs: ProjectDocument[], limit: number) {
  const events: { id: string; label: string; time: string }[] = []
  for (const d of docs) {
    const latest = d.versions.find((v) => v.version === d.currentVersion) ?? d.versions[0]
    if (latest) {
      events.push({
        id: `${d.id}_v${latest.version}`,
        label: `${d.name} · v${latest.version}`,
        time: latest.uploadedAt,
      })
    }
  }
  return events.sort((a, b) => parseDate(b.time).getTime() - parseDate(a.time).getTime()).slice(0, limit)
}

function buildRows(docs: ProjectDocument[], versionFilter: VersionFilter): TableRow[] {
  const rows: TableRow[] = []
  for (const doc of docs) {
    if (versionFilter === 'latest') {
      const latest = doc.versions.find((v) => v.version === doc.currentVersion) ?? doc.versions[0]
      rows.push({
        key: doc.id,
        doc,
        displayVersion: doc.currentVersion,
        versionLabel: `v${doc.currentVersion}`,
        rowUploadedAt: latest?.uploadedAt ?? doc.uploadedAt,
        rowUploadedBy: latest?.uploadedBy ?? doc.uploadedBy,
      })
      continue
    }
    const sorted = [...doc.versions].sort((a, b) => b.version - a.version)
    for (const v of sorted) {
      rows.push({
        key: `${doc.id}_v${v.version}`,
        doc,
        displayVersion: v.version,
        versionLabel: `v${v.version}${v.version === doc.currentVersion ? ' (Latest)' : ''}`,
        rowUploadedAt: v.uploadedAt,
        rowUploadedBy: v.uploadedBy,
      })
    }
  }
  return rows.sort((a, b) => parseDate(b.rowUploadedAt).getTime() - parseDate(a.rowUploadedAt).getTime())
}

export function DocumentsPage() {
  const { role } = useAuth()
  const isOwner = role === 'owner'
  const { projectId } = useActiveProject()

  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([])
  const [statsFromApi, setStatsFromApi] = useState<Record<string, number> | undefined>(undefined)
  const [docEventsFromApi, setDocEventsFromApi] = useState<{ id: string; label: string; time: string }[] | undefined>(undefined)
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [phase, setPhase] = useState<'all' | DocPhase>('all')
  const [kind, setKind] = useState<'all' | DocKind>('all')
  const [versionFilter, setVersionFilter] = useState<VersionFilter>('latest')
  const [accessFilter, setAccessFilter] = useState<'all' | AccessLevel>('all')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all')
  const [selected, setSelected] = useState<ProjectDocument | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(true)
  const [aiQuery, setAiQuery] = useState('')
  const [aiHint, setAiHint] = useState<string | null>(null)

  const anchor = useMemo(() => new Date(), [])

  useEffect(() => {
    if (!projectId) {
      setProjectDocuments([])
      setStatsFromApi(undefined)
      setDocEventsFromApi(undefined)
      setComplianceAlerts([])
      setDocumentsError(null)
      setDocumentsLoading(false)
      return
    }
    let cancelled = false
    setDocumentsLoading(true)
    setDocumentsError(null)
    fetchWorkspaceDocuments(projectId)
      .then((d) => {
        if (cancelled) return
        setProjectDocuments(d.documents)
        setStatsFromApi(d.stats)
        setDocEventsFromApi(d.events)
        setComplianceAlerts((d.complianceAlerts as ComplianceAlert[]) ?? [])
      })
      .catch((e) => {
        if (cancelled) return
        setDocumentsError(e instanceof Error ? e.message : 'Could not load documents')
        setProjectDocuments([])
        setStatsFromApi(undefined)
        setDocEventsFromApi(undefined)
        setComplianceAlerts([])
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  const documentStats = useMemo(() => {
    if (statsFromApi && typeof statsFromApi.totalDocuments === 'number') {
      return {
        totalDocuments: statsFromApi.totalDocuments,
        updatedThisWeek: statsFromApi.updatedThisWeek ?? 0,
        pendingReview: statsFromApi.pendingReview ?? 0,
        archivedVersions: statsFromApi.archivedVersions ?? 0,
      }
    }
    return deriveDocumentStats(projectDocuments, anchor)
  }, [statsFromApi, projectDocuments, anchor])

  const recentDocumentEvents = useMemo(() => {
    if (docEventsFromApi?.length) return docEventsFromApi
    return deriveRecentEvents(projectDocuments, 8)
  }, [docEventsFromApi, projectDocuments])

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projectDocuments.filter((d) => {
      if (phase !== 'all' && d.phase !== phase) return false
      if (kind !== 'all' && d.type !== kind) return false
      if (accessFilter !== 'all' && d.access !== accessFilter) return false
      if (!inDateRange(d.uploadedAt, dateRange, anchor)) return false
      if (q) {
        const blob = [d.name, d.description, ...d.tags, d.type, d.phase].join(' ').toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [search, phase, kind, accessFilter, dateRange, anchor])

  const tableRows = useMemo(() => buildRows(filteredDocs, versionFilter), [filteredDocs, versionFilter])

  const runAiSearch = () => {
    const q = aiQuery.trim()
    if (!q) return
    setAiHint('Semantic document search is not connected yet. Use filters and the register, or wire an Ask-Docs endpoint to your backend.')
  }

  return (
    <div className="space-y-6">
      {!projectId ? (
        <Card>
          <CardContent className="py-6 text-sm text-[color:var(--color-text_secondary)]">
            Select a workspace project to load documents from <span className="font-mono text-xs">GET /api/v1/workspaces/&#123;id&#125;/documents</span>.
          </CardContent>
        </Card>
      ) : null}
      {documentsError ? (
        <Card className="border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-error)]">{documentsError}</CardContent>
        </Card>
      ) : null}
      {projectId && documentsLoading ? (
        <div className="text-sm text-[color:var(--color-text_secondary)]">Loading documents…</div>
      ) : null}

      {/* Top action bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            placeholder="Search documents, tags, keywords…"
            aria-label="Search documents"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            Upload Document
          </Button>
          <Button type="button" variant="secondary" onClick={() => setUploadOpen(true)}>
            Bulk Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAiHint('Export register requires a documents export endpoint — UI placeholder only.')}
          >
            Export Register
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document intelligence hub</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Phase-tagged files, version lineage, and links to RFIs/issues — not a generic drive.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text_secondary)] shadow-sm">
          <Filter className="size-3.5" />
          {filteredDocs.length} of {projectDocuments.length} shown
        </div>
      </div>

      {/* Filter row */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={phase}
              onChange={(e) => setPhase(e.target.value as 'all' | DocPhase)}
            >
              <option value="all">Phase — All</option>
              <option value="Design">Design</option>
              <option value="Foundation">Foundation</option>
              <option value="Structure">Structure</option>
              <option value="MEP">MEP</option>
              <option value="Finishing">Finishing</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as 'all' | DocKind)}
            >
              <option value="all">Type — All</option>
              <option value="Blueprint">Blueprint</option>
              <option value="Contract">Contract</option>
              <option value="Permit">Permit</option>
              <option value="Inspection">Inspection</option>
              <option value="Soil Report">Soil Report</option>
              <option value="Invoice">Invoice</option>
              <option value="Other">Other</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value as VersionFilter)}
            >
              <option value="latest">Version — Latest only</option>
              <option value="all">Version — All versions</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value as 'all' | AccessLevel)}
            >
              <option value="all">Access — All</option>
              <option value="Restricted">Restricted</option>
              <option value="Public-to-Team">Public-to-Team</option>
              <option value="Owner+PM">Owner+PM</option>
            </select>
            <select
              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
            >
              <option value="all">Date — Any</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total documents', value: documentStats.totalDocuments, sub: 'Across all phases' },
              { label: 'Updated this week', value: documentStats.updatedThisWeek, sub: 'New version or upload' },
              { label: 'Pending review', value: documentStats.pendingReview, sub: 'Drawings & contracts' },
              { label: 'Archived versions', value: documentStats.archivedVersions, sub: 'Retained for audit' },
            ].map((s) => (
              <Card key={s.label} className="transition hover:shadow-[var(--shadow-soft)]">
                <CardHeader className="pb-2">
                  <CardDescription>{s.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-[color:var(--color-text_muted)]">{s.sub}</CardContent>
              </Card>
            ))}
          </div>

          {/* Main table */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[color:var(--color-border)]">
              <CardTitle className="text-base">Project register</CardTitle>
              <CardDescription>Name · type · phase · version · ownership · access · workflow status</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Uploaded by</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Access</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-[color:var(--color-text_secondary)]">
                        No documents match filters.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row) => (
                      <tr
                        key={row.key}
                        className={cn(
                          'cursor-pointer transition hover:bg-slate-50/90',
                          selected?.id === row.doc.id && 'bg-[color:var(--color-primary_light)]/15',
                        )}
                        onClick={() => setSelected(row.doc)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {docIcon(row.doc.type)}
                            <div>
                              <div className="font-semibold text-[color:var(--color-text)]">{row.doc.name}</div>
                              <div className="text-xs text-[color:var(--color-text_muted)]">
                                RFIs {row.doc.linkedRfis} · Issues {row.doc.linkedIssues}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--color-text_secondary)]">{row.doc.type}</td>
                        <td className="px-4 py-3">{row.doc.phase}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
                              row.displayVersion === row.doc.currentVersion
                                ? 'bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary_dark)]'
                                : 'bg-slate-100 text-[color:var(--color-text_secondary)]',
                            )}
                          >
                            {row.versionLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--color-text_secondary)]">{row.rowUploadedBy}</td>
                        <td className="px-4 py-3 tabular-nums text-[color:var(--color-text_secondary)]">
                          {row.rowUploadedAt}
                        </td>
                        <td className="px-4 py-3">{accessPill(row.doc.access)}</td>
                        <td className="px-4 py-3">{reviewPill(row.doc.reviewStatus)}</td>
                        <td className="px-4 py-3 text-xs text-[color:var(--color-text_muted)]">
                          RFI {row.doc.linkedRfis} / Iss {row.doc.linkedIssues}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Sidebar: recent + compliance + AI */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent updates</CardTitle>
              <CardDescription>Activity feed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentDocumentEvents.length ? (
                recentDocumentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-[color:var(--color-text)]">{ev.label}</div>
                    <div className="text-xs text-[color:var(--color-text_muted)]">{ev.time}</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[color:var(--color-text_muted)]">No recent document activity yet.</p>
              )}
            </CardContent>
          </Card>

          {isOwner ? (
            <Card className="border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="size-4 text-[color:var(--color-warning)]" />
                  Compliance alerts
                </CardTitle>
                <CardDescription>Owner signals — permits & sign-offs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {complianceAlerts.length ? (
                  complianceAlerts.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'rounded-[var(--radius-xl)] border px-3 py-2 text-xs',
                        c.severity === 'critical' && 'border-[color:var(--color-error)]/40 bg-[color:var(--color-error)]/5',
                        c.severity === 'warning' && 'border-[color:var(--color-warning)]/40 bg-white',
                        c.severity === 'info' && 'border-[color:var(--color-border)] bg-white',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className={cn(
                            'mt-0.5 size-3.5 shrink-0',
                            c.severity === 'critical' && 'text-[color:var(--color-error)]',
                            c.severity === 'warning' && 'text-[color:var(--color-warning)]',
                            c.severity === 'info' && 'text-[color:var(--color-info)]',
                          )}
                        />
                        {c.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[color:var(--color-text_muted)]">No compliance alerts from the API.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="size-4 text-[color:var(--color-primary_dark)]" />
                Ask documents
              </CardTitle>
              <CardDescription>Natural search will use your Ask-Docs service when connected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder='e.g. "latest facade drawing"'
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && runAiSearch()}
                />
                <Button type="button" size="icon" variant="secondary" aria-label="Ask" onClick={runAiSearch}>
                  <Send className="size-4" />
                </Button>
              </div>
              {aiHint ? (
                <p className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3 text-xs text-[color:var(--color-text_secondary)]">
                  {aiHint}
                </p>
              ) : (
                <p className="text-xs text-[color:var(--color-text_muted)]">
                  Try: “Show me latest facade drawing” or “Find all permits expiring this month”.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Detail drawer */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Document details"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto border-l border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[color:var(--color-border)] p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold leading-snug">{selected.name}</h2>
                  <p className="mt-1 text-xs text-[color:var(--color-text_muted)]">{selected.id}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              <p className="mt-3 text-sm text-[color:var(--color-text_secondary)]">{selected.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[color:var(--color-bg)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--color-text_secondary)] ring-1 ring-[color:var(--color-border)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Phase</div>
                  <div className="mt-0.5 font-medium">{selected.phase}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Type</div>
                  <div className="mt-0.5 font-medium">{selected.type}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Access</div>
                  <div className="mt-1">{accessPill(selected.access)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Review</div>
                  <div className="mt-1">{reviewPill(selected.reviewStatus)}</div>
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">Linked in Sanrachna</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold ring-1 ring-[color:var(--color-border)]">
                    <Link2 className="size-3" /> RFIs referencing: {selected.linkedRfis}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold ring-1 ring-[color:var(--color-border)]">
                    <AlertTriangle className="size-3" /> Issues linked: {selected.linkedIssues}
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-left font-semibold"
                  onClick={() => setVersionsOpen((v) => !v)}
                >
                  <span>Version history</span>
                  {versionsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                {versionsOpen ? (
                  <ul className="mt-2 space-y-2 border-l-2 border-[color:var(--color-border)] pl-4">
                    {[...selected.versions].sort((a, b) => b.version - a.version).map((v) => (
                      <li key={v.version} className="relative text-sm">
                        <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-[color:var(--color-border_strong)]" />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">v{v.version}</span>
                          {v.version === selected.currentVersion ? (
                            <span className="rounded-full bg-[color:var(--color-primary)]/15 px-2 py-0.5 text-[11px] font-bold text-[color:var(--color-primary_dark)]">
                              Latest
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-text_secondary)]">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[color:var(--color-text_secondary)]">
                          {v.uploadedAt} · {v.uploadedBy}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" className="w-full">
                  <Eye className="size-4" />
                  View
                </Button>
                <Button type="button" variant="secondary" className="w-full">
                  <Download className="size-4" />
                  Download
                </Button>
                <Button type="button" variant="outline" className="w-full">
                  <GitCompare className="size-4" />
                  Compare
                </Button>
                <Button type="button" variant="outline" className="w-full">
                  <Archive className="size-4" />
                  Archive
                </Button>
                <Button type="button" variant="outline" className="col-span-2 w-full">
                  <Link2 className="size-4" />
                  Share link
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Upload modal */}
      {uploadOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Upload document"
          onClick={() => setUploadOpen(false)}
        >
          <Card className="relative w-full max-w-lg shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Add document</CardTitle>
              <CardDescription>Register a new revision — ties to phase, RFIs, and audit trail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="doc-title">
                  Title
                </label>
                <Input id="doc-title" className="mt-1.5" placeholder="e.g. Structural package Rev C" />
              </div>
              <div>
                <div className="text-sm font-medium">Attach file</div>
                <div className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-2xl)] border-2 border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-10 text-center transition hover:border-[color:var(--color-primary_light)]">
                  <Upload className="mx-auto size-8 text-[color:var(--color-text_muted)]" />
                  <p className="mt-2 text-sm text-[color:var(--color-text_secondary)]">
                    Drag & drop or <span className="font-semibold text-[color:var(--color-info)]">browse</span>
                  </p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs text-[color:var(--color-text_muted)]">
                    <Lock className="size-3" /> Demo only — files are not uploaded
                  </p>
                </div>
              </div>
              <Button type="button" className="w-full" onClick={() => setUploadOpen(false)}>
                Upload
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
