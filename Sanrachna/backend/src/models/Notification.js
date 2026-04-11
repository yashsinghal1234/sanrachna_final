const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    role: { type: String, enum: ['owner', 'engineer', 'worker'], required: true },
    priority: { type: String, enum: ['critical', 'warning', 'info'], default: 'info' },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    createdAtLabel: { type: String, default: 'just now' },
    status: { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
    actions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Notification', notificationSchema)
