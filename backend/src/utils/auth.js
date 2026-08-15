const jwt = require('jsonwebtoken')

function signToken(user, rememberMe = false) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables.')
  }

  const expiresIn = rememberMe ? '7d' : (process.env.JWT_EXPIRES_IN || '1d')

  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    secret,
    { expiresIn },
  )
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables.')
  }
  return jwt.verify(token, secret)
}

module.exports = { signToken, verifyToken }
