const { serializeDoc } = require('../../utils/serialize')

async function getProjectSettings(req, res) {
  const p = req.project
  res.json({
    project: {
      id: String(p._id),
      name: p.name,
      location: p.location,
      startDate: p.startDate,
      deadline: p.deadline,
      status: p.status,
      scheduleNotes: p.scheduleNotes,
    },
  })
}

async function updateProjectSettings(req, res) {
  const actorRole = req.user.role
  if (actorRole !== 'owner' && actorRole !== 'engineer') {
    res.status(403).json({ message: 'Only Owner or Engineer can update project settings.' })
    return
  }
  const allowed =
    actorRole === 'owner'
      ? ['name', 'location', 'startDate', 'deadline', 'status', 'scheduleNotes']
      : ['startDate', 'deadline', 'status', 'scheduleNotes']
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.project[key] = req.body[key]
  }
  await req.project.save()
  res.json({ project: serializeDoc(req.project) })
}

module.exports = { getProjectSettings, updateProjectSettings }
