const mongoose = require('mongoose')

const emergencyIncidentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: {
      type: String,
      enum: ['raised', 'acknowledged', 'responding', 'resolved', 'archived'],
      default: 'raised',
    },
    zone: { type: String, required: true },
    description: { type: String, default: '' },
    photo_url: { type: String, default: null },
    reported_by: { type: String, required: true },
    assignment: { type: mongoose.Schema.Types.Mixed, default: {} },
    audit: { type: [mongoose.Schema.Types.Mixed], default: [] },
    created_at_label: { type: String, default: 'just now' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('EmergencyIncident', emergencyIncidentSchema)
