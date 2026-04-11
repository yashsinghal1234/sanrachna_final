const Notification = require('../models/Notification')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listNotifications(req, res) {
  const query = { project: req.project._id, $or: [{ user: req.user._id }, { user: null, role: req.user.role }] }
  const rows = await Notification.find(query).sort({ createdAt: -1 }).limit(200)
  res.json({ notifications: serializeDocs(rows) })
}

async function createNotification(req, res) {
  const { priority, type, title, body, role, actions } = req.body
  const row = await Notification.create({
    project: req.project._id,
    user: null,
    role: role || req.user.role,
    priority: ['critical', 'warning', 'info'].includes(priority) ? priority : 'info',
    type: String(type || 'summary'),
    title: String(title || '').trim(),
    body: String(body || '').trim(),
    actions: Array.isArray(actions) ? actions : [],
  })
  res.status(201).json({ notification: serializeDoc(row) })
}

async function updateNotification(req, res) {
  const row = await Notification.findOne({ _id: req.params.notificationId, project: req.project._id })
  if (!row) {
    res.status(404).json({ message: 'Notification not found.' })
    return
  }
  const { status } = req.body
  if (status && ['unread', 'read', 'resolved'].includes(status)) row.status = status
  await row.save()
  res.json({ notification: serializeDoc(row) })
}

module.exports = { listNotifications, createNotification, updateNotification }
