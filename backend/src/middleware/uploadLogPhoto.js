const fs = require('fs')
const path = require('path')
const multer = require('multer')

const uploadRoot = path.join(__dirname, '..', '..', 'uploads', 'logs')
fs.mkdirSync(uploadRoot, { recursive: true })

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true)
      return
    }
    cb(new Error('Only image uploads are allowed.'))
  },
})

function uploadLogPhotoMiddleware(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const msg = err.message || 'Upload failed'
      res.status(400).json({ message: msg })
      return
    }
    next()
  })
}

module.exports = { uploadLogPhotoMiddleware, uploadRoot }
