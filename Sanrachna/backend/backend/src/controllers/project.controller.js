const Project = require('../models/Project')
const { seedDemoProjectForUser } = require('../services/seedDemoProject')
const { flushInternalTeamPending } = require('../services/internalTeamContact')
const { serializeDoc } = require('../utils/serialize')

function readProjectSettings(planning) {
  const p = planning && typeof planning === 'object' ? planning : {}
  const s = p.settings && typeof p.settings === 'object' ? p.settings : {}
  return {
    startDate: String(s.startDate || ''),
    deadline: String(s.deadline || ''),
    status: String(s.status || 'Active'),
    scheduleNotes: String(s.scheduleNotes || ''),
  }
}

function projectResponse(p) {
  const settings = readProjectSettings(p.planning)
  return {
    id: String(p._id),
    name: p.name,
    location: p.location,
    ...settings,
    planning: p.planning || {},
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

async function listProjects(req, res) {
  await seedDemoProjectForUser(req.user._id)

  const projects = await Project.find({
    $or: [{ owner: req.user._id }, { members: req.user._id }],
  })
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

  await flushInternalTeamPending(req.user._id, project._id)

  res.status(201).json({ project: serializeDoc(project) })
}

async function getProject(req, res) {
  res.json({ project: projectResponse(req.project) })
}

async function updateProject(req, res) {
  const uid = String(req.user._id)
  const isOwner = String(req.project.owner) === uid
  const isEngineerOnTeam =
    req.user.role === 'engineer' && req.project.members.some((m) => String(m) === uid)

  if (!isOwner && !isEngineerOnTeam) {
    res.status(403).json({ message: 'You cannot update this project.' })
    return
  }

  const body = req.body || {}
  const p = req.project
  const planning = p.planning && typeof p.planning === 'object' ? { ...p.planning } : {}
  const settings = planning.settings && typeof planning.settings === 'object' ? { ...planning.settings } : {}

  if (isOwner) {
    if (body.name != null) {
      const n = String(body.name).trim()
      if (!n) {
        res.status(400).json({ message: 'Project name is required.' })
        return
      }
      p.name = n
    }
    if (body.location != null) {
      const loc = String(body.location).trim()
      if (!loc) {
        res.status(400).json({ message: 'Location is required.' })
        return
      }
      p.location = loc
    }
  }

  if (isOwner || isEngineerOnTeam) {
    if (body.startDate !== undefined) settings.startDate = String(body.startDate ?? '').trim()
    if (body.deadline !== undefined) settings.deadline = String(body.deadline ?? '').trim()
    if (body.status !== undefined) settings.status = String(body.status ?? 'Active').trim() || 'Active'
    if (body.scheduleNotes !== undefined) settings.scheduleNotes = String(body.scheduleNotes ?? '').trim()
  }

  planning.settings = settings
  p.planning = planning
  p.markModified('planning')
  await p.save()

  res.json({ project: projectResponse(p) })
}

module.exports = { listProjects, createProject, getProject, updateProject }
