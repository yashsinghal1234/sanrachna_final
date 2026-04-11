const bcrypt = require('bcryptjs')
const User = require('../../models/User')
const { serializeDoc } = require('../../utils/serialize')

async function getProfile(req, res) {
  res.json({ user: serializeDoc(req.user) })
}

async function updateProfile(req, res) {
  const allowed = ['name', 'email', 'phone', 'departmentCrew', 'employeeId', 'companyName', 'businessAddress', 'specialization', 'assignedProjects', 'crewType', 'supervisorName']
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user[key] = req.body[key]
  }
  if (req.body.email) req.user.email = String(req.body.email).trim().toLowerCase()
  await req.user.save()
  res.json({ user: serializeDoc(req.user) })
}

async function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'currentPassword and newPassword are required.' })
    return
  }
  const fullUser = await User.findById(req.user._id)
  const ok = await bcrypt.compare(currentPassword, fullUser.password)
  if (!ok) {
    res.status(401).json({ message: 'Current password is incorrect.' })
    return
  }
  fullUser.password = await bcrypt.hash(newPassword, 10)
  await fullUser.save()
  res.json({ message: 'Password updated successfully.' })
}

module.exports = { getProfile, updateProfile, updatePassword }
