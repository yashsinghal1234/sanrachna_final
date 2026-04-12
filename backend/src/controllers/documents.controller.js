const path = require('path')
const fs = require('fs')
const DocumentMeta = require('../models/DocumentMeta')

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads')
const documentsRootResolved = path.resolve(uploadsRoot, 'documents')

const PHASE_MAP = {
  design: 'Design',
  foundation: 'Foundation',
  structure: 'Structure',
  mep: 'MEP',
  finishing: 'Finishing',
}

const TYPE_MAP = {
  drawing: 'Blueprint',
  blueprint: 'Blueprint',
  contract: 'Contract',
  permit: 'Permit',
  inspection: 'Inspection',
  report: 'Soil Report',
  soil: 'Soil Report',
  invoice: 'Invoice',
  other: 'Other',
}

function toDateOnly(s) {
  const str = String(s || '')
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const d = new Date(str)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function mapPhase(raw) {
  const k = String(raw || '').toLowerCase()
  if (PHASE_MAP[k]) return PHASE_MAP[k]
  const s = String(raw || '').trim()
  if (!s) return 'Design'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mapDocKind(raw) {
  const k = String(raw || '').toLowerCase()
  if (TYPE_MAP[k]) return TYPE_MAP[k]
  const known = [
    'Blueprint',
    'Contract',
    'Permit',
    'Inspection',
    'Soil Report',
    'Invoice',
    'Other',
  ]
  const s = String(raw || '').trim()
  if (known.includes(s)) return s
  return 'Other'
}

function rowToLean(row) {
  return row.toObject ? row.toObject({ virtuals: true }) : { ...row }
}

function toProjectDocumentDtoForList(row, projectId) {
  const o = rowToLean(row)
  const id = String(o._id ?? o.id)
  const uploadedAt = toDateOnly(o.uploaded_at || o.createdAt)
  const uploadedBy = o.uploaded_by_name || 'System'
  const versionsIn =
    Array.isArray(o.versions) && o.versions.length
      ? o.versions.map((v) => ({
          version: v.version,
          uploadedAt: toDateOnly(v.uploadedAt),
          uploadedBy: v.uploadedBy || uploadedBy,
          archived: Boolean(v.archived),
        }))
      : [
          {
            version: 1,
            uploadedAt,
            uploadedBy,
            archived: false,
          },
        ]
  const currentVersion = typeof o.current_version === 'number' && o.current_version > 0 ? o.current_version : 1

  return {
    id,
    name: o.title,
    description: o.description || '',
    tags: Array.isArray(o.tags) ? o.tags : [],
    type: mapDocKind(o.doc_type),
    phase: mapPhase(o.phase),
    currentVersion,
    uploadedBy,
    uploadedAt,
    access: o.access || 'Public-to-Team',
    reviewStatus: o.review_status || 'Under Review',
    linkedRfis: typeof o.linked_rfis === 'number' ? o.linked_rfis : 0,
    linkedIssues: typeof o.linked_issues === 'number' ? o.linked_issues : 0,
    versions: versionsIn,
    fileUrl: o.storage_rel ? `/api/projects/${projectId}/documents/${id}/file` : null,
    originalFilename: o.original_filename || '',
  }
}

function parseTags(body) {
  if (Array.isArray(body.tags)) return body.tags.map((t) => String(t).trim()).filter(Boolean)
  const raw = body.tags_json ?? body.tags
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const j = JSON.parse(raw)
      if (Array.isArray(j)) return j.map((t) => String(t).trim()).filter(Boolean)
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }
  return []
}

function buildStats(dtos, anchor) {
  const weekAgo = anchor.getTime() - 7 * 24 * 60 * 60 * 1000
  let updatedThisWeek = 0
  for (const d of dtos) {
    const t = Date.parse(`${d.uploadedAt}T12:00:00`)
    if (!Number.isNaN(t) && t >= weekAgo) updatedThisWeek++
  }
  const pendingReview = dtos.filter((d) => d.reviewStatus !== 'Approved').length
  const archivedVersions = dtos.reduce((a, d) => a + d.versions.filter((v) => v.archived).length, 0)
  return {
    totalDocuments: dtos.length,
    updatedThisWeek,
    pendingReview,
    archivedVersions,
  }
}

function buildRecentEvents(dtos, limit) {
  const events = []
  for (const d of dtos) {
    const latest = d.versions.find((v) => v.version === d.currentVersion) ?? d.versions[0]
    if (latest) {
      events.push({
        id: `${d.id}_v${latest.version}`,
        label: `${d.name} · v${latest.version}`,
        time: latest.uploadedAt,
      })
    }
  }
  return events
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, limit)
}

async function listDocuments(req, res) {
  const rows = await DocumentMeta.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(300)
  const projectId = String(req.project._id)
  const documents = rows.map((r) => toProjectDocumentDtoForList(r, projectId))
  const anchor = new Date()
  const stats = buildStats(documents, anchor)
  const recentEvents = buildRecentEvents(documents, 12)
  res.json({ documents, stats, recentEvents, complianceAlerts: [] })
}

async function createDocument(req, res) {
  const userName = req.user?.name || req.user?.email || 'User'
  const body = req.body || {}
  const titleFromFile = req.file ? path.basename(req.file.originalname || '', path.extname(req.file.originalname || '')) : ''
  const title = String(body.title || titleFromFile || '').trim()
  if (!title) {
    res.status(400).json({ message: 'title is required (or attach a file with a name).' })
    return
  }

  const uploadedIso = new Date().toISOString()
  const uploadedDay = toDateOnly(uploadedIso)
  let storage_rel = null
  let original_filename = ''
  let mime_type = ''
  if (req.file) {
    storage_rel = `documents/${req.project._id}/${req.file.filename}`
    original_filename = req.file.originalname || req.file.filename
    mime_type = req.file.mimetype || ''
  } else if (body.file_url) {
    storage_rel = null
    original_filename = ''
    mime_type = ''
  }

  const phase = String(body.phase || 'Design')
  const doc_type = String(body.doc_type || body.type || 'other')
  const description = String(body.description || '')
  const tags = parseTags(body)
  const access = ['Restricted', 'Public-to-Team', 'Owner+PM'].includes(body.access) ? body.access : 'Public-to-Team'
  const review_status = ['Approved', 'Under Review', 'Requires Attention'].includes(body.review_status)
    ? body.review_status
    : 'Under Review'

  const versions = [{ version: 1, uploadedAt: uploadedDay, uploadedBy: userName, archived: false }]

  const row = await DocumentMeta.create({
    project: req.project._id,
    title,
    description,
    tags,
    phase,
    doc_type,
    file_url: body.file_url || null,
    storage_rel,
    original_filename,
    mime_type,
    uploaded_at: body.uploaded_at || uploadedIso,
    uploaded_by_name: userName,
    access,
    review_status,
    linked_rfis: Number.isFinite(Number(body.linked_rfis)) ? Number(body.linked_rfis) : 0,
    linked_issues: Number.isFinite(Number(body.linked_issues)) ? Number(body.linked_issues) : 0,
    current_version: 1,
    versions,
  })

  res.status(201).json({ document: toProjectDocumentDtoForList(row, String(req.project._id)) })
}

async function bulkCreateDocuments(req, res) {
  const files = req.files || []
  if (!files.length) {
    res.status(400).json({ message: 'At least one file is required.' })
    return
  }
  const userName = req.user?.name || req.user?.email || 'User'
  const body = req.body || {}
  const phase = String(body.phase || 'Design')
  const doc_type = String(body.doc_type || body.type || 'other')
  const access = ['Restricted', 'Public-to-Team', 'Owner+PM'].includes(body.access) ? body.access : 'Public-to-Team'

  const uploadedIso = new Date().toISOString()
  const uploadedDay = toDateOnly(uploadedIso)
  const created = []

  for (const file of files) {
    const baseTitle = path.basename(file.originalname || '', path.extname(file.originalname || '')) || file.filename
    const storage_rel = `documents/${req.project._id}/${file.filename}`
    const row = await DocumentMeta.create({
      project: req.project._id,
      title: baseTitle,
      description: '',
      tags: [],
      phase,
      doc_type,
      file_url: null,
      storage_rel,
      original_filename: file.originalname || file.filename,
      mime_type: file.mimetype || '',
      uploaded_at: uploadedIso,
      uploaded_by_name: userName,
      access,
      review_status: 'Under Review',
      linked_rfis: 0,
      linked_issues: 0,
      current_version: 1,
      versions: [{ version: 1, uploadedAt: uploadedDay, uploadedBy: userName, archived: false }],
    })
    created.push(row)
  }

  const projectId = String(req.project._id)
  res.status(201).json({
    documents: created.map((r) => toProjectDocumentDtoForList(r, projectId)),
    count: created.length,
  })
}

async function updateDocument(req, res) {
  const { documentId } = req.params
  const body = req.body || {}

  const doc = await DocumentMeta.findOne({
    _id: documentId,
    project: req.project._id,
  })

  if (!doc) {
    res.status(404).json({ message: 'Document not found.' })
    return
  }

  if (body.review_status && ['Approved', 'Under Review', 'Requires Attention'].includes(body.review_status)) {
    doc.review_status = body.review_status
  }
  
  if (body.access && ['Restricted', 'Public-to-Team', 'Owner+PM'].includes(body.access)) {
    doc.access = body.access
  }

  await doc.save()

  res.json({ document: toProjectDocumentDtoForList(doc, String(req.project._id)) })
}

function resolveStoredFilePath(storage_rel) {
  const rel = String(storage_rel || '').replace(/^[/\\]+/, '')
  const abs = path.resolve(uploadsRoot, rel)
  if (!abs.startsWith(documentsRootResolved)) {
    return null
  }
  return abs
}

async function getDocumentFile(req, res) {
  const doc = await DocumentMeta.findOne({
    _id: req.params.documentId,
    project: req.project._id,
  })
  if (!doc || !doc.storage_rel) {
    res.status(404).json({ message: 'Document file not found.' })
    return
  }
  const abs = resolveStoredFilePath(doc.storage_rel)
  if (!abs || !fs.existsSync(abs)) {
    res.status(404).json({ message: 'Document file missing on disk.' })
    return
  }

  const download = String(req.query.disposition || '') === 'attachment'
  const filename = doc.original_filename || 'document'
  res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream')
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename)}"`,
  )
  res.sendFile(abs, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: 'Could not read file.' })
    }
  })
}

module.exports = {
  listDocuments,
  createDocument,
  updateDocument,
  bulkCreateDocuments,
  getDocumentFile,
}
