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
  FolderOpen,
  GitCompare,
  Link2,
  Lock,
  Search,
  Send,
  Shield,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'

import {
  bulkUploadProjectDocuments,
  downloadProjectDocumentFile,
  fetchProjectDocuments,
  getProjectDocumentObjectUrl,
  updateProjectDocument,
  uploadProjectDocument,
} from '@/api/documentsApi'
import { messageFromApiError } from '@/api/projectTeamApi'
import { useAuth } from '@/auth/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useActiveProject } from '@/hooks/useActiveProject'
import type { AccessLevel, DocKind, DocPhase, DocReviewStatus, ProjectDocument } from '@/types/documents.types'
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
  const canManage = role === 'owner' || role === 'engineer'
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
  const [refreshKey, setRefreshKey] = useState(0)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadPhase, setUploadPhase] = useState<DocPhase>('Design')
  const [uploadType, setUploadType] = useState<DocKind>('Other')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [bulkFiles, setBulkFiles] = useState<File[]>([])
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const anchor = useMemo(() => new Date(), [])

  const reloadDocuments = useCallback(() => setRefreshKey((k) => k + 1), [])

  const handleReviewAction = async (status: DocReviewStatus) => {
    if (!selected || !projectId) return
    try {
      const updated = await updateProjectDocument(projectId, selected.id, { reviewStatus: status })
      setProjectDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setSelected(updated)
      setAiHint(null)
    } catch (err) {
      setAiHint(messageFromApiError(err))
    }
  }

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
    fetchProjectDocuments(projectId)
      .then((d) => {
        if (cancelled) return
        setProjectDocuments(d.documents)
        setStatsFromApi(d.stats)
        setDocEventsFromApi(d.events)
        setComplianceAlerts((d.complianceAlerts as ComplianceAlert[]) ?? [])
      })
      .catch((e) => {
        if (cancelled) return
        setDocumentsError(messageFromApiError(e))
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
  }, [projectId, refreshKey])

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
  }, [projectDocuments, search, phase, kind, accessFilter, dateRange, anchor])

  const tableRows = useMemo(() => buildRows(filteredDocs, versionFilter), [filteredDocs, versionFilter])

  const runAiSearch = () => {
    const q = aiQuery.trim()
    if (!q) return
    setAiHint('Semantic document search is not connected yet. Use filters and the table, or wire an Ask-Docs endpoint to your backend.')
  }

  function suggestDownloadFilename(doc: ProjectDocument) {
    if (doc.originalFilename?.trim()) return doc.originalFilename.trim()
    return `${doc.name.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 120)}.bin`
  }

  const openUpload = (mode: 'single' | 'bulk') => {
    setUploadMode(mode)
    setUploadError(null)
    setUploadTitle('')
    setUploadPhase('Design')
    setUploadType('Other')
    setUploadDescription('')
    setUploadFile(null)
    setBulkFiles([])
    setUploadOpen(true)
  }

  const submitUpload = async () => {
    if (!projectId) return
    setUploadBusy(true)
    setUploadError(null)
    try {
      if (uploadMode === 'single') {
        const title = uploadTitle.trim() || uploadFile?.name.replace(/\.[^.]+$/, '') || ''
        if (!title) {
          setUploadError('Enter a title or choose a file.')
          return
        }
        if (!uploadFile) {
          setUploadError('Choose a file to upload.')
          return
        }
        await uploadProjectDocument(projectId, {
          title,
          phase: uploadPhase,
          type: uploadType,
          description: uploadDescription,
          file: uploadFile,
        })
      } else if (!bulkFiles.length) {
        setUploadError('Add at least one file.')
        return
      } else {
        await bulkUploadProjectDocuments(projectId, bulkFiles, {
          phase: uploadPhase,
          type: uploadType,
        })
      }
      setUploadOpen(false)
      reloadDocuments()
    } catch (e) {
      setUploadError(messageFromApiError(e))
    } finally {
      setUploadBusy(false)
    }
  }

  const handleViewDoc = async (e: MouseEvent<HTMLButtonElement>, doc: ProjectDocument) => {
    e.stopPropagation()
    if (!projectId || !doc.fileUrl) return
    setPreviewLoading(true)
    setPreviewTitle(doc.name)
    setPreviewUrl(null)
    setFilePreviewOpen(true)
    try {
      const url = await getProjectDocumentObjectUrl(projectId, doc.id)
      setPreviewUrl(url)
    } catch (err) {
      setAiHint(messageFromApiError(err))
      setFilePreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const [filePreviewOpen, setFilePreviewOpen] = useState(false)
  const closePreview = () => {
    setFilePreviewOpen(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleDownloadDoc = async (e: MouseEvent<HTMLButtonElement>, doc: ProjectDocument) => {
    e.stopPropagation()
    if (!projectId || !doc.fileUrl) return
    try {
      await downloadProjectDocumentFile(projectId, doc.id, suggestDownloadFilename(doc))
    } catch (err) {
      setAiHint(messageFromApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      {!projectId ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white py-20 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
            <FolderOpen className="size-7 text-[color:var(--color-text_muted)]" />
          </div>
          <h2 className="text-lg font-bold">No project selected</h2>
          <p className="mt-2 max-w-xs text-sm text-[color:var(--color-text_secondary)]">
            Select or create a project from the top of the sidebar, then come back here to manage your documents.
          </p>
        </div>
      ) : null}
      {documentsError ? (
        <Card className="border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-error)]">{documentsError}</CardContent>
        </Card>
      ) : null}
      {projectId && documentsLoading ? (
        <div className="text-sm text-[color:var(--color-text_secondary)]">Loading documents…</div>
      ) : null}

      {/* Page heading */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Phase-tagged files, version lineage, and links to RFIs/issues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => openUpload('single')}>
            <Upload className="size-4" />
            Upload Document
          </Button>
          <Button type="button" variant="secondary" onClick={() => openUpload('bulk')}>
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Search + filter count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          {(search || phase !== 'all' || kind !== 'all' || accessFilter !== 'all' || dateRange !== 'all') && (
            <div className="flex flex-1 items-center gap-2 overflow-x-auto text-sm">
              {search ? (
                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-xl)] bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                  <span className="max-w-[120px] truncate">"{search}"</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-indigo-100"
                    onClick={() => setSearch('')}
                    title="Clear search"
                  >
                    <X className="size-3 cursor-pointer" />
                  </button>
                </div>
              ) : null}
              {phase !== 'all' ? (
                <div className="inline-flex items-center gap-1 rounded-[var(--radius-xl)] border border-[color:var(--color-border_strong)] bg-[color:var(--color-bg)] px-2.5 py-1 text-xs font-semibold">
                  <span className="text-[color:var(--color-text_secondary)]">Phase:</span> {phase}
                  <button type="button" onClick={() => setPhase('all')}>
                    <X className="ml-1 size-3 cursor-pointer" />
                  </button>
                </div>
              ) : null}
              {kind !== 'all' ? (
                <div className="inline-flex items-center gap-1 rounded-[var(--radius-xl)] border border-[color:var(--color-border_strong)] bg-[color:var(--color-bg)] px-2.5 py-1 text-xs font-semibold">
                  <span className="text-[color:var(--color-text_secondary)]">Type:</span> {kind}
                  <button type="button" onClick={() => setKind('all')}>
                    <X className="ml-1 size-3 cursor-pointer" />
                  </button>
                </div>
              ) : null}
              {accessFilter !== 'all' ? (
                <div className="inline-flex items-center gap-1 rounded-[var(--radius-xl)] border border-[color:var(--color-border_strong)] bg-[color:var(--color-bg)] px-2.5 py-1 text-xs font-semibold">
                  <span className="text-[color:var(--color-text_secondary)]">Access:</span> {accessFilter}
                  <button type="button" onClick={() => setAccessFilter('all')}>
                    <X className="ml-1 size-3 cursor-pointer" />
                  </button>
                </div>
              ) : null}
              {dateRange !== 'all' ? (
                <div className="inline-flex items-center gap-1 rounded-[var(--radius-xl)] border border-[color:var(--color-border_strong)] bg-[color:var(--color-bg)] px-2.5 py-1 text-xs font-semibold">
                  <span className="text-[color:var(--color-text_secondary)]">Date:</span> {dateRange}
                  <button type="button" onClick={() => setDateRange('all')}>
                    <X className="ml-1 size-3 cursor-pointer" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
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
                    <th className="px-4 py-3 text-right">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-[color:var(--color-text_secondary)]">
                            {projectDocuments.length === 0
                              ? 'No documents uploaded yet. Click "Upload Document" to get started.'
                              : 'No documents match your current filters.'}
                          </p>
                          {projectDocuments.length > 0 && (
                            <button
                              type="button"
                              className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium hover:bg-slate-50"
                              onClick={() => {
                                setSearch('')
                                setPhase('all')
                                setKind('all')
                                setAccessFilter('all')
                                setDateRange('all')
                              }}
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={row.doc.fileUrl ? 'View file' : 'No file attached'}
                              disabled={!row.doc.fileUrl}
                              aria-label="View document file"
                              onClick={(e) => void handleViewDoc(e, row.doc)}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={row.doc.fileUrl ? 'Download' : 'No file attached'}
                              disabled={!row.doc.fileUrl}
                              aria-label="Download document file"
                              onClick={(e) => void handleDownloadDoc(e, row.doc)}
                            >
                              <Download className="size-4" />
                            </Button>
                          </div>
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
                  <div className="mt-1 flex items-center gap-2">
                    {reviewPill(selected.reviewStatus)}
                    {canManage && (
                      <select
                        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-0.5 text-xs font-medium text-[color:var(--color-text)] outline-none focus:ring-1 focus:ring-[color:var(--color-primary)]"
                        value={selected.reviewStatus}
                        onChange={(e) => void handleReviewAction(e.target.value as DocReviewStatus)}
                      >
                        <option value="Under Review">Mark Under Review</option>
                        <option value="Approved">Approve</option>
                        <option value="Requires Attention">Flag Attention</option>
                      </select>
                    )}
                  </div>
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
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={!selected.fileUrl}
                  title={selected.fileUrl ? 'Open in a new tab' : 'No file attached'}
                  onClick={() => {
                    if (!projectId || !selected.fileUrl) return
                    setPreviewLoading(true)
                    setPreviewTitle(selected.name)
                    setPreviewUrl(null)
                    setFilePreviewOpen(true)
                    getProjectDocumentObjectUrl(projectId, selected.id)
                      .then((url) => setPreviewUrl(url))
                      .catch((err) => {
                        setAiHint(messageFromApiError(err))
                        setFilePreviewOpen(false)
                      })
                      .finally(() => setPreviewLoading(false))
                  }}
                >
                  <Eye className="size-4" />
                  View
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={!selected.fileUrl}
                  title={selected.fileUrl ? 'Download file' : 'No file attached'}
                  onClick={() => {
                    if (!projectId || !selected.fileUrl) return
                    void downloadProjectDocumentFile(projectId, selected.id, suggestDownloadFilename(selected)).catch(
                      (err) => setAiHint(messageFromApiError(err)),
                    )
                  }}
                >
                  <Download className="size-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!selected.versions || selected.versions.length < 2}
                  title={selected.versions.length < 2 ? 'Upload more versions to compare' : 'Compare versions'}
                  onClick={() => {
                    const sorted = [...selected.versions].sort((a, b) => b.version - a.version)
                    const latest = sorted[0]
                    const prev = sorted[1]
                    if (!latest || !prev) return
                    setAiHint(
                      `Comparing v${latest.version} (${latest.uploadedAt}, by ${latest.uploadedBy}) ← ${prev.version === selected.currentVersion ? 'latest' : 'archived'} vs v${prev.version} (${prev.uploadedAt}, by ${prev.uploadedBy}). Full diff view requires a dedicated viewer — download both versions to compare locally.`
                    )
                  }}
                >
                  <GitCompare className="size-4" />
                  Compare
                </Button>
                <Button type="button" variant="outline" className="w-full"
                  onClick={() => {
                    if (!projectId || !selected.fileUrl) {
                      setAiHint('No file attached to this document.')
                      return
                    }
                    const fileApiUrl = `${window.location.origin}/api/projects/${projectId}/documents/${selected.id}/file`
                    navigator.clipboard.writeText(fileApiUrl).then(() => {
                      setAiHint('Share link copied to clipboard!')
                    }).catch(() => {
                      setAiHint(`Copy this URL: ${fileApiUrl}`)
                    })
                  }}
                >
                  <Archive className="size-4" />
                  Archive
                </Button>
                <Button type="button" variant="outline" className="col-span-2 w-full"
                  title={selected.fileUrl ? 'Copy shareable file link' : 'No file to share'}
                  disabled={!selected.fileUrl}
                  onClick={() => {
                    const base = window.location.origin
                    const url = `${base}/app/documents?project=${projectId ?? ''}&doc=${selected.id}`
                    navigator.clipboard.writeText(url).then(() => {
                      setAiHint('Share link copied to clipboard! Anyone with project access can use it.')
                    }).catch(() => {
                      setAiHint(`Share this URL: ${url}`)
                    })
                  }}
                >
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
          onClick={() => !uploadBusy && setUploadOpen(false)}
        >
          <Card className="relative w-full max-w-lg shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{uploadMode === 'single' ? 'Upload document' : 'Bulk upload'}</CardTitle>
              <CardDescription>
                {uploadMode === 'single'
                  ? 'Files are stored on the server and linked to this project.'
                  : 'Upload many files at once. Each file becomes its own document (title from filename).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadMode === 'single' ? (
                <div>
                  <label className="text-sm font-medium" htmlFor="doc-title">
                    Title
                  </label>
                  <Input
                    id="doc-title"
                    className="mt-1.5"
                    placeholder="e.g. Structural package Rev C"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="doc-phase">
                    Phase
                  </label>
                  <select
                    id="doc-phase"
                    className="mt-1.5 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
                    value={uploadPhase}
                    onChange={(e) => setUploadPhase(e.target.value as DocPhase)}
                  >
                    <option value="Design">Design</option>
                    <option value="Foundation">Foundation</option>
                    <option value="Structure">Structure</option>
                    <option value="MEP">MEP</option>
                    <option value="Finishing">Finishing</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="doc-type">
                    Document type
                  </label>
                  <select
                    id="doc-type"
                    className="mt-1.5 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm"
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as DocKind)}
                  >
                    <option value="Blueprint">Blueprint</option>
                    <option value="Contract">Contract</option>
                    <option value="Permit">Permit</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Soil Report">Soil Report</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {uploadMode === 'single' ? (
                <div>
                  <label className="text-sm font-medium" htmlFor="doc-desc">
                    Description (optional)
                  </label>
                  <Input
                    id="doc-desc"
                    className="mt-1.5"
                    placeholder="Short summary"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
              ) : null}

              <div>
                <div className="text-sm font-medium">{uploadMode === 'single' ? 'Attach file' : 'Choose files'}</div>
                <label className="relative mt-2 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--radius-2xl)] border-2 border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-8 text-center transition hover:border-[color:var(--color-primary_light)]">
                  <Upload className="pointer-events-none mx-auto size-8 text-[color:var(--color-text_muted)]" />
                  <p className="pointer-events-none mt-2 text-sm text-[color:var(--color-text_secondary)]">
                    {uploadMode === 'single'
                      ? uploadFile
                        ? uploadFile.name
                        : 'Click to browse (PDF, Office, images, zip — max 40 MB)'
                      : bulkFiles.length
                        ? `${bulkFiles.length} file(s) selected`
                        : 'Click to select multiple files'}
                  </p>
                  <p className="pointer-events-none mt-2 flex items-center justify-center gap-1 text-xs text-[color:var(--color-text_muted)]">
                    <Lock className="size-3" /> Stored on server; view/download uses your session
                  </p>
                  <input
                    type="file"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    multiple={uploadMode === 'bulk'}
                    onChange={(e) => {
                      const list = Array.from(e.target.files ?? [])
                      if (uploadMode === 'single') {
                        setUploadFile(list[0] ?? null)
                      } else {
                        setBulkFiles(list)
                      }
                    }}
                  />
                </label>
              </div>

              {uploadError ? (
                <p className="text-sm text-[color:var(--color-error)]">{uploadError}</p>
              ) : null}

              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" disabled={uploadBusy} onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1" disabled={uploadBusy} onClick={() => void submitUpload()}>
                  {uploadBusy ? 'Uploading…' : uploadMode === 'single' ? 'Upload' : 'Upload all'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Modal open={filePreviewOpen} onOpenChange={(val) => !val && closePreview()} title={previewTitle || 'Document Preview'} description="Viewing document inline" className="max-w-5xl">
        <div className="h-[70vh] w-full mt-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] overflow-hidden bg-slate-50 flex items-center justify-center">
          {previewLoading ? (
            <div className="text-sm text-[color:var(--color-text_secondary)]">Loading preview...</div>
          ) : previewUrl ? (
            <iframe src={previewUrl} className="h-full w-full border-0" title={previewTitle} />
          ) : (
            <div className="text-sm text-[color:var(--color-text_secondary)]">Preview not available</div>
          )}
        </div>
      </Modal>
    </div>
  )
}
