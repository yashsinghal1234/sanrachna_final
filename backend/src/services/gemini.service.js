const { GoogleGenerativeAI } = require('@google/generative-ai')
const Task = require('../models/Task')
const Issue = require('../models/Issue')
const Rfi = require('../models/Rfi')
const DailyLog = require('../models/DailyLog')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Build a rich plain-text context summary from the project's live database records.
 * This is injected as the system prompt so Gemini knows the real project state.
 */
async function buildProjectContext(project, userRole) {
  const pid = project._id

  // Fetch relevant data in parallel (capped to keep context manageable)
  const [tasks, issues, rfis, logs] = await Promise.all([
    Task.find({ project: pid }).sort({ dueAt: 1 }).limit(60).lean(),
    Issue.find({ project: pid }).sort({ createdAt: -1 }).limit(40).lean(),
    Rfi.find({ project: pid }).sort({ createdAt: -1 }).limit(30).lean(),
    DailyLog.find({ project: pid }).sort({ createdAt: -1 }).limit(10).lean(),
  ])

  // Summarize tasks
  const taskLines = tasks.slice(0, 40).map(
    (t) => `[TASK] ${t.title} | Phase: ${t.phase} | Status: ${t.status} | Progress: ${t.progressPct}% | Assigned: ${t.assignedTo || 'Unassigned'} | Due: ${t.dueAt?.slice(0, 10) || '?'} | Priority: ${t.priority}${t.blockedReason ? ` | Blocked: ${t.blockedReason}` : ''}`,
  )

  // Summarize issues
  const issueLines = issues.slice(0, 25).map(
    (i) => `[ISSUE] ${i.title || i.issue_id || 'Issue'} | Status: ${i.status} | Severity: ${i.severity || '?'} | Location: ${i.location || '?'} | Reported by: ${i.reportedBy || '?'}`,
  )

  // Summarize RFIs
  const rfiLines = rfis.slice(0, 20).map(
    (r) => `[RFI] ${r.title || r.rfi_id || 'RFI'} | Status: ${r.status} | Priority: ${r.priority || '?'} | Raised by: ${r.raisedBy || '?'}`,
  )

  // Summarize daily logs
  const logLines = logs.slice(0, 8).map(
    (l) => `[LOG] Date: ${l.date || l.createdAt?.toISOString?.()?.slice(0, 10) || '?'} | Workers present: ${l.workers_present ?? '?'} | Tasks: ${l.tasks_completed || '—'} | Notes: ${l.issues || '—'}`,
  )

  // Compute quick stats
  const delayed = tasks.filter((t) => t.status === 'In progress' && new Date(t.dueAt) < new Date()).length
  const blocked = tasks.filter((t) => t.status === 'Blocked').length
  const completed = tasks.filter((t) => t.status === 'Completed').length
  const openIssues = issues.filter((i) => !['Closed', 'Verified', 'verified'].includes(i.status)).length
  const criticalIssues = issues.filter(
    (i) => !['Closed', 'Verified', 'verified'].includes(i.status) &&
    ['Critical', 'critical'].includes(i.severity || '')
  ).length
  const openRfis = rfis.filter((r) => !['Closed', 'Answered', 'answered'].includes(r.status)).length

  const stats = `PROJECT STATS:
- Total tasks: ${tasks.length} | Completed: ${completed} | Blocked: ${blocked} | Overdue in-progress: ${delayed}
- Open issues: ${openIssues} (${criticalIssues} critical)
- Open RFIs: ${openRfis}`

  const roleNote =
    userRole === 'worker'
      ? '\nROLE RESTRICTION: This user is a WORKER. Only share information about their own assigned tasks, their own submitted issues/logs. Do NOT reveal project-wide financials, costs, or other workers\' data.'
      : userRole === 'owner'
      ? '\nROLE: Owner — can see full project details including costs, risks, and all team data.'
      : '\nROLE: Engineer — full operational visibility (tasks, issues, RFIs, logs, timeline).'

  const context = `You are Sanrachna AI, an intelligent construction project management assistant.
You are grounded to this specific project and its real data. Always be concise, factual, and cite what data you used.
Use **bold** for important numbers or names. Format lists as bullet points. Never make up data.
${roleNote}

PROJECT: ${project.name} (Location: ${project.location || '?'})

${stats}

LIVE TASK DATA:
${taskLines.length ? taskLines.join('\n') : 'No tasks found.'}

LIVE ISSUE DATA:
${issueLines.length ? issueLines.join('\n') : 'No issues found.'}

LIVE RFI DATA:
${rfiLines.length ? rfiLines.join('\n') : 'No RFIs found.'}

RECENT DAILY LOGS:
${logLines.length ? logLines.join('\n') : 'No logs found.'}
`

  return context
}

/**
 * Determine which modules were referenced in the answer for source chips on the frontend.
 */
function detectModules(prompt, answer) {
  const text = (prompt + ' ' + answer).toLowerCase()
  const modules = []
  if (text.includes('task') || text.includes('schedule') || text.includes('phase') || text.includes('delayed') || text.includes('timeline')) modules.push('Timeline')
  if (text.includes('issue') || text.includes('blocked') || text.includes('snag')) modules.push('Issues')
  if (text.includes('rfi')) modules.push('RFI')
  if (text.includes('log') || text.includes('workers present') || text.includes('daily')) modules.push('Daily Logs')
  if (text.includes('cost') || text.includes('budget') || text.includes('bom') || text.includes('material')) modules.push('Cost & Resources')
  if (text.includes('procurement') || text.includes('vendor') || text.includes('quote')) modules.push('Procurement')
  if (text.includes('document')) modules.push('Documents')
  if (modules.length === 0) modules.push('Project')
  return modules
}

/**
 * Build follow-up suggestions based on the answer content.
 */
function buildFollowUps(answer, userRole) {
  const suggestions = []
  const a = answer.toLowerCase()
  if (a.includes('task') && !a.includes('what tasks')) suggestions.push('Which tasks are due this week?')
  if (a.includes('blocked')) suggestions.push('What is causing these blocks?')
  if (a.includes('issue') && !a.includes('no issue')) suggestions.push('Show only critical issues')
  if (a.includes('rfi')) suggestions.push('Which RFIs are most urgent?')
  if (a.includes('delay') || a.includes('behind')) suggestions.push('What can be done to recover schedule?')
  if (userRole !== 'worker') {
    if (!a.includes('cost') && suggestions.length < 3) suggestions.push('What is the cost trend for this project?')
  }
  // Always offer at least 2 generic follow-ups
  if (suggestions.length < 2) {
    suggestions.push('Summarize the overall project health')
    suggestions.push('Which phase needs immediate attention?')
  }
  return suggestions.slice(0, 4)
}

/**
 * Call Gemini with multi-turn chat history.
 *
 * Rules enforced here:
 *  1. History must start with a 'user' role (skip leading 'model' messages)
 *  2. Roles must strictly alternate user → model → user → ...
 *     Consecutive same-role messages are merged into one.
 */
async function callGemini(systemContext, chatHistory, userMessage) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',          // widely available; upgrade to 2.0 when needed
    systemInstruction: systemContext,
  })

  // Map to Gemini roles and drop the welcome assistant message (must start with user)
  const rawHistory = chatHistory
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content.trim() }],
    }))

  // Drop leading 'model' turns — Gemini requires history to start with 'user'
  let start = 0
  while (start < rawHistory.length && rawHistory[start].role !== 'user') start++
  const trimmed = rawHistory.slice(start)

  // Merge consecutive same-role messages (safety net)
  const history = []
  for (const turn of trimmed) {
    if (history.length > 0 && history[history.length - 1].role === turn.role) {
      history[history.length - 1].parts.push(...turn.parts)
    } else {
      history.push({ role: turn.role, parts: [...turn.parts] })
    }
  }

  try {
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(userMessage)
    return result.response.text()
  } catch (err) {
    console.error('[Gemini] API call failed:', err?.message || err)
    throw err
  }
}

module.exports = { buildProjectContext, detectModules, buildFollowUps, callGemini }
