const Project = require('../models/Project')
const { serializeDoc } = require('../utils/serialize')

async function listProjects(req, res) {
  const uid = req.user._id
  const uidStr = String(req.user._id)
  const query =
    req.user.role === 'owner'
      ? {}
      : {
          $or: [{ owner: uid }, { members: uid }, { owner: uidStr }, { members: uidStr }],
        }
  const projects = await Project.find(query)
    .sort({ updatedAt: -1 })
    .lean()

  const list = projects.map((p) => ({
    id: String(p._id),
    name: p.name,
    location: p.location,
    updatedAt: p.updatedAt,
  }))

  res.json({ projects: list })
}

async function createProject(req, res) {
  if (req.user.role !== 'owner') {
    res.status(403).json({ message: 'Only Owner can create projects.' })
    return
  }

  const { name, location } = req.body
  const cleanName = String(name || '').trim()
  const cleanLoc = String(location || '').trim()
  if (!cleanName || !cleanLoc) {
    res.status(400).json({ message: 'name and location are required.' })
    return
  }

  const project = await Project.create({
    name: cleanName,
    location: cleanLoc,
    owner: req.user._id,
    members: [req.user._id],
    planning: {},
  })

  res.status(201).json({ project: serializeDoc(project) })
}

async function getProject(req, res) {
  const p = req.project
  res.json({
    project: {
      id: String(p._id),
      name: p.name,
      location: p.location,
      startDate: p.startDate || '',
      deadline: p.deadline || '',
      status: p.status || 'Active',
      scheduleNotes: p.scheduleNotes || '',
      planning: p.planning || {},
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    },
  })
}

async function deleteProject(req, res) {
  if (req.user.role !== 'owner') {
    res.status(403).json({ message: 'Only Owner can delete projects.' })
    return
  }
  if (String(req.project.owner) !== String(req.user._id)) {
    res.status(403).json({ message: 'Only project owner can delete this project.' })
    return
  }
  await req.project.deleteOne()
  res.json({ message: 'Project deleted.' })
}

/** Persist AI Planning Studio workspace JSON for future AI features (under planning.sanrachnaStudio). */
async function patchPlanningStudio(req, res) {
  if (!['owner', 'engineer'].includes(req.user.role)) {
    res.status(403).json({ message: 'Only owner or engineer can save planning data.' })
    return
  }
  const uid = String(req.user._id)
  const isOwner = String(req.project.owner) === uid
  const onTeam = req.project.members.some((m) => String(m) === uid)
  if (!isOwner && !onTeam) {
    res.status(403).json({ message: 'You do not have access to this project.' })
    return
  }

  const body = req.body || {}
  const studio = body.studio && typeof body.studio === 'object' ? body.studio : body
  if (!studio || typeof studio !== 'object' || Array.isArray(studio)) {
    res.status(400).json({ message: 'Planning studio object is required (or wrap in { studio }).' })
    return
  }

  const cur = req.project.planning && typeof req.project.planning === 'object' ? req.project.planning : {}
  req.project.planning = {
    ...cur,
    sanrachnaStudio: {
      ...(cur.sanrachnaStudio && typeof cur.sanrachnaStudio === 'object' ? cur.sanrachnaStudio : {}),
      ...studio,
      savedAt: new Date().toISOString(),
    },
  }
  req.project.markModified('planning')
  await req.project.save()
  res.json({ message: 'Planning data saved.', planning: req.project.planning })
}

function canWritePlanningProject(req) {
  if (!['owner', 'engineer'].includes(req.user.role)) return false
  const uid = String(req.user._id)
  const isOwner = String(req.project.owner) === uid
  const onTeam = req.project.members.some((m) => String(m) === uid)
  return isOwner || onTeam
}

async function patchPlanningInsights(req, res) {
  if (!canWritePlanningProject(req)) {
    res.status(403).json({ message: 'You cannot update insights for this project.' })
    return
  }
  const body = req.body || {}
  const insights = body.insights && typeof body.insights === 'object' ? body.insights : body
  if (!insights || typeof insights !== 'object' || Array.isArray(insights)) {
    res.status(400).json({ message: 'insights object is required.' })
    return
  }
  const cur = req.project.planning && typeof req.project.planning === 'object' ? req.project.planning : {}
  req.project.planning = {
    ...cur,
    insights: {
      ...(cur.insights && typeof cur.insights === 'object' ? cur.insights : {}),
      ...insights,
      updatedAt: new Date().toISOString(),
    },
  }
  req.project.markModified('planning')
  await req.project.save()
  res.json({ planning: req.project.planning })
}

async function patchPlanningTimeline(req, res) {
  if (!canWritePlanningProject(req)) {
    res.status(403).json({ message: 'You cannot update the timeline for this project.' })
    return
  }
  const body = req.body || {}
  const timeline = body.timeline
  if (!timeline || typeof timeline !== 'object') {
    res.status(400).json({ message: 'timeline object is required.' })
    return
  }
  const cur = req.project.planning && typeof req.project.planning === 'object' ? req.project.planning : {}
  req.project.planning = {
    ...cur,
    timeline,
    timelineSavedAt: new Date().toISOString(),
  }
  req.project.markModified('planning')
  await req.project.save()
  res.json({ message: 'Timeline saved.', planning: req.project.planning })
}

module.exports = {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  patchPlanningStudio,
  patchPlanningInsights,
  patchPlanningTimeline,
}
