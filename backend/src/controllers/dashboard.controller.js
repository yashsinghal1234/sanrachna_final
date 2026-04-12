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

/**
 * Derives CostBreakdown and TimelineTasks from an approved report (sanrachnaStudio.masterPlan).
 * Falls back to legacy planning fields if masterPlan is not present.
 */
function deriveDashboardFromMasterPlan(masterPlan) {
  const cb = masterPlan.costBreakdown || {}
  const phases = Array.isArray(cb.phases) ? cb.phases : []

  // Map phases into INR bucket keys
  const phaseMap = {}
  for (const p of phases) {
    phaseMap[String(p.name || '').toLowerCase()] = Number(p.cost) || 0
  }

  const cost_breakdown = {
    foundation_inr: phaseMap['foundation'] || phaseMap['site preparation'] || 0,
    structure_inr:
      phaseMap['structure'] || phaseMap['structural works'] || phaseMap['structural'] || 0,
    mep_inr: phaseMap['mep'] || phaseMap['mechanical, electrical & plumbing'] || 0,
    finishing_inr:
      phaseMap['finishing'] || phaseMap['interiors'] || phaseMap['interior'] || 0,
    contingency_inr: Number(cb.contingencyAmount) || 0,
    total_inr:
      Number(cb.totalCost) ||
      phases.reduce((a, p) => a + (Number(p.cost) || 0), 0),
  }

  // Derive timeline_tasks from timeline phases
  const tlPhases = Array.isArray(masterPlan.timeline?.phases) ? masterPlan.timeline.phases : []
  let weekCursor = 0
  const timeline_tasks = tlPhases.map((phase, i) => {
    const durationWeeks = Math.max(1, Math.round((Number(phase.months) || 1) * 4.33))
    const task = {
      id: `phase_${i}`,
      name: phase.name || `Phase ${i + 1}`,
      phase: derivePhaseKey(phase.name || ''),
      start_week: weekCursor,
      end_week: weekCursor + durationWeeks,
      dependency_ids: i > 0 ? [`phase_${i - 1}`] : [],
      pct_complete: 0,
    }
    weekCursor += durationWeeks
    return task
  })

  return { cost_breakdown, timeline_tasks }
}

function derivePhaseKey(name) {
  const n = String(name).toLowerCase()
  if (n.includes('foundation') || n.includes('site')) return 'foundation'
  if (n.includes('structure') || n.includes('structural')) return 'structure'
  if (n.includes('mep') || n.includes('mechanical') || n.includes('electrical')) return 'mep'
  if (n.includes('finish') || n.includes('interior')) return 'finishing'
  return 'structure'
}

async function getDashboard(req, res) {
  const project = req.project
  const planning = project.planning || {}
  const studio = planning.sanrachnaStudio || {}
  const masterPlan = studio.masterPlan || null

  const [logs, rfis, issues] = await Promise.all([
    DailyLog.find({ project: project._id }).sort({ createdAt: -1 }).limit(25).lean(),
    Rfi.find({ project: project._id }).sort({ createdAt: -1 }).limit(25).lean(),
    Issue.find({ project: project._id }).sort({ createdAt: -1 }).limit(25).lean(),
  ])

  const summaryBase = planning.project_summary || {}
  const formData = studio.currentForm || {}

  const summary = {
    ...(summaryBase),
    id: String(project._id),
    name: project.name,
    location: project.location || summaryBase.location || '',
    area_sqm: summaryBase.area_sqm || Number(formData.builtUpArea) || 0,
    project_type: summaryBase.project_type || formData.projectType || 'Construction',
    target_completion: summaryBase.target_completion || project.deadline || '',
    currency: 'INR',
  }

  // Use masterPlan as primary source if available
  let cost_breakdown = planning.cost_breakdown || null
  let timeline_tasks = planning.timeline_tasks || []

  if (masterPlan && masterPlan.costBreakdown) {
    const derived = deriveDashboardFromMasterPlan(masterPlan)
    cost_breakdown = derived.cost_breakdown
    // Prefer backend-stored timeline_tasks if present, else derive
    if (!timeline_tasks.length) {
      timeline_tasks = derived.timeline_tasks
    }
    // Enrich summary from form data if no explicit project_summary
    if (!summaryBase.target_completion && masterPlan.timeline?.totalMonths) {
      const targetDate = new Date()
      targetDate.setMonth(targetDate.getMonth() + masterPlan.timeline.totalMonths)
      summary.target_completion = targetDate.toISOString().slice(0, 10)
    }
  }

  const activity = buildActivity(logs, rfis, issues)

  res.json({
    role: req.user.role,
    summary,
    // Keep 'project' key for backward compat
    project: summary,
    cost_breakdown,
    resources: planning.resources || [],
    timeline_tasks,
    pie_cost_by_phase: planning.pie_cost_by_phase || [],
    planned_vs_actual: planning.planned_vs_actual || [],
    score_breakdown: planning.score_breakdown || null,
    worker_tasks: planning.worker_tasks || [],
    activity,
    // Keep 'recent_activity' key for backward compat
    recent_activity: activity,
    logs: serializeDocs(logs),
    rfis: serializeDocs(rfis),
    issues: serializeDocs(issues),
  })
}

module.exports = { getDashboard }
