const Rfi = require('../models/Rfi')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

const VALID_STATUSES = ['Open', 'In Review', 'Awaiting Response', 'Answered', 'Closed', 'Escalated']
const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const VALID_CATEGORIES = ['Structure', 'MEP', 'Architecture', 'Facade', 'Finishing', 'General']

function toDto(row) {
  const obj = serializeDoc(row)
  return {
    id: obj.id,
    rfi_id: obj.rfi_id || obj.id,
    title: obj.title || obj.description?.slice(0, 80) || '',
    description: obj.description || '',
    category: obj.category || 'General',
    priority: obj.priority || 'Medium',
    status: obj.status || 'Open',
    raisedBy: obj.raisedBy || obj.raised_by || '',
    assignedTo: obj.assignedTo || obj.assignee || '',
    raisedAt: obj.raisedAt || obj.raised_at || obj.createdAt || new Date().toISOString(),
    dueAt: obj.dueAt || obj.raised_at || new Date().toISOString(),
    linkedDoc: obj.linkedDoc || null,
    linkedTask: obj.linkedTask || null,
    linkedPhase: obj.linkedPhase || null,
    location: obj.location || null,
    attachments: Array.isArray(obj.attachments) ? obj.attachments : [],
    thread: Array.isArray(obj.thread) ? obj.thread : [],
    approval: obj.approval || null,
  }
}

async function listRfis(req, res) {
  const rows = await Rfi.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(200)
  res.json({ rfis: rows.map(toDto) })
}

async function createRfi(req, res) {
  const body = req.body || {}
  const description = String(body.description || body.title || '').trim()
  if (!description) {
    res.status(400).json({ message: 'description or title is required.' })
    return
  }

  const row = await Rfi.create({
    project: req.project._id,
    rfi_id: body.id || body.rfi_id || '',
    title: String(body.title || description),
    description,
    category: VALID_CATEGORIES.includes(body.category) ? body.category : 'General',
    priority: VALID_PRIORITIES.includes(body.priority) ? body.priority : 'Medium',
    status: VALID_STATUSES.includes(body.status) ? body.status : 'Open',
    raisedBy: String(body.raisedBy || body.raised_by || req.user?.name || ''),
    assignedTo: String(body.assignedTo || body.assignee || ''),
    raisedAt: String(body.raisedAt || body.raised_at || new Date().toISOString()),
    dueAt: String(body.dueAt || body.due_at || new Date(Date.now() + 3 * 86400000).toISOString()),
    linkedDoc: body.linkedDoc || null,
    linkedTask: body.linkedTask || null,
    linkedPhase: body.linkedPhase || null,
    location: body.location || null,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    thread: Array.isArray(body.thread) ? body.thread : [],
  })

  res.status(201).json({ rfi: toDto(row) })
}

async function updateRfi(req, res) {
  const row = await Rfi.findOne({ _id: req.params.rfiId, project: req.project._id })
  if (!row) {
    // Try by rfi_id
    const byFriendly = await Rfi.findOne({ rfi_id: req.params.rfiId, project: req.project._id })
    if (!byFriendly) {
      res.status(404).json({ message: 'RFI not found.' })
      return
    }
    return updateRow(byFriendly, req, res)
  }
  return updateRow(row, req, res)
}

async function updateRow(row, req, res) {
  const body = req.body || {}

  if (body.status && VALID_STATUSES.includes(body.status)) row.status = body.status
  if (body.priority && VALID_PRIORITIES.includes(body.priority)) row.priority = body.priority
  if (body.assignedTo !== undefined) row.assignedTo = String(body.assignedTo)
  if (body.assignee !== undefined) row.assignedTo = String(body.assignee)
  if (body.approval !== undefined) row.approval = body.approval
  if (Array.isArray(body.thread)) row.thread = body.thread
  if (Array.isArray(body.attachments)) row.attachments = body.attachments

  await row.save()
  res.json({ rfi: toDto(row) })
}

// Legacy route handler name - maps to updateRfi
async function updateRfiStatus(req, res) {
  return updateRfi(req, res)
}

module.exports = { listRfis, createRfi, updateRfi, updateRfiStatus }
