const mongoose = require('mongoose')

const documentMetaSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    phase: { type: String, default: '' },
    doc_type: { type: String, default: 'other' },
    file_url: { type: String, default: null },
    uploaded_at: { type: String, default: '' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('DocumentMeta', documentMetaSchema)
