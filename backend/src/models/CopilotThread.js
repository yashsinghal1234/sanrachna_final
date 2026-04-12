const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: { type: [String], default: [] },
    contexts: { type: [String], default: [] },
    actions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    structured: { type: mongoose.Schema.Types.Mixed, default: null },
    usedModules: { type: [String], default: [] },
    followUps: { type: [String], default: [] },
  },
  { _id: true, timestamps: true },
)

const copilotThreadSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['project', 'benchmark', 'documents', 'procurement'], default: 'project' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
)

module.exports = mongoose.model('CopilotThread', copilotThreadSchema)
