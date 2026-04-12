/**
 * workspaces.routes.js
 * Mounts /api/v1/workspaces as a clean alias for project-scoped endpoints.
 *
 * Endpoint mapping:
 *   GET  /api/v1/workspaces              → list projects
 *   POST /api/v1/workspaces              → create project
 *   GET  /api/v1/workspaces/:id/dashboard
 *   GET  /api/v1/workspaces/:id/cost-resources
 *   GET  /api/v1/workspaces/:id/procurement
 *   GET  /api/v1/workspaces/:id/timeline
 *   GET  /api/v1/workspaces/:id/documents
 *   GET  /api/v1/workspaces/:id/contacts
 *   GET  /api/v1/workspaces/:id/daily-logs
 *   GET  /api/v1/workspaces/:id/insights
 *   GET  /api/v1/notifications
 */

const express = require('express')
const mongoose = require('mongoose')

const { requireAuth } = require('../middleware/auth')
const { userCanAccessProject } = require('../middleware/projectAccess')
const Project = require('../models/Project')
const { asyncHandler } = require('../utils/asyncHandler')

const { listProjects, createProject } = require('../controllers/project.controller')
const { getDashboard } = require('../controllers/dashboard.controller')
const { getCostResources } = require('../controllers/costResources.controller')
const { getProcurement } = require('../controllers/procurement.controller')
const { listDocuments } = require('../controllers/documents.controller')
const { listContacts } = require('../controllers/contacts.controller')
const { listNotifications } = require('../controllers/notifications.controller')

/**
 * Reusable param middleware: resolves workspace/project by id.
 */
async function resolveProject(req, res, next, projectId) {
  try {
    const clean = String(projectId || '').trim()
    let project = null
    if (mongoose.Types.ObjectId.isValid(clean)) {
      project = await Project.findById(clean)
    }
    if (!project && clean) {
      project = await Project.findOne({ name: clean })
    }
    if (!project) {
      res.status(404).json({ message: 'Project not found.' })
      return
    }
    if (!userCanAccessProject(req.user, project)) {
      res.status(403).json({ message: 'You do not have access to this project.' })
      return
    }
    req.project = project
    next()
  } catch (err) {
    next(err)
  }
}

/** GET /api/v1/workspaces/:id/timeline — returns timeline data from masterPlan or stored planning */
async function getTimeline(req, res) {
  const project = req.project
  const planning = project.planning || {}
  const studio = planning.sanrachnaStudio || {}
  const masterPlan = studio.masterPlan || null

  // Return stored timeline if present
  if (planning.timeline && typeof planning.timeline === 'object') {
    return res.json(planning.timeline)
  }

  // Derive from masterPlan
  if (masterPlan && masterPlan.timeline) {
    const tl = masterPlan.timeline
    const phases = Array.isArray(tl.phases) ? tl.phases : []
    let weekCursor = 0

    const tasks = phases.map((phase, i) => {
      const durationWeeks = Math.max(1, Math.round((Number(phase.months) || 1) * 4.33))
      const task = {
        id: `phase_${i}`,
        name: phase.name || `Phase ${i + 1}`,
        phase: derivePhaseKey(phase.name || ''),
        start_week: weekCursor,
        end_week: weekCursor + durationWeeks,
        dependency_ids: i > 0 ? [`phase_${i - 1}`] : [],
        pct_complete: 0,
        milestones: Array.isArray(phase.milestones) ? phase.milestones : [],
      }
      weekCursor += durationWeeks
      return task
    })

    return res.json({
      projectId: String(project._id),
      projectName: project.name,
      totalMonths: tl.totalMonths || phases.reduce((a, p) => a + (Number(p.months) || 0), 0),
      tasks,
    })
  }

  // Empty default
  return res.json({
    projectId: String(project._id),
    projectName: project.name,
    totalMonths: 0,
    tasks: [],
  })
}

/** GET /api/v1/workspaces/:id/daily-logs — proxy to existing DailyLog model */
async function getDailyLogs(req, res) {
  const DailyLog = require('../models/DailyLog')
  const { serializeDocs } = require('../utils/serialize')
  const logs = await DailyLog.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(100).lean()
  return res.json(serializeDocs(logs))
}

/** GET /api/v1/workspaces/:id/insights — returns planning insights */
async function getInsights(req, res) {
  const planning = req.project.planning || {}
  return res.json(planning.insights || {})
}

function derivePhaseKey(name) {
  const n = String(name).toLowerCase()
  if (n.includes('foundation') || n.includes('site')) return 'foundation'
  if (n.includes('structure') || n.includes('structural')) return 'structure'
  if (n.includes('mep') || n.includes('mechanical') || n.includes('electrical')) return 'mep'
  if (n.includes('finish') || n.includes('interior')) return 'finishing'
  return 'structure'
}

const router = express.Router()
router.use(requireAuth)

// ── Collection-level ────────────────────────────────────────────────────────
router.get('/', asyncHandler(listProjects))
router.post('/', asyncHandler(createProject))

// ── Workspace-scoped ────────────────────────────────────────────────────────
router.param('workspaceId', resolveProject)

router.get('/:workspaceId/dashboard', asyncHandler(getDashboard))
router.get('/:workspaceId/cost-resources', asyncHandler(getCostResources))
router.get('/:workspaceId/procurement', asyncHandler(getProcurement))
router.get('/:workspaceId/timeline', asyncHandler(getTimeline))
router.get('/:workspaceId/documents', asyncHandler(listDocuments))
router.get('/:workspaceId/contacts', asyncHandler(listContacts))
router.get('/:workspaceId/daily-logs', asyncHandler(getDailyLogs))
router.get('/:workspaceId/insights', asyncHandler(getInsights))
router.get('/:workspaceId/notifications', asyncHandler(listNotifications))

module.exports = router
