const DailyLog = require('../models/DailyLog')
const Project = require('../models/Project')
const { serializeDoc } = require('../utils/serialize')

async function recomputeAttendanceRollup(projectId) {
  const project = await Project.findById(projectId)
  if (!project) return
  const logs = await DailyLog.find({ project: projectId, status: 'approved' }).select('date workers_present submittedBy').lean()
  const byDate = {}
  /** Per calendar log date: how many approved photo logs each user (worker) submitted — used as presence for that worker. */
  const workerAttendanceByDate = {}
  for (const row of logs) {
    const key = row.date
    const n = Number(row.workers_present)
    const add = Number.isFinite(n) && n >= 0 ? n : 0
    byDate[key] = (byDate[key] || 0) + add

    const uid = row.submittedBy ? String(row.submittedBy) : ''
    if (uid) {
      if (!workerAttendanceByDate[key]) workerAttendanceByDate[key] = {}
      workerAttendanceByDate[key][uid] = (workerAttendanceByDate[key][uid] || 0) + 1
    }
  }
  const cur = project.planning && typeof project.planning === 'object' ? project.planning : {}
  project.planning = {
    ...cur,
    attendanceByDate: byDate,
    workerAttendanceByDate,
    attendanceRollupUpdatedAt: new Date().toISOString(),
  }
  project.markModified('planning')
  await project.save()
}

function logToDto(doc) {
  const pop = doc.submittedBy
  const o = serializeDoc(doc)
  if (pop && typeof pop === 'object' && pop._id) {
    o.submittedBy = String(pop._id)
    o.submittedByName = typeof pop.name === 'string' ? pop.name : undefined
  } else if (doc.submittedBy) {
    o.submittedBy = String(doc.submittedBy)
  }
  return o
}

async function listLogs(req, res) {
  const rows = await DailyLog.find({ project: req.project._id })
    .populate({ path: 'submittedBy', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(200)
  res.json({ logs: rows.map((d) => logToDto(d)) })
}

async function createLog(req, res) {
  if (req.user.role !== 'worker') {
    res.status(403).json({ message: 'Only workers can submit photo logs.' })
    return
  }
  if (!req.file) {
    res.status(400).json({ message: 'Photo is required.' })
    return
  }

  const d = String(req.body.date || '').trim() || new Date().toISOString().slice(0, 10)
  const tasks = String(req.body.tasks_completed || 'Site photo log').trim() || 'Site photo log'
  const issues = String(req.body.issues || '')
  const capRaw = String(req.body.photoCapturedAt || '').trim()
  const uploadedAt = new Date().toISOString()
  const photoCapturedAt =
    /^\d{4}-\d{2}-\d{2}T/.test(capRaw) && !Number.isNaN(Date.parse(capRaw)) ? new Date(capRaw).toISOString() : null

  const row = await DailyLog.create({
    project: req.project._id,
    date: d,
    tasks_completed: tasks,
    workers_present: 0,
    issues,
    photo_url: `/uploads/logs/${req.file.filename}`,
    author: String(req.user.name || 'Worker').trim() || 'Worker',
    submittedBy: req.user._id,
    status: 'pending',
    photoCapturedAt: photoCapturedAt || null,
    photoUploadedAt: uploadedAt,
  })

  const withPop = await DailyLog.findById(row._id).populate({ path: 'submittedBy', select: 'name' })
  res.status(201).json({ log: withPop ? logToDto(withPop) : serializeDoc(row) })
}

async function updateLogStatus(req, res) {
  if (req.user.role !== 'engineer') {
    res.status(403).json({ message: 'Only engineers can approve or reject worker photo logs.' })
    return
  }

  const { logId } = req.params
  const { status, workersPresent } = req.body || {}

  const log = await DailyLog.findOne({ _id: logId, project: req.project._id })
  if (!log) {
    res.status(404).json({ message: 'Log not found.' })
    return
  }

  if (status === 'approved') {
    log.status = 'approved'
    const wp = Number(workersPresent)
    log.workers_present = Number.isFinite(wp) && wp >= 0 ? wp : 1
  } else if (status === 'rejected') {
    log.status = 'rejected'
    log.workers_present = 0
  } else {
    res.status(400).json({ message: 'status must be "approved" or "rejected".' })
    return
  }

  await log.save()
  await recomputeAttendanceRollup(req.project._id)
  const withPop = await DailyLog.findById(log._id).populate({ path: 'submittedBy', select: 'name' })
  res.json({ log: withPop ? logToDto(withPop) : serializeDoc(log) })
}

module.exports = { listLogs, createLog, updateLogStatus, recomputeAttendanceRollup }
