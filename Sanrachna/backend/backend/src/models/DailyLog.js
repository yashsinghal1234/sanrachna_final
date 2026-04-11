const mongoose = require('mongoose')

const dailyLogSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    date: { type: String, required: true },
    tasks_completed: { type: String, required: true },
    workers_present: { type: Number, required: true },
    issues: { type: String, default: '' },
    photo_url: { type: String, default: null },
    author: { type: String, required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('DailyLog', dailyLogSchema)
