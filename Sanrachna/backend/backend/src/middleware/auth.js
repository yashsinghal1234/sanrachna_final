const User = require('../models/User')
const { verifyToken } = require('../utils/auth')
const { asyncHandler } = require('../utils/asyncHandler')

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization required (Bearer token).' })
    return
  }

  const token = header.slice(7).trim()
  if (!token) {
    res.status(401).json({ message: 'Authorization required (Bearer token).' })
    return
  }

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.userId).select('-password')
    if (!user) {
      res.status(401).json({ message: 'User not found.' })
      return
    }
    req.user = user
    req.authPayload = payload
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
})

module.exports = { requireAuth }
