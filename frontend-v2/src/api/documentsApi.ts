import { ApiRequestError, apiFetch, apiJson } from '@/api/http'
import type { DocKind, DocPhase, ProjectDocument } from '@/types/documents.types'

const DOC_PHASES: DocPhase[] = ['Design', 'Foundation', 'Structure', 'MEP', 'Finishing']
const DOC_KINDS: DocKind[] = [
  'Blueprint',
  'Contract',
  'Permit',
  'Inspection',
  'Soil Report',
  'Invoice',
  'Other',
]

function coercePhase(s: string): DocPhase {
  return DOC_PHASES.includes(s as DocPhase) ? (s as DocPhase) : 'Design'
}

function coerceKind(s: string): DocKind {
  return DOC_KINDS.includes(s as DocKind) ? (s as DocKind) : 'Other'
}

function normalizeDocument(raw: unknown): ProjectDocument {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const versionsRaw = Array.isArray(o.versions) ? o.versions : []
  const versions = versionsRaw.map((v) => {
    const x = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
    return {
      version: Number(x.version) || 1,
      uploadedAt: String(x.uploadedAt ?? ''),
      uploadedBy: String(x.uploadedBy ?? ''),
      archived: Boolean(x.archived),
    }
  })
  const name = String(o.name ?? o.title ?? 'Untitled')
  return {
    id: String(o.id ?? ''),
    name,
    description: String(o.description ?? ''),
    tags: Array.isArray(o.tags) ? o.tags.map(String) : [],
    type: coerceKind(String(o.type ?? 'Other')),
    phase: coercePhase(String(o.phase ?? 'Design')),
    currentVersion: Number(o.currentVersion) || 1,
    uploadedBy: String(o.uploadedBy ?? ''),
    uploadedAt: String(o.uploadedAt ?? ''),
    access: (['Restricted', 'Public-to-Team', 'Owner+PM'].includes(String(o.access))
      ? o.access
      : 'Public-to-Team') as ProjectDocument['access'],
    reviewStatus: (['Approved', 'Under Review', 'Requires Attention'].includes(String(o.reviewStatus))
      ? o.reviewStatus
      : 'Under Review') as ProjectDocument['reviewStatus'],
    linkedRfis: Number(o.linkedRfis) || 0,
    linkedIssues: Number(o.linkedIssues) || 0,
    versions: versions.length
      ? versions
      : [{ version: 1, uploadedAt: String(o.uploadedAt ?? ''), uploadedBy: String(o.uploadedBy ?? ''), archived: false }],
    fileUrl: typeof o.fileUrl === 'string' && o.fileUrl ? o.fileUrl : null,
    originalFilename: typeof o.originalFilename === 'string' ? o.originalFilename : '',
  }
}

export type DocumentsListPayload = {
  documents: ProjectDocument[]
  stats?: Record<string, number>
  events?: { id: string; label: string; time: string }[]
  complianceAlerts?: { id: string; severity: 'critical' | 'warning' | 'info'; text: string }[]
}

export async function fetchProjectDocuments(projectId: string): Promise<DocumentsListPayload> {
  const payload = await apiJson<unknown>(`/api/projects/${encodeURIComponent(projectId)}/documents`)
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    const rawList = Array.isArray(o.documents) ? o.documents : Array.isArray(o.items) ? o.items : []
    return {
      documents: rawList.map(normalizeDocument),
      stats: (o.stats as Record<string, number>) ?? undefined,
      events:
        (o.recentEvents as { id: string; label: string; time: string }[]) ??
        (o.events as { id: string; label: string; time: string }[]) ??
        undefined,
      complianceAlerts: (o.complianceAlerts as DocumentsListPayload['complianceAlerts']) ?? undefined,
    }
  }
  return { documents: [] }
}

async function throwIfBad(res: Response) {
  const text = await res.text()
  if (!res.ok) {
    throw new ApiRequestError(text || res.statusText || 'Request failed', res.status, text)
  }
  return text
}

export async function uploadProjectDocument(
  projectId: string,
  params: {
    title: string
    phase: DocPhase
    type: DocKind
    description?: string
    file?: File | null
  },
): Promise<ProjectDocument> {
  const fd = new FormData()
  fd.set('title', params.title.trim())
  fd.set('phase', params.phase)
  fd.set('doc_type', params.type)
  if (params.description?.trim()) fd.set('description', params.description.trim())
  if (params.file) fd.set('file', params.file)

  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/documents`, {
    method: 'POST',
    body: fd,
  })
  const text = await throwIfBad(res)
  const j = JSON.parse(text || '{}') as { document?: unknown }
  if (!j.document) throw new Error('Invalid upload response')
  return normalizeDocument(j.document)
}

export async function bulkUploadProjectDocuments(
  projectId: string,
  files: File[],
  defaults: { phase?: DocPhase; type?: DocKind },
): Promise<ProjectDocument[]> {
  if (!files.length) return []
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  fd.set('phase', defaults.phase ?? 'Design')
  fd.set('doc_type', defaults.type ?? 'Other')

  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/documents/bulk`, {
    method: 'POST',
    body: fd,
  })
  const text = await throwIfBad(res)
  const j = JSON.parse(text || '{}') as { documents?: unknown[] }
  const list = Array.isArray(j.documents) ? j.documents : []
  return list.map(normalizeDocument)
}

export async function updateProjectDocument(
  projectId: string,
  documentId: string,
  updates: { reviewStatus?: string; access?: string }
): Promise<ProjectDocument> {
  const payload: Record<string, string> = {}
  if (updates.reviewStatus) payload.review_status = updates.reviewStatus
  if (updates.access) payload.access = updates.access

  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
  const text = await throwIfBad(res)
  const j = JSON.parse(text || '{}') as { document?: unknown }
  if (!j.document) throw new Error('Invalid update response')
  return normalizeDocument(j.document)
}

export async function openProjectDocumentInNewTab(projectId: string, documentId: string): Promise<void> {
  const path = `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/file`
  const res = await apiFetch(path)
  if (!res.ok) {
    const t = await res.text()
    throw new ApiRequestError(t || res.statusText || 'Could not open file', res.status, t)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

export async function downloadProjectDocumentBlob(projectId: string, documentId: string): Promise<Blob> {
  const path = `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/file?disposition=attachment`
  const res = await apiFetch(path)
  if (!res.ok) {
    const t = await res.text()
    throw new ApiRequestError(t || res.statusText || 'Download failed', res.status, t)
  }
  return res.blob()
}

/** Trigger browser download for a document file. */
export async function downloadProjectDocumentFile(
  projectId: string,
  documentId: string,
  suggestedName: string,
): Promise<void> {
  const blob = await downloadProjectDocumentBlob(projectId, documentId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName || 'document'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Get a short-lived object URL for inline viewing */
export async function getProjectDocumentObjectUrl(projectId: string, documentId: string): Promise<string> {
  const blob = await downloadProjectDocumentBlob(projectId, documentId)
  return URL.createObjectURL(blob)
}
