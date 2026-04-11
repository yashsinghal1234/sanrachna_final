const express = require('express')
const mongoose = require('mongoose')

const { requireAuth } = require('../middleware/auth')
const { userCanAccessProject } = require('../middleware/projectAccess')
const Project = require('../models/Project')
const { asyncHandler } = require('../utils/asyncHandler')

const {
  listProjects,
  createProject,
  getProject,
  deleteProject,
  patchPlanningStudio,
  patchPlanningInsights,
  patchPlanningTimeline,
} = require('../controllers/project.controller')
const { getDashboard } = require('../controllers/dashboard.controller')
const { listLogs, createLog, updateLogStatus } = require('../controllers/logs.controller')
const { uploadLogPhotoMiddleware } = require('../middleware/uploadLogPhoto')
const { listRfis, createRfi, updateRfiStatus } = require('../controllers/rfis.controller')
const { listIssues, createIssue, updateIssue } = require('../controllers/issues.controller')
const { listContacts, createContact } = require('../controllers/contacts.controller')
const { listDocuments, createDocument } = require('../controllers/documents.controller')
const { listEmergency, createEmergency, updateEmergency } = require('../controllers/emergency.controller')
const {
  listNotifications,
  createNotification,
  updateNotification,
} = require('../controllers/notifications.controller')
const {
  listThreads,
  createThread,
  getThread,
  addMessage,
} = require('../controllers/copilot.controller')
const {
  getProjectSettings,
  updateProjectSettings,
} = require('../controllers/settings/projectSettings.controller')
const { listTeam, addTeamMember, removeTeamMember, updateTeamMemberRole } = require('../controllers/settings/team.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/', asyncHandler(listProjects))
router.post('/', asyncHandler(createProject))

router.param('projectId', async (req, res, next, projectId) => {
  try {
    const cleanProjectId = String(projectId || '').trim()
    let project = null
    if (mongoose.Types.ObjectId.isValid(cleanProjectId)) {
      project = await Project.findById(cleanProjectId)
    }
    if (!project && cleanProjectId) {
      // Fallback for legacy/frontend mismatch where project name may be sent instead of id.
      project = await Project.findOne({ name: cleanProjectId })
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
})

router.get('/:projectId', asyncHandler(getProject))
router.delete('/:projectId', asyncHandler(deleteProject))
router.get('/:projectId/dashboard', asyncHandler(getDashboard))

router.get('/:projectId/logs', asyncHandler(listLogs))
router.post('/:projectId/logs', uploadLogPhotoMiddleware, asyncHandler(createLog))
router.patch('/:projectId/logs/:logId', asyncHandler(updateLogStatus))

router.get('/:projectId/rfis', asyncHandler(listRfis))
router.post('/:projectId/rfis', asyncHandler(createRfi))
router.patch('/:projectId/rfis/:rfiId', asyncHandler(updateRfiStatus))

router.get('/:projectId/issues', asyncHandler(listIssues))
router.post('/:projectId/issues', asyncHandler(createIssue))
router.patch('/:projectId/issues/:issueId', asyncHandler(updateIssue))

router.get('/:projectId/contacts', asyncHandler(listContacts))
router.post('/:projectId/contacts', asyncHandler(createContact))

router.get('/:projectId/documents', asyncHandler(listDocuments))
router.post('/:projectId/documents', asyncHandler(createDocument))

router.get('/:projectId/emergency', asyncHandler(listEmergency))
router.post('/:projectId/emergency', asyncHandler(createEmergency))
router.patch('/:projectId/emergency/:incidentId', asyncHandler(updateEmergency))

router.get('/:projectId/notifications', asyncHandler(listNotifications))
router.post('/:projectId/notifications', asyncHandler(createNotification))
router.patch('/:projectId/notifications/:notificationId', asyncHandler(updateNotification))

router.get('/:projectId/copilot/threads', asyncHandler(listThreads))
router.post('/:projectId/copilot/threads', asyncHandler(createThread))
router.get('/:projectId/copilot/threads/:threadId', asyncHandler(getThread))
router.post('/:projectId/copilot/threads/:threadId/messages', asyncHandler(addMessage))

router.get('/:projectId/settings/project', asyncHandler(getProjectSettings))
router.patch('/:projectId/settings/project', asyncHandler(updateProjectSettings))
router.get('/:projectId/settings/team', asyncHandler(listTeam))
router.post('/:projectId/settings/team', asyncHandler(addTeamMember))
router.delete('/:projectId/settings/team/:memberId', asyncHandler(removeTeamMember))
router.patch('/:projectId/settings/team/:memberId', asyncHandler(updateTeamMemberRole))

router.patch('/:projectId/planning-studio', asyncHandler(patchPlanningStudio))
router.patch('/:projectId/planning-insights', asyncHandler(patchPlanningInsights))
router.patch('/:projectId/planning-timeline', asyncHandler(patchPlanningTimeline))

module.exports = router
