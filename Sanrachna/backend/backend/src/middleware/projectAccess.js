function userCanAccessProject(userId, project) {
  const uid = userId.toString()
  if (project.owner.toString() === uid) return true
  return project.members.some((m) => m.toString() === uid)
}

module.exports = { userCanAccessProject }
