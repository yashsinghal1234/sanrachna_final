const Contact = require('../models/Contact')
const Project = require('../models/Project')
const User = require('../models/User')
const { seedDemoProjectForUser } = require('./seedDemoProject')

async function createInternalTeamContactRow({ projectId, name, phone, email, userRole }) {
  const roleLabel = userRole === 'owner' ? 'Owner' : userRole === 'worker' ? 'Worker' : 'Engineer'
  await Contact.create({
    project: projectId,
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    role: roleLabel,
    contactType: 'Internal Team',
    phase: 'Foundation',
  })
}

/**
 * After signup: seed demo project if needed, then add the user as an Internal Team contact
 * on their first accessible project. If no project exists yet, store pending on the user
 * and flush when they create a project.
 */
async function syncSignupInternalContact(user) {
  let project = await seedDemoProjectForUser(user._id)
  if (!project) {
    project = await Project.findOne({ $or: [{ owner: user._id }, { members: user._id }] })
      .sort({ updatedAt: -1 })
      .lean()
  }

  if (project) {
    await createInternalTeamContactRow({
      projectId: project._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      userRole: user.role,
    })
    return
  }

  user.internalTeamPending = { name: user.name, phone: user.phone }
  await user.save()
}

async function flushInternalTeamPending(userId, newProjectId) {
  const user = await User.findById(userId)
  if (!user?.internalTeamPending?.name) return

  await createInternalTeamContactRow({
    projectId: newProjectId,
    name: user.internalTeamPending.name,
    phone: user.internalTeamPending.phone,
    email: user.email,
    userRole: user.role,
  })

  await User.updateOne({ _id: userId }, { $unset: { internalTeamPending: 1 } })
}

/**
 * When a user is added to a project team, mirror them into that project's Contacts
 * (Internal Team) so the directory stays in sync. Upserts by project + email.
 */
async function upsertTeamMemberContact(projectId, user) {
  const email = String(user.email || '').trim().toLowerCase()
  if (!email) return

  const roleLabel = user.role === 'owner' ? 'Owner' : user.role === 'worker' ? 'Worker' : 'Engineer'
  const phone = String(user.phone || '').trim() || '—'
  const name = String(user.name || '').trim()

  await Contact.findOneAndUpdate(
    { project: projectId, email },
    {
      $set: {
        name,
        phone,
        role: roleLabel,
        contactType: 'Internal Team',
        email,
      },
      $setOnInsert: {
        project: projectId,
        phase: '',
      },
    },
    { upsert: true, runValidators: true },
  )
}

module.exports = {
  createInternalTeamContactRow,
  syncSignupInternalContact,
  flushInternalTeamPending,
  upsertTeamMemberContact,
}
