const DailyLog = require('../models/DailyLog')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listLogs(req, res) {
  const rows = await DailyLog.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(100)
  res.json({ logs: serializeDocs(rows) })
}

async function createLog(req, res) {
  const { date, tasks_completed, workers_present, issues, photo_url, author } = req.body
  const d = String(date || '').trim()
  const tasks = String(tasks_completed || '').trim()
  const wp = Number(workers_present)
  const auth = String(author || req.user.name || '').trim()

  if (!d || !tasks || Number.isNaN(wp) || !auth) {
    res.status(400).json({ message: 'date, tasks_completed, workers_present, and author are required.' })
    return
  }

  const row = await DailyLog.create({
    project: req.project._id,
    date: d,
    tasks_completed: tasks,
    workers_present: wp,
    issues: String(issues || ''),
    photo_url: photo_url || null,
    author: auth,
  })

  res.status(201).json({ log: serializeDoc(row) })
}

module.exports = { listLogs, createLog }
