const DailyLog = require('../models/DailyLog')
const Rfi = require('../models/Rfi')
const Issue = require('../models/Issue')
const { serializeDocs } = require('../utils/serialize')

function buildActivity(logs, rfis, issues) {
  const items = []

  for (const issue of issues.slice(0, 4)) {
    items.push({
      id: `issue_${issue._id}`,
      type: 'issue',
      title: `${issue.severity} — site issue`,
      detail: issue.description.slice(0, 120),
      at: issue.raised_at,
    })
  }
  for (const rfi of rfis.slice(0, 4)) {
    items.push({
      id: `rfi_${rfi._id}`,
      type: 'rfi',
      title: 'RFI update',
      detail: rfi.description.slice(0, 120),
      at: rfi.raised_at,
    })
  }
  for (const log of logs.slice(0, 4)) {
    items.push({
      id: `log_${log._id}`,
      type: 'log',
      title: 'Daily log submitted',
      detail: log.tasks_completed.slice(0, 120),
      at: log.date,
    })
  }

  items.sort((a, b) => String(b.at).localeCompare(String(a.at)))
  return items.slice(0, 10)
}

async function getDashboard(req, res) {
  const project = req.project
  const planning = project.planning || {}

  const [logs, rfis, issues] = await Promise.all([
    DailyLog.find({ project: project._id }).sort({ createdAt: -1 }).limit(25).lean(),
    Rfi.find({ project: project._id }).sort({ createdAt: -1 }).limit(25).lean(),
    Issue.find({ project: project._id }).sort({ createdAt: -1 }).limit(25).lean(),
  ])

  const projectSummary = {
    ...(planning.project_summary || {}),
    id: String(project._id),
    name: project.name,
    location: project.location,
  }

  res.json({
    role: req.user.role,
    project: projectSummary,
    cost_breakdown: planning.cost_breakdown || null,
    resources: planning.resources || [],
    timeline_tasks: planning.timeline_tasks || [],
    pie_cost_by_phase: planning.pie_cost_by_phase || [],
    planned_vs_actual: planning.planned_vs_actual || [],
    score_breakdown: planning.score_breakdown || null,
    worker_tasks: planning.worker_tasks || [],
    recent_activity: buildActivity(logs, rfis, issues),
    logs: serializeDocs(logs),
    rfis: serializeDocs(rfis),
    issues: serializeDocs(issues),
  })
}

module.exports = { getDashboard }
