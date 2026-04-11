const User = require('../models/User')
const { serializeDocs } = require('../utils/serialize')

async function searchUsers(req, res) {
  const q = String(req.query.q || '').trim()
  const role = String(req.query.role || '').trim()
  if (!q) {
    res.status(400).json({ message: 'q is required.' })
    return
  }

  const query = { name: { $regex: q, $options: 'i' } }
  if (role && ['owner', 'engineer', 'worker'].includes(role)) query.role = role

  const users = await User.find(query).select('-password').sort({ name: 1 }).limit(15)
  res.json({ users: serializeDocs(users) })
}

module.exports = { searchUsers }

