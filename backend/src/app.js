const path = require('path')
const cors = require('cors')
const express = require('express')

const authRoutes = require('./routes/auth.routes')
const projectRoutes = require('./routes/projects.routes')
const userRoutes = require('./routes/users.routes')
const workspacesRoutes = require('./routes/workspaces.routes')
const { errorHandler, notFound } = require('./middleware/error')

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Render health checks, mobile)
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true)
      }
      cb(new Error(`CORS: origin '${origin}' not allowed`))
    },
    credentials: true,
  }),
)
app.use(express.json())
// Only daily-log photos are public; project documents are served via authenticated routes.
app.use('/uploads/logs', express.static(path.join(__dirname, '..', 'uploads', 'logs')))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/v1/workspaces', workspacesRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
