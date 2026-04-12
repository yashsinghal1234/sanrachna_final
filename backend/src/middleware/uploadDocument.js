const fs = require('fs')
const path = require('path')
const multer = require('multer')

const documentsRoot = path.join(__dirname, '..', '..', 'uploads', 'documents')
fs.mkdirSync(documentsRoot, { recursive: true })

const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
])

function storageForProject(projectId) {
  const dir = path.join(documentsRoot, String(projectId))
  fs.mkdirSync(dir, { recursive: true })
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || ''
      const base = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      cb(null, `${base}${ext}`)
    },
  })
}

function fileFilter(_req, file, cb) {
  const mt = (file.mimetype || '').toLowerCase()
  if (mt && (ALLOWED.has(mt) || mt.startsWith('image/'))) {
    cb(null, true)
    return
  }
  cb(new Error('File type not allowed for document upload.'))
}

function optionalSingleDocumentUpload(req, res, next) {
  const ct = String(req.headers['content-type'] || '')
  if (!ct.toLowerCase().includes('multipart/form-data')) {
    next()
    return
  }
  const projectId = req.params.projectId
  const upload = multer({
    storage: storageForProject(projectId),
    limits: { fileSize: 40 * 1024 * 1024 },
    fileFilter,
  }).single('file')
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err.message || 'Upload failed' })
      return
    }
    next()
  })
}

function bulkDocumentUpload(req, res, next) {
  const projectId = req.params.projectId
  const upload = multer({
    storage: storageForProject(projectId),
    limits: { fileSize: 40 * 1024 * 1024, files: 50 },
    fileFilter,
  }).array('files', 50)
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err.message || 'Bulk upload failed' })
      return
    }
    next()
  })
}

module.exports = {
  documentsRoot,
  optionalSingleDocumentUpload,
  bulkDocumentUpload,
}
