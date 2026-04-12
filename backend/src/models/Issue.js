const mongoose = require('mongoose')

const progressLogSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    at: { type: String, default: '' },
    author: { type: String, default: '' },
    status: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false },
)

const attachmentSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    kind: { type: String, default: 'photo' },
    name: { type: String, default: '' },
    url: { type: String, default: null },
    stage: { type: String, default: 'evidence' },
  },
  { _id: false },
)

const verificationSchema = new mongoose.Schema(
  {
    verifiedBy: { type: String, default: '' },
    verifiedAt: { type: String, default: '' },
    notes: { type: String, default: '' },
    afterPhotoAttachmentId: { type: String, default: null },
  },
  { _id: false },
)

const issueSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    // Unique friendly ID like ISS-123
    issue_id: { type: String, default: '' },
    title: { type: String, default: '' },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['Quality', 'Safety', 'Material', 'Rework', 'Snag', 'Execution', 'Other'],
      default: 'Other',
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low', 'critical', 'high', 'medium', 'low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Reported', 'Assigned', 'In Progress', 'Resolved', 'Verified', 'Closed',
             'open', 'in_progress', 'resolved', 'verified'],
      default: 'Reported',
    },
    reportedBy: { type: String, default: '' },
    assignedTo: { type: String, default: null },
    raisedAt: { type: String, default: '' },
    dueAt: { type: String, default: '' },
    location: { type: String, default: '' },
    zone: { type: String, default: '' },
    floor: { type: String, default: '' },
    area: { type: String, default: '' },
    resolutionNotes: { type: String, default: null },
    verification: { type: verificationSchema, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    progressLog: { type: [progressLogSchema], default: [] },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Issue', issueSchema)
