const mongoose = require('mongoose')

const dailyLogSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    date: { type: String, required: true },
    tasks_completed: { type: String, default: 'Site photo log' },
    workers_present: { type: Number, default: 0 },
    issues: { type: String, default: '' },
    photo_url: { type: String, default: null },
    author: { type: String, required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    /** Client-reported ISO time when the shutter fired (live camera) or file was chosen (gallery). */
    photoCapturedAt: { type: String, default: null },
    /** Server time when the multipart upload was accepted (ISO). */
    photoUploadedAt: { type: String, default: null },
  },
  { timestamps: true },
)

module.exports = mongoose.model('DailyLog', dailyLogSchema)
