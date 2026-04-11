const Contact = require('../models/Contact')

/**
 * When a user is added to a project team, mirror them into Contacts (upsert by project + email).
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
        email,
        contactType: 'Internal Team',
        phase: '',
      },
      $setOnInsert: {
        project: projectId,
      },
    },
    { upsert: true, runValidators: true },
  )
}

module.exports = { upsertTeamMemberContact }
