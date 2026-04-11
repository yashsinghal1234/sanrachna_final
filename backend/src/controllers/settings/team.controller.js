const mongoose = require('mongoose')
const User = require('../../models/User')
const { upsertTeamMemberContact } = require('../../services/internalTeamContact')
const { serializeDoc, serializeDocs } = require('../../utils/serialize')

function isProjectOwner(userId, project) {
  return String(project.owner) === String(userId)
}

function isProjectMember(userId, project) {
  return project.members.some((m) => String(m) === String(userId))
}

async function listTeam(req, res) {
  const userIds = [req.project.owner, ...req.project.members]
  const uniqueIds = [...new Set(userIds.map((id) => String(id)))]
  const users = await User.find({ _id: { $in: uniqueIds } }).select('-password')
  const ownerId = String(req.project.owner)
  users.sort((a, b) => {
    if (String(a._id) === ownerId) return -1
    if (String(b._id) === ownerId) return 1
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  })
  const rows = serializeDocs(users).map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    status: 'Active',
  }))
  res.json({ members: rows })
}

async function addTeamMember(req, res) {
  const actorRole = req.user.role
  if (actorRole !== 'owner' && actorRole !== 'engineer') {
    res.status(403).json({ message: 'Only Owner or Engineer can add members.' })
    return
  }

  const { username } = req.body
  const cleanName = String(username || '').trim()
  if (!cleanName) {
    res.status(400).json({ message: 'username is required.' })
    return
  }

  const user = await User.findOne({ name: { $regex: `^${cleanName}$`, $options: 'i' } })
  if (!user) {
    res.status(404).json({ message: 'No user found with this username.' })
    return
  }

  // Enforce hierarchy:
  // - Owner can add Engineers only
  // - Engineer can add Workers only
  if (actorRole === 'owner' && user.role !== 'engineer') {
    res.status(403).json({ message: 'Owner can only add users with Engineer role.' })
    return
  }
  if (actorRole === 'engineer' && user.role !== 'worker') {
    res.status(403).json({ message: 'Engineer can only add users with Worker role.' })
    return
  }

  if (String(req.project.owner) === String(user._id) || req.project.members.some((m) => String(m) === String(user._id))) {
    res.status(409).json({ message: 'User is already part of this project.' })
    return
  }
  req.project.members.push(user._id)
  await req.project.save()

  try {
    await upsertTeamMemberContact(req.project._id, user)
  } catch (e) {
    console.error('upsertTeamMemberContact:', e?.message || e)
  }

  res.status(201).json({ member: serializeDoc(user) })
}

async function removeTeamMember(req, res) {
  const project = req.project
  const targetId = String(req.params.memberId || '')
  if (!targetId) {
    res.status(400).json({ message: 'memberId is required.' })
    return
  }

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    res.status(400).json({ message: 'Invalid member id.' })
    return
  }

  if (String(project.owner) === targetId) {
    res.status(400).json({ message: 'Cannot remove the project owner.' })
    return
  }

  const memberIds = project.members.map((m) => String(m))
  if (!memberIds.includes(targetId)) {
    res.status(400).json({ message: 'User is not a member of this project.' })
    return
  }

  const uid = String(req.user._id)
  const ownerReq = isProjectOwner(uid, project)
  const engineerReq = isProjectMember(uid, project) && req.user.role === 'engineer'

  const targetUser = await User.findById(targetId).select('role')
  if (!targetUser) {
    res.status(404).json({ message: 'User not found.' })
    return
  }

  if (ownerReq) {
    if (targetUser.role === 'owner') {
      res.status(400).json({ message: 'Cannot remove an owner account from the team list.' })
      return
    }
  } else if (engineerReq) {
    if (targetUser.role !== 'worker') {
      res.status(403).json({ message: 'Engineers can only remove workers from the project.' })
      return
    }
  } else {
    res.status(403).json({ message: 'You are not allowed to remove this member.' })
    return
  }

  project.members = project.members.filter((m) => String(m) !== targetId)
  project.markModified('members')
  await project.save()
  res.json({ message: 'Member removed.' })
}

async function updateTeamMemberRole(req, res) {
  const project = req.project
  const targetId = String(req.params.memberId || '')
  const nextRole = String(req.body.role || '').trim()

  if (!['engineer', 'worker'].includes(nextRole)) {
    res.status(400).json({ message: 'role must be engineer or worker.' })
    return
  }

  if (String(project.owner) === targetId) {
    res.status(400).json({ message: 'Cannot reassign the project owner role here.' })
    return
  }

  const uid = String(req.user._id)
  if (!isProjectOwner(uid, project)) {
    res.status(403).json({ message: 'Only the project owner can reassign roles.' })
    return
  }

  if (!project.members.some((m) => String(m) === targetId)) {
    res.status(400).json({ message: 'User is not a member of this project.' })
    return
  }

  const targetUser = await User.findById(targetId)
  if (!targetUser) {
    res.status(404).json({ message: 'User not found.' })
    return
  }

  if (targetUser.role === 'owner') {
    res.status(400).json({ message: 'Cannot change role for an owner account.' })
    return
  }

  targetUser.role = nextRole
  await targetUser.save()

  res.json({
    member: { id: String(targetUser._id), name: targetUser.name, role: targetUser.role, status: 'Active' },
  })
}

module.exports = { listTeam, addTeamMember, removeTeamMember, updateTeamMemberRole }
