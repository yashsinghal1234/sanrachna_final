const mongoose = require('mongoose')

const contactSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phase: { type: String, default: '' },
    contactType: {
      type: String,
      enum: ['Internal Team', 'Supplier', 'External Authority', 'Emergency'],
      default: 'Internal Team',
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Contact', contactSchema)
