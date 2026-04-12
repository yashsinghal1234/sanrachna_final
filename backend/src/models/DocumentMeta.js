const mongoose = require('mongoose')

const versionEntrySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    uploadedAt: { type: String, default: '' },
    uploadedBy: { type: String, default: '' },
    archived: { type: Boolean, default: false },
  },
  { _id: false },
)

const documentMetaSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
    phase: { type: String, default: '' },
    doc_type: { type: String, default: 'other' },
    /** Legacy / display URL segment (not used for auth file access). */
    file_url: { type: String, default: null },
    /** Relative path from repo `uploads/` root, e.g. documents/<projectId>/<file> */
    storage_rel: { type: String, default: null },
    original_filename: { type: String, default: '' },
    mime_type: { type: String, default: '' },
    uploaded_at: { type: String, default: '' },
    uploaded_by_name: { type: String, default: '' },
    access: {
      type: String,
      enum: ['Restricted', 'Public-to-Team', 'Owner+PM'],
      default: 'Public-to-Team',
    },
    review_status: {
      type: String,
      enum: ['Approved', 'Under Review', 'Requires Attention'],
      default: 'Under Review',
    },
    linked_rfis: { type: Number, default: 0 },
    linked_issues: { type: Number, default: 0 },
    current_version: { type: Number, default: 1 },
    versions: { type: [versionEntrySchema], default: [] },
  },
  { timestamps: true },
)

module.exports = mongoose.model('DocumentMeta', documentMetaSchema)
