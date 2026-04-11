const Rfi = require('../models/Rfi')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listRfis(req, res) {
  const rows = await Rfi.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(100)
  res.json({ rfis: serializeDocs(rows) })
}

async function createRfi(req, res) {
  const { description, assignee, raised_by, raised_at, image_url } = req.body
  const desc = String(description || '').trim()
  if (!desc) {
    res.status(400).json({ message: 'description is required.' })
    return
  }

  const row = await Rfi.create({
    project: req.project._id,
    description: desc,
    status: 'open',
    assignee: String(assignee || ''),
    raised_by: String(raised_by || req.user.name || ''),
    raised_at: String(raised_at || new Date().toISOString()),
    image_url: image_url || null,
  })

  res.status(201).json({ rfi: serializeDoc(row) })
}

async function updateRfiStatus(req, res) {
  const { status } = req.body
  const allowed = ['open', 'in_progress', 'answered']
  if (!allowed.includes(status)) {
    res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` })
    return
  }

  const row = await Rfi.findOne({ _id: req.params.rfiId, project: req.project._id })
  if (!row) {
    res.status(404).json({ message: 'RFI not found.' })
    return
  }

  row.status = status
  await row.save()
  res.json({ rfi: serializeDoc(row) })
}

module.exports = { listRfis, createRfi, updateRfiStatus }
