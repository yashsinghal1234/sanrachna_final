const Contact = require('../models/Contact')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listContacts(req, res) {
  const rows = await Contact.find({ project: req.project._id }).sort({ name: 1 }).limit(200)
  res.json({ contacts: serializeDocs(rows) })
}

const CONTACT_TYPES = ['Internal Team', 'Supplier', 'External Authority', 'Emergency']

async function createContact(req, res) {
  const { name, role, phone, email, phase, contactType } = req.body
  const n = String(name || '').trim()
  const r = String(role || '').trim() || 'Contact'
  const p = String(phone || '').trim()
  const ct = CONTACT_TYPES.includes(String(contactType || '').trim())
    ? String(contactType || '').trim()
    : 'Internal Team'

  if (!n || !p) {
    res.status(400).json({ message: 'name and phone are required.' })
    return
  }

  const e =
    String(email || '')
      .trim()
      .toLowerCase() || `no-email+${Date.now()}@internal.sanrachna`

  const row = await Contact.create({
    project: req.project._id,
    name: n,
    role: r,
    phone: p,
    email: e,
    phase: String(phase || ''),
    contactType: ct,
  })

  res.status(201).json({ contact: serializeDoc(row) })
}

module.exports = { listContacts, createContact }
