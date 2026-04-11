const path = require('path')
const cors = require('cors')
const express = require('express')

const authRoutes = require('./routes/auth.routes')
const projectRoutes = require('./routes/projects.routes')
const userRoutes = require('./routes/users.routes')
const { errorHandler, notFound } = require('./middleware/error')

const app = express()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  }),
)
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/projects', projectRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
