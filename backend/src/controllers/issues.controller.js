const Issue = require('../models/Issue')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

function toDto(row) {
  const obj = serializeDoc(row)
  return {
    id: obj.id,
    projectId: String(row.project),
    issue_id: obj.issue_id || obj.id,
    title: obj.title || obj.description || '',
    description: obj.description || '',
    category: obj.category || 'Other',
    severity: obj.severity || 'Medium',
    status: obj.status || 'Reported',
    reportedBy: obj.reportedBy || obj.assignee || '',
    assignedTo: obj.assignedTo || obj.assignee || null,
    raisedAt: obj.raisedAt || obj.raised_at || obj.createdAt || new Date().toISOString(),
    dueAt: obj.dueAt || obj.raised_at || new Date().toISOString(),
    location: obj.location || '',
    zone: obj.zone || '',
    floor: obj.floor || '',
    area: obj.area || '',
    resolutionNotes: obj.resolutionNotes || null,
    verification: obj.verification || null,
    attachments: Array.isArray(obj.attachments) ? obj.attachments : [],
    progressLog: Array.isArray(obj.progressLog) ? obj.progressLog : [],
  }
}

async function listIssues(req, res) {
  const rows = await Issue.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(200)
  res.json({ issues: rows.map(toDto) })
}

async function createIssue(req, res) {
  const body = req.body || {}
  const description = String(body.description || body.title || '').trim()
  if (!description) {
    res.status(400).json({ message: 'description or title is required.' })
    return
  }

  const row = await Issue.create({
    project: req.project._id,
    issue_id: body.id || body.issue_id || '',
    title: String(body.title || description),
    description,
    category: body.category || 'Other',
    severity: body.severity || 'Medium',
    status: body.status || 'Reported',
    reportedBy: String(body.reportedBy || body.reported_by || ''),
    assignedTo: body.assignedTo || body.assignee || null,
    raisedAt: String(body.raisedAt || body.raised_at || new Date().toISOString()),
    dueAt: String(body.dueAt || body.due_at || new Date(Date.now() + 3 * 86400000).toISOString()),
    location: String(body.location || ''),
    zone: String(body.zone || ''),
    floor: String(body.floor || ''),
    area: String(body.area || ''),
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    progressLog: Array.isArray(body.progressLog) ? body.progressLog : [],
  })

  res.status(201).json({ issue: toDto(row) })
}

async function updateIssue(req, res) {
  const row = await Issue.findOne({ _id: req.params.issueId, project: req.project._id })
  if (!row) {
    // Try by issue_id field
    const byFriendly = await Issue.findOne({ issue_id: req.params.issueId, project: req.project._id })
    if (!byFriendly) {
      res.status(404).json({ message: 'Issue not found.' })
      return
    }
    return updateRow(byFriendly, req, res)
  }
  return updateRow(row, req, res)
}

async function updateRow(row, req, res) {
  const body = req.body || {}
  const VALID_STATUSES = ['Reported', 'Assigned', 'In Progress', 'Resolved', 'Verified', 'Closed',
                          'open', 'in_progress', 'resolved', 'verified']
  const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'critical', 'high', 'medium', 'low']

  if (body.status && VALID_STATUSES.includes(body.status)) row.status = body.status
  if (body.severity && VALID_SEVERITIES.includes(body.severity)) row.severity = body.severity
  if (body.assignedTo !== undefined) row.assignedTo = body.assignedTo || null
  if (body.assignee !== undefined) row.assignedTo = body.assignee || null
  if (body.resolutionNotes !== undefined) row.resolutionNotes = body.resolutionNotes
  if (body.verification !== undefined) row.verification = body.verification
  if (Array.isArray(body.progressLog)) row.progressLog = body.progressLog
  if (Array.isArray(body.attachments)) row.attachments = body.attachments

  await row.save()
  res.json({ issue: toDto(row) })
}

module.exports = { listIssues, createIssue, updateIssue }
