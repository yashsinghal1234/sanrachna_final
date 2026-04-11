const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: String, default: '' },
    deadline: { type: String, default: '' },
    status: { type: String, default: 'Active' },
    scheduleNotes: { type: String, default: '' },
    /** Planning snapshot + chart-friendly fields (same shapes as frontend mockData) */
    planning: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

projectSchema.index({ owner: 1, createdAt: -1 })

module.exports = mongoose.model('Project', projectSchema)
