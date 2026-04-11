const DocumentMeta = require('../models/DocumentMeta')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listDocuments(req, res) {
  const rows = await DocumentMeta.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(200)
  res.json({ documents: serializeDocs(rows) })
}

async function createDocument(req, res) {
  const { title, phase, doc_type, file_url, uploaded_at } = req.body
  const t = String(title || '').trim()
  if (!t) {
    res.status(400).json({ message: 'title is required.' })
    return
  }

  const row = await DocumentMeta.create({
    project: req.project._id,
    title: t,
    phase: String(phase || ''),
    doc_type: String(doc_type || 'other'),
    file_url: file_url || null,
    uploaded_at: String(uploaded_at || new Date().toISOString()),
  })

  res.status(201).json({ document: serializeDoc(row) })
}

module.exports = { listDocuments, createDocument }
