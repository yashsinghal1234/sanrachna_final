const mongoose = require('mongoose')

const activitySchema = new mongoose.Schema(
  { at: { type: String, default: '' }, text: { type: String, default: '' } },
  { _id: false },
)

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    assignedTo: { type: String, required: true, index: true }, // worker display key e.g. "Worker — yogesh"
    assignedBy: { type: String, default: '' },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    phase: {
      type: String,
      enum: ['Foundation', 'Structure', 'MEP', 'Finishing', 'Execution', 'Substructure', 'Superstructure', 'Handover'],
      default: 'Execution',
    },
    location: { type: String, default: '' },
    priority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
    status: {
      type: String,
      enum: ['Not started', 'In progress', 'Completed', 'Blocked'],
      default: 'Not started',
    },
    progressPct: { type: Number, default: 0, min: 0, max: 100 },
    startAt: { type: String, default: '' },
    dueAt: { type: String, required: true },
    requiredMaterials: { type: [String], default: [] },
    safetyInstructions: { type: [String], default: [] },
    engineerNotes: { type: String, default: '' },
    blockedReason: { type: String, default: null },
    activity: { type: [activitySchema], default: [] },
    /** Cross-reference to the Gantt task id (e.g. "task_abc_xyz"). */
    ganttTaskId: { type: String, default: '' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Task', taskSchema)
