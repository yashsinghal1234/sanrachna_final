const User = require('../models/User')
const { escapeRegex } = require('../utils/escapeRegex')

async function searchUsers(req, res) {
  const q = String(req.query.q || '').trim()
  const roleFilter = req.query.role

  if (q.length < 2) {
    res.json({ users: [] })
    return
  }

  const query = {
    _id: { $ne: req.user._id },
    name: new RegExp(escapeRegex(q), 'i'),
  }

  if (roleFilter === 'owner' || roleFilter === 'engineer' || roleFilter === 'worker') {
    query.role = roleFilter
  }

  const users = await User.find(query).select('name email role').limit(25).lean()

  res.json({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
    })),
  })
}

module.exports = { searchUsers }
