const Task = require('../models/Task')
const Issue = require('../models/Issue')
const Rfi = require('../models/Rfi')
const DailyLog = require('../models/DailyLog')
const DocumentMeta = require('../models/DocumentMeta')
const Notification = require('../models/Notification')
const Contact = require('../models/Contact')

function safeDate(value) {
  if (!value) return '?'
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function money(value) {
  const n = Number(value) || 0
  return `₹${n.toLocaleString('en-IN')}`
}

function getMasterPlan(project) {
  return project?.planning?.sanrachnaStudio?.masterPlan || null
}

function buildCostContext(project) {
  const masterPlan = getMasterPlan(project)
  const planning = project.planning || {}

  if (masterPlan?.costBreakdown) {
    const cb = masterPlan.costBreakdown
    const phases = Array.isArray(cb.phases) ? cb.phases : []
    const phaseLines = phases.slice(0, 8).map(
      (p) => `[COST PHASE] ${p.name || 'Phase'} | Cost: ${money(p.cost)}`
    )

    return [
      `[COST SUMMARY] Total Cost: ${money(cb.totalCost)} | Contingency: ${money(cb.contingencyAmount)} | Currency: INR`,
      ...phaseLines,
    ].join('\n')
  }

  if (planning.cost_breakdown) {
    const cb = planning.cost_breakdown
    return `[COST SUMMARY] Foundation: ${money(cb.foundation_inr)} | Structure: ${money(cb.structure_inr)} | MEP: ${money(cb.mep_inr)} | Finishing: ${money(cb.finishing_inr)} | Contingency: ${money(cb.contingency_inr)} | Total: ${money(cb.total_inr)}`
  }

  return 'No cost/resource planning data found.'
}

function buildBomContext(project) {
  const masterPlan = getMasterPlan(project)
  const bom = Array.isArray(masterPlan?.billOfMaterials) ? masterPlan.billOfMaterials : []

  if (!bom.length) return 'No BOQ/BOM material data found.'

  return bom.slice(0, 20).map((row, i) => {
    const qty = row.quantity ?? '?'
    const unit = row.unit || 'unit'
    const rate = money(row.unitRate)
    const total = money(row.totalCost ?? (Number(row.quantity) || 0) * (Number(row.unitRate) || 0))

    return `[BOM] ${i + 1}. ${row.material || 'Material'} | Quantity: ${qty} ${unit} | Rate: ${rate}/${unit} | Total: ${total}`
  }).join('\n')
}

function buildProcurementContext(project) {
  const masterPlan = getMasterPlan(project)
  if (!masterPlan) return 'No procurement planning report found.'

  const bom = Array.isArray(masterPlan.billOfMaterials) ? masterPlan.billOfMaterials : []
  const phases = Array.isArray(masterPlan.timeline?.phases) ? masterPlan.timeline.phases : []
  const risks = Array.isArray(masterPlan.riskForecast) ? masterPlan.riskForecast : []
  const optimizations = Array.isArray(masterPlan.optimizations) ? masterPlan.optimizations : []

  const materialLines = bom.slice(0, 10).map((row, i) => {
    const phase = phases[i % Math.max(1, phases.length)]?.name || 'Linked phase not available'
    return `[PROCUREMENT ITEM] ${row.material || 'Material'} | Required for: ${phase} | Quantity: ${row.quantity ?? '?'} ${row.unit || ''} | Estimated cost: ${money(row.totalCost)}`
  })

  const riskLines = risks
    .filter((r) => {
      const text = `${r.level || ''} ${r.risk || ''}`.toLowerCase()
      return text.includes('high') || text.includes('material') || text.includes('supply') || text.includes('vendor') || text.includes('delay') || text.includes('procurement')
    })
    .slice(0, 8)
    .map((r) => `[PROCUREMENT RISK] Level: ${r.level || '?'} | Risk: ${r.risk || '?'} | Mitigation: ${r.mitigation || '?'}`)

  const optimizationLines = optimizations.slice(0, 6).map(
    (o) => `[VALUE ENGINEERING] ${o.suggestion || 'Optimization'} | Impact: ${o.impact || '?'} | Saving: ${money(o.savingAmount)}`
  )

  const lines = [...materialLines, ...riskLines, ...optimizationLines]
  return lines.length ? lines.join('\n') : 'No procurement-specific items, risks, or recommendations found.'
}

function buildTimelinePlanningContext(project) {
  const masterPlan = getMasterPlan(project)
  const phases = Array.isArray(masterPlan?.timeline?.phases) ? masterPlan.timeline.phases : []

  if (!phases.length) return 'No planning timeline data found.'

  return phases.slice(0, 12).map((p) => {
    const milestones = Array.isArray(p.milestones) ? p.milestones.slice(0, 4).join(', ') : ''
    return `[PLANNING PHASE] ${p.name || 'Phase'} | Duration: ${p.duration || '?'} | Start: ${p.startDate || '?'} | End: ${p.endDate || '?'} | Milestones: ${milestones || '?'}`
  }).join('\n')
}

function buildPlanningRiskContext(project) {
  const masterPlan = getMasterPlan(project)
  const risks = Array.isArray(masterPlan?.riskForecast) ? masterPlan.riskForecast : []

  if (!risks.length) return 'No planning risk forecast found.'

  return risks.slice(0, 12).map(
    (r) => `[PLANNING RISK] Level: ${r.level || '?'} | Risk: ${r.risk || '?'} | Mitigation: ${r.mitigation || '?'}`
  ).join('\n')
}

async function buildProjectContext(project, userRole) {
  const pid = project._id

  const [tasks, issues, rfis, logs, documents, notifications, contacts] = await Promise.all([
    Task.find({ project: pid }).sort({ dueAt: 1 }).limit(80).lean(),
    Issue.find({ project: pid }).sort({ createdAt: -1 }).limit(60).lean(),
    Rfi.find({ project: pid }).sort({ createdAt: -1 }).limit(50).lean(),
    DailyLog.find({ project: pid }).sort({ createdAt: -1 }).limit(20).lean(),
    DocumentMeta.find({ project: pid }).sort({ createdAt: -1 }).limit(80).lean(),
    Notification.find({ project: pid }).sort({ createdAt: -1 }).limit(40).lean(),
    Contact.find({ project: pid }).sort({ createdAt: -1 }).limit(50).lean(),
  ])

  const now = new Date()

  const taskLines = tasks.slice(0, 60).map((t) => {
    const dueDate = t.dueAt ? new Date(t.dueAt) : null
    const overdue =
      dueDate &&
      !Number.isNaN(dueDate.getTime()) &&
      dueDate < now &&
      !['Completed', 'completed', 'Done', 'done'].includes(t.status)

    return `[TASK] ${t.title} | Phase: ${t.phase || '?'} | Status: ${t.status || '?'} | Progress: ${t.progressPct ?? '?'}% | Assigned: ${t.assignedTo || 'Unassigned'} | Due: ${safeDate(t.dueAt)} | Priority: ${t.priority || '?'}${overdue ? ' | OVERDUE: yes' : ''}${t.blockedReason ? ` | Blocked: ${t.blockedReason}` : ''}`
  })

  const issueLines = issues.slice(0, 40).map(
    (i) =>
      `[ISSUE] ${i.title || i.issue_id || 'Issue'} | Status: ${i.status || '?'} | Severity: ${i.severity || '?'} | Location: ${i.location || '?'} | Reported by: ${i.reportedBy || '?'} | Created: ${safeDate(i.createdAt)}`
  )

  const rfiLines = rfis.slice(0, 35).map(
    (r) =>
      `[RFI] ${r.title || r.rfi_id || 'RFI'} | Status: ${r.status || '?'} | Priority: ${r.priority || '?'} | Raised by: ${r.raisedBy || '?'} | Created: ${safeDate(r.createdAt)}`
  )

  const logLines = logs.slice(0, 15).map(
    (l) =>
      `[LOG] Date: ${safeDate(l.date || l.createdAt)} | Workers present: ${l.workers_present ?? '?'} | Tasks: ${l.tasks_completed || '—'} | Issues/Notes: ${l.issues || '—'}`
  )

  const documentLines = documents.slice(0, 40).map(
    (d) =>
      `[DOCUMENT] ${d.title || 'Document'} | Type: ${d.doc_type || 'other'} | Phase: ${d.phase || '?'} | Review: ${d.review_status || '?'} | Access: ${d.access || '?'} | Version: v${d.current_version || 1} | Linked RFIs: ${d.linked_rfis || 0} | Linked Issues: ${d.linked_issues || 0} | Uploaded: ${safeDate(d.uploaded_at || d.createdAt)} | Tags: ${(d.tags || []).join(', ') || 'none'}`
  )

  const notificationLines = notifications.slice(0, 25).map(
    (n) =>
      `[NOTIFICATION] ${n.title || 'Notification'} | Priority: ${n.priority || '?'} | Type: ${n.type || '?'} | Role: ${n.role || '?'} | Status: ${n.status || '?'} | Body: ${n.body || ''}`
  )

  const contactLines = contacts.slice(0, 25).map(
    (c) =>
      `[CONTACT] ${c.name || 'Contact'} | Role: ${c.role || '?'} | Type: ${c.contactType || '?'} | Phase: ${c.phase || '?'} | Email: ${c.email || '?'} | Phone: ${c.phone || '?'}`
  )

  const completed = tasks.filter((t) => ['Completed', 'completed', 'Done', 'done'].includes(t.status)).length
  const blocked = tasks.filter((t) => ['Blocked', 'blocked'].includes(t.status)).length
  const overdue = tasks.filter((t) => {
    const dueDate = t.dueAt ? new Date(t.dueAt) : null
    return dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < now && !['Completed', 'completed', 'Done', 'done'].includes(t.status)
  }).length

  const openIssues = issues.filter((i) => !['Closed', 'closed', 'Verified', 'verified', 'Resolved', 'resolved'].includes(i.status)).length
  const criticalIssues = issues.filter(
    (i) =>
      !['Closed', 'closed', 'Verified', 'verified', 'Resolved', 'resolved'].includes(i.status) &&
      ['Critical', 'critical'].includes(i.severity || ''),
  ).length

  const openRfis = rfis.filter((r) => !['Closed', 'closed', 'Answered', 'answered', 'Resolved', 'resolved'].includes(r.status)).length
  const pendingDocuments = documents.filter((d) => d.review_status !== 'Approved').length
  const criticalNotifications = notifications.filter((n) => n.priority === 'critical' && n.status !== 'resolved').length

  const stats = `PROJECT STATS:
- Total tasks: ${tasks.length} | Completed: ${completed} | Blocked: ${blocked} | Overdue: ${overdue}
- Open issues: ${openIssues} (${criticalIssues} critical)
- Open RFIs: ${openRfis}
- Documents: ${documents.length} total | Pending review: ${pendingDocuments}
- Notifications: ${notifications.length} total | Active critical: ${criticalNotifications}
- Contacts: ${contacts.length}`

  const roleNote =
    userRole === 'worker'
      ? '\nROLE RESTRICTION: This user is a WORKER. Prefer task, safety, daily-log, and own-work answers. Do not reveal sensitive financial details unless they are operationally necessary.'
      : userRole === 'owner'
      ? '\nROLE: Owner — can see full project details including costs, risks, documents, procurement, and team data.'
      : '\nROLE: Engineer — full operational visibility across tasks, issues, RFIs, logs, documents, timeline, and procurement.'

  const context = `You are Sanrachna AI, a construction project management assistant.
Use only this project context and static RAG documents. Never invent missing values.
${roleNote}

PROJECT: ${project.name} | Location: ${project.location || '?'} | Status: ${project.status || '?'} | Start: ${project.startDate || '?'} | Deadline: ${project.deadline || '?'}

${stats}

LIVE TASK DATA:
${taskLines.length ? taskLines.join('\n') : 'No tasks found.'}

LIVE ISSUE DATA:
${issueLines.length ? issueLines.join('\n') : 'No issues found.'}

LIVE RFI DATA:
${rfiLines.length ? rfiLines.join('\n') : 'No RFIs found.'}

RECENT DAILY LOGS:
${logLines.length ? logLines.join('\n') : 'No logs found.'}

DOCUMENT DATA:
${documentLines.length ? documentLines.join('\n') : 'No documents found.'}

NOTIFICATION DATA:
${notificationLines.length ? notificationLines.join('\n') : 'No notifications found.'}

TEAM AND CONTACT DATA:
${contactLines.length ? contactLines.join('\n') : 'No contacts found.'}

COST AND RESOURCE DATA:
${buildCostContext(project)}

BOQ/BOM MATERIAL DATA:
${buildBomContext(project)}

PROCUREMENT DATA:
${buildProcurementContext(project)}

PLANNING TIMELINE DATA:
${buildTimelinePlanningContext(project)}

PLANNING RISK DATA:
${buildPlanningRiskContext(project)}
`

  return context
}

function detectModules(prompt, answer) {
  const text = `${prompt || ''} ${answer || ''}`.toLowerCase()
  const modules = []

  if (text.includes('task') || text.includes('schedule') || text.includes('phase') || text.includes('delayed') || text.includes('timeline') || text.includes('overdue')) modules.push('Timeline')
  if (text.includes('issue') || text.includes('blocked') || text.includes('snag') || text.includes('critical')) modules.push('Issues')
  if (text.includes('rfi')) modules.push('RFI')
  if (text.includes('log') || text.includes('workers present') || text.includes('daily')) modules.push('Daily Logs')
  if (text.includes('cost') || text.includes('budget') || text.includes('bom') || text.includes('boq') || text.includes('material') || text.includes('resource')) modules.push('Cost & Resources')
  if (text.includes('procurement') || text.includes('vendor') || text.includes('quote') || text.includes('supplier')) modules.push('Procurement')
  if (text.includes('document') || text.includes('drawing') || text.includes('permit') || text.includes('inspection') || text.includes('review')) modules.push('Documents')
  if (text.includes('notification') || text.includes('alert')) modules.push('Notifications')
  if (text.includes('contact') || text.includes('supplier') || text.includes('authority') || text.includes('team')) modules.push('Team')

  if (modules.length === 0) modules.push('Project')

  return [...new Set(modules)]
}

function buildFollowUps(answer, userRole) {
  const suggestions = []
  const a = String(answer || '').toLowerCase()

  if (a.includes('task') || a.includes('timeline') || a.includes('phase')) suggestions.push('Which tasks are due this week?')
  if (a.includes('blocked') || a.includes('delay') || a.includes('overdue')) suggestions.push('What is causing these delays?')
  if (a.includes('issue') || a.includes('critical')) suggestions.push('Show only critical issues')
  if (a.includes('rfi')) suggestions.push('Which RFIs are most urgent?')
  if (a.includes('document') || a.includes('review')) suggestions.push('Which documents need review?')
  if (a.includes('procurement') || a.includes('supplier') || a.includes('material')) suggestions.push('What procurement risks exist?')
  if (a.includes('cost') || a.includes('budget') || a.includes('boq') || a.includes('bom')) suggestions.push('Summarize project cost and material risks')

  if (userRole !== 'worker' && suggestions.length < 4) {
    suggestions.push('Summarize overall project health')
  }

  if (suggestions.length < 2) {
    suggestions.push('Which phase needs immediate attention?')
    suggestions.push('What should be prioritized next?')
  }

  return [...new Set(suggestions)].slice(0, 5)
}

module.exports = {
  buildProjectContext,
  detectModules,
  buildFollowUps,
}