const Issue = require('../models/Issue')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listIssues(req, res) {
  const rows = await Issue.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(100)
  res.json({ issues: serializeDocs(rows) })
}

async function createIssue(req, res) {
  const { description, severity, location, assignee, raised_at, photo_url } = req.body
  const desc = String(description || '').trim()
  if (!desc) {
    res.status(400).json({ message: 'description is required.' })
    return
  }

  const sev = ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium'

  const row = await Issue.create({
    project: req.project._id,
    description: desc,
    severity: sev,
    status: 'open',
    location: String(location || ''),
    raised_at: String(raised_at || new Date().toISOString()),
    assignee: String(assignee || ''),
    photo_url: photo_url || null,
  })

  res.status(201).json({ issue: serializeDoc(row) })
}

async function updateIssue(req, res) {
  const row = await Issue.findOne({ _id: req.params.issueId, project: req.project._id })
  if (!row) {
    res.status(404).json({ message: 'Issue not found.' })
    return
  }

  const { status, severity, assignee } = req.body
  if (status) {
    const allowed = ['open', 'in_progress', 'resolved', 'verified']
    if (!allowed.includes(status)) {
      res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` })
      return
    }
    row.status = status
  }
  if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
    row.severity = severity
  }
  if (assignee !== undefined) row.assignee = String(assignee)

  await row.save()
  res.json({ issue: serializeDoc(row) })
}

module.exports = { listIssues, createIssue, updateIssue }
