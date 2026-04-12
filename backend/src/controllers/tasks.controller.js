const mongoose = require('mongoose')
const Task = require('../models/Task')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

const VALID_STATUSES = ['Not started', 'In progress', 'Completed', 'Blocked']
const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const VALID_PHASES = ['Foundation', 'Structure', 'MEP', 'Finishing', 'Execution', 'Substructure', 'Superstructure', 'Handover']

function toDto(row) {
  const obj = serializeDoc(row)
  return {
    id: obj.id,
    projectId: obj.project?.toString() || '',
    assignedTo: obj.assignedTo || '',
    assignedBy: obj.assignedBy || '',
    title: obj.title,
    description: obj.description || '',
    phase: obj.phase || 'Execution',
    location: obj.location || '',
    priority: obj.priority || 'Medium',
    status: obj.status || 'Not started',
    progressPct: typeof obj.progressPct === 'number' ? obj.progressPct : 0,
    startAt: obj.startAt || obj.createdAt || new Date().toISOString(),
    dueAt: obj.dueAt,
    requiredMaterials: Array.isArray(obj.requiredMaterials) ? obj.requiredMaterials : [],
    safetyInstructions: Array.isArray(obj.safetyInstructions) ? obj.safetyInstructions : [],
    engineerNotes: obj.engineerNotes || '',
    blockedReason: obj.blockedReason || null,
    activity: Array.isArray(obj.activity) ? obj.activity : [],
    ganttTaskId: obj.ganttTaskId || '',
    linkedDocs: [],
    dependencies: [],
  }
}

// GET /api/projects/:projectId/tasks?worker=<workerKey>
async function listTasks(req, res) {
  const filter = { project: req.project._id }
  if (req.query.worker) {
    // Fuzzy match: allow "Worker — yogesh" or just "yogesh"
    filter.assignedTo = { $regex: req.query.worker, $options: 'i' }
  }
  const rows = await Task.find(filter).sort({ dueAt: 1 }).limit(200)
  res.json({ tasks: rows.map(toDto) })
}

// POST /api/projects/:projectId/tasks
async function createTask(req, res) {
  const body = req.body || {}
  const titleRaw = body.title || body.name // Gantt sends 'name', MyTasks sends 'title'
  if (!titleRaw) {
    res.status(400).json({ message: 'title (or name) is required.' })
    return
  }
  const dueAtRaw = body.dueAt || body.endDate
  if (!dueAtRaw) {
    res.status(400).json({ message: 'dueAt is required.' })
    return
  }

  const task = await Task.create({
    project: req.project._id,
    assignedTo: String(body.assignedTo || body.assignedCrew || ''),
    assignedBy: String(body.assignedBy || req.user?.name || ''),
    title: String(titleRaw),
    description: String(body.description || ''),
    phase: VALID_PHASES.includes(body.phase) ? body.phase : 'Execution',
    location: String(body.location || ''),
    priority: VALID_PRIORITIES.includes(body.priority) ? body.priority : 'Medium',
    status: VALID_STATUSES.includes(body.status) ? body.status : 'Not started',
    progressPct: Math.max(0, Math.min(100, Number(body.progressPct ?? 0))),
    startAt: body.startAt || body.startDate || new Date().toISOString(),
    dueAt: String(dueAtRaw),
    requiredMaterials: Array.isArray(body.requiredMaterials) ? body.requiredMaterials : [],
    safetyInstructions: Array.isArray(body.safetyInstructions) ? body.safetyInstructions : [],
    engineerNotes: String(body.engineerNotes || ''),
    ganttTaskId: String(body.ganttTaskId || ''),
    activity: [{ at: new Date().toISOString(), text: 'Task created.' }],
  })

  res.status(201).json({ task: toDto(task) })
}

// PATCH /api/projects/:projectId/tasks/:taskId
// taskId may be a MongoDB ObjectId OR a Gantt local id (e.g. "task_abc_xyz").
// If the raw value isn't a valid ObjectId we fall back to lookup by ganttTaskId field.
async function updateTask(req, res) {
  const rawId = req.params.taskId

  let task = null
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    task = await Task.findOne({ _id: rawId, project: req.project._id })
  }
  // Fallback: look up by ganttTaskId cross-reference
  if (!task && rawId) {
    task = await Task.findOne({ ganttTaskId: rawId, project: req.project._id })
  }

  if (!task) {
    res.status(404).json({ message: 'Task not found.' })
    return
  }

  const body = req.body || {}
  const actorName = req.user?.name || 'Worker'
  const activityEntries = []

  if (body.status && VALID_STATUSES.includes(body.status) && body.status !== task.status) {
    activityEntries.push({ at: new Date().toISOString(), text: `Status changed to "${body.status}" by ${actorName}.` })
    task.status = body.status
  }

  if (body.priority && VALID_PRIORITIES.includes(body.priority)) task.priority = body.priority
  if (body.phase && VALID_PHASES.includes(body.phase)) task.phase = body.phase
  if (body.title) task.title = String(body.title)
  if (body.assignedTo !== undefined) task.assignedTo = String(body.assignedTo)
  if (body.startAt || body.startDate) task.startAt = body.startAt || body.startDate
  if (body.dueAt || body.endDate) task.dueAt = body.dueAt || body.endDate
  if (body.engineerNotes !== undefined) task.engineerNotes = String(body.engineerNotes)

  if (typeof body.progressPct === 'number') {
    const pct = Math.max(0, Math.min(100, Math.round(body.progressPct)))
    if (pct !== task.progressPct) {
      activityEntries.push({
        at: new Date().toISOString(),
        text: `Progress updated to ${pct}% by ${actorName}${body.note ? ` — ${body.note}` : ''}.`,
      })
    }
    task.progressPct = pct
  }
  if (body.blockedReason !== undefined) task.blockedReason = body.blockedReason || null
  if (Array.isArray(body.activity)) {
    task.activity = body.activity
  } else if (activityEntries.length) {
    task.activity = [...activityEntries, ...task.activity.slice(0, 49)]
  }

  await task.save()
  res.json({ task: toDto(task) })
}

// DELETE /api/projects/:projectId/tasks/:taskId
async function deleteTask(req, res) {
  const rawId = req.params.taskId
  // Support both MongoDB ObjectId and ganttTaskId
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    await Task.deleteOne({ _id: rawId, project: req.project._id })
  } else {
    await Task.deleteOne({ ganttTaskId: rawId, project: req.project._id })
  }
  res.json({ success: true })
}

module.exports = { listTasks, createTask, updateTask, deleteTask }
