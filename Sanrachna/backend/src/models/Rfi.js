const mongoose = require('mongoose')

const rfiSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'answered'],
      default: 'open',
    },
    assignee: { type: String, default: '' },
    raised_by: { type: String, default: '' },
    raised_at: { type: String, required: true },
    image_url: { type: String, default: null },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Rfi', rfiSchema)
