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

async function updateContact(req, res) {
  const { contactId } = req.params
  const { name, role, phone, email, phase, contactType } = req.body

  const row = await Contact.findOne({ _id: contactId, project: req.project._id })
  if (!row) return res.status(404).json({ message: 'Contact not found' })

  if (name !== undefined) row.name = String(name).trim()
  if (role !== undefined) row.role = String(role).trim()
  if (phone !== undefined) row.phone = String(phone).trim()
  if (email !== undefined) row.email = String(email).trim().toLowerCase()
  if (phase !== undefined) row.phase = String(phase).trim()
  if (contactType !== undefined && CONTACT_TYPES.includes(String(contactType).trim())) {
    row.contactType = String(contactType).trim()
  }

  await row.save()
  res.json({ contact: serializeDoc(row) })
}

async function deleteContact(req, res) {
  const { contactId } = req.params
  const row = await Contact.findOneAndDelete({ _id: contactId, project: req.project._id })
  if (!row) return res.status(404).json({ message: 'Contact not found' })
  res.json({ success: true })
}

module.exports = { listContacts, createContact, updateContact, deleteContact }
