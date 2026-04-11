const cors = require('cors')
const express = require('express')

const authRoutes = require('./routes/auth.routes')
const projectRoutes = require('./routes/projects.routes')
const userRoutes = require('./routes/users.routes')
const { errorHandler, notFound } = require('./middleware/error')

const app = express()

function parseCorsOrigins(raw) {
  const v = String(raw || '').trim()
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN)
const isDev = process.env.NODE_ENV !== 'production'

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(String(origin))
}

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / server-to-server / curl (no Origin header)
      if (!origin) return cb(null, true)
      if (isDev && isLocalDevOrigin(origin)) return cb(null, true)
      if (allowedOrigins.length === 0) return cb(null, true)
      return cb(null, allowedOrigins.includes(origin))
    },
  }),
)
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
