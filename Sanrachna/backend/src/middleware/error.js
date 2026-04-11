function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    res.status(400).json({ message: err.message })
    return
  }
  if (err.name === 'CastError') {
    res.status(400).json({ message: 'Invalid id format.' })
    return
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500
  const message = err.message || 'Internal server error'

  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }

  res.status(statusCode).json({ message })
}

module.exports = { notFound, errorHandler }
