const mongoose = require('mongoose')

const issueSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'verified'],
      default: 'open',
    },
    location: { type: String, default: '' },
    raised_at: { type: String, required: true },
    assignee: { type: String, default: '' },
    photo_url: { type: String, default: null },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Issue', issueSchema)
