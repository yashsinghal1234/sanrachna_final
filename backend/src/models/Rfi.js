const mongoose = require('mongoose')

const attachmentSchema = new mongoose.Schema(
  { id: String, kind: { type: String, default: 'document' }, name: String, url: { type: String, default: null } },
  { _id: false },
)

const commentSchema = new mongoose.Schema(
  {
    id: String,
    kind: { type: String, default: 'question' },
    author: { type: String, default: '' },
    at: { type: String, default: '' },
    text: { type: String, default: '' },
  },
  { _id: false },
)

const approvalSchema = new mongoose.Schema(
  {
    approvedBy: { type: String, default: '' },
    approvedAt: { type: String, default: '' },
    resolution: { type: String, default: '' },
  },
  { _id: false },
)

const rfiSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    // Friendly display ID
    rfi_id: { type: String, default: '' },
    title: { type: String, default: '' },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['Structure', 'MEP', 'Architecture', 'Facade', 'Finishing', 'General'],
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In Review', 'Awaiting Response', 'Answered', 'Closed', 'Escalated',
             'open', 'in_progress', 'answered'],
      default: 'Open',
    },
    raisedBy: { type: String, default: '' },
    assignedTo: { type: String, default: '' },
    raisedAt: { type: String, default: '' },
    dueAt: { type: String, default: '' },
    linkedDoc: { type: String, default: null },
    linkedTask: { type: String, default: null },
    linkedPhase: { type: String, default: null },
    location: { type: String, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    thread: { type: [commentSchema], default: [] },
    approval: { type: approvalSchema, default: null },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Rfi', rfiSchema)
