const bcrypt = require('bcryptjs')

const User = require('../models/User')
const { signToken } = require('../utils/auth')

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
  }
}

const { syncSignupInternalContact } = require('../services/internalTeamContact')

async function signup(req, res, next) {
  try {
    const { name, email, password, role, phone } = req.body
    const cleanName = String(name || '').trim()
    const cleanEmail = normalizeEmail(email)
    const cleanPhone = String(phone || '').trim()

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }
    if (!cleanPhone) {
      return res.status(400).json({ message: 'Phone number is required.' })
    }

    const existing = await User.findOne({ email: cleanEmail })
    if (existing) {
      return res.status(409).json({ message: 'User already exists with this email.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role,
      phone: cleanPhone,
    })

    await syncSignupInternalContact(user)

    const token = signToken(user)
    return res.status(201).json({
      message: 'Signup successful.',
      token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

async function signin(req, res, next) {
  try {
    const { email, password } = req.body
    const cleanEmail = normalizeEmail(email)

    if (!cleanEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email: cleanEmail })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const token = signToken(user)
    return res.status(200).json({
      message: 'Signin successful.',
      token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    return next(error)
  }
}

// Forgot Password: Step 1 - Verify username and email
async function forgotPassword(req, res, next) {
  try {
    const { username, email } = req.body
    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required.' })
    }
    // Make username case-insensitive
    const user = await User.findOne({
      name: { $regex: `^${username.trim()}$`, $options: 'i' },
      email: normalizeEmail(email)
    })
    if (!user) {
      return res.status(404).json({ message: 'No user found with provided username and email.' })
    }
    // For security, only return a userId (not sensitive info)
    return res.json({ userId: user._id.toString() })
  } catch (error) {
    return next(error)
  }
}

// Forgot Password: Step 2 - Set new password
async function resetPassword(req, res, next) {
  try {
    const { userId, newPassword } = req.body
    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'User ID and new password are required.' })
    }
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()
    return res.json({ message: 'Password reset successful.' })
  } catch (error) {
    return next(error)
  }
}

module.exports = { signup, signin, forgotPassword, resetPassword }
