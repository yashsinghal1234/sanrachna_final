function userCanAccessProject(user, project) {
  if (user?.role === 'owner') return true
  const uid = user._id.toString()
  if (project.owner.toString() === uid) return true
  return project.members.some((m) => m.toString() === uid)
}

module.exports = { userCanAccessProject }
