const mongoose = require('mongoose')
const User = require('../models/User')
const Project = require('../models/Project')
const { upsertTeamMemberContact } = require('../services/internalTeamContact')
const { escapeRegex } = require('../utils/escapeRegex')

function isProjectOwner(userId, project) {
  return String(project.owner) === String(userId)
}

function isProjectMember(userId, project) {
  return project.members.some((m) => String(m) === String(userId))
}

async function getTeam(req, res) {
  const project = await Project.findById(req.project._id)
    .populate('owner', 'name email role')
    .populate('members', 'name email role')

  const ownerDoc = project.owner
  const ownerId = String(ownerDoc._id || ownerDoc)

  const rows = []
  const seen = new Set()

  rows.push({
    id: ownerId,
    name: ownerDoc.name,
    role: 'owner',
    status: 'Active',
  })
  seen.add(ownerId)

  for (const m of project.members) {
    const mid = String(m._id || m)
    if (seen.has(mid)) continue
    seen.add(mid)
    rows.push({
      id: mid,
      name: m.name,
      role: m.role,
      status: 'Active',
    })
  }

  res.json({ members: rows })
}

async function addTeamMember(req, res) {
  const project = req.project
  const username = String(req.body.username || '').trim()
  if (!username) {
    res.status(400).json({ message: 'username is required.' })
    return
  }

  const target = await User.findOne({ name: new RegExp(`^${escapeRegex(username)}$`, 'i') })
  if (!target) {
    res.status(404).json({ message: 'User not found.' })
    return
  }

  const uid = String(req.user._id)
  const ownerReq = isProjectOwner(uid, project)
  const memberReq = isProjectMember(uid, project)

  if (ownerReq) {
    if (target.role !== 'engineer') {
      res.status(400).json({ message: 'Owner can only add users with the Engineer role.' })
      return
    }
  } else if (memberReq && req.user.role === 'engineer') {
    if (target.role !== 'worker') {
      res.status(400).json({ message: 'Engineers can only add users with the Worker role.' })
      return
    }
  } else {
    res.status(403).json({ message: 'You are not allowed to add members to this project.' })
    return
  }

  const tid = String(target._id)
  if (String(project.owner) === tid || project.members.some((m) => String(m) === tid)) {
    res.status(400).json({ message: 'User is already on this project.' })
    return
  }

  project.members.push(target._id)
  await project.save()

  try {
    await upsertTeamMemberContact(project._id, target)
  } catch (e) {
    console.error('upsertTeamMemberContact failed:', e?.message || e)
  }

  res.status(201).json({
    member: { id: tid, name: target.name, role: target.role, status: 'Active' },
  })
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

/**
 * Updates the user's global role (User.role). Suitable for demo/small deployments;
 * for production, prefer project-scoped roles.
 */
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

module.exports = { getTeam, addTeamMember, removeTeamMember, updateTeamMemberRole }
