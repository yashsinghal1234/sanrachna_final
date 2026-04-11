const express = require('express')

const { requireAuth } = require('../middleware/auth')
const { userCanAccessProject } = require('../middleware/projectAccess')
const Project = require('../models/Project')
const { asyncHandler } = require('../utils/asyncHandler')

const { listProjects, createProject, getProject, updateProject } = require('../controllers/project.controller')
const { getDashboard } = require('../controllers/dashboard.controller')
const { listLogs, createLog } = require('../controllers/logs.controller')
const { listRfis, createRfi, updateRfiStatus } = require('../controllers/rfis.controller')
const { listIssues, createIssue, updateIssue } = require('../controllers/issues.controller')
const { listContacts, createContact } = require('../controllers/contacts.controller')
const { listDocuments, createDocument } = require('../controllers/documents.controller')
const { getTeam, addTeamMember, removeTeamMember, updateTeamMemberRole } = require('../controllers/team.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/', asyncHandler(listProjects))
router.post('/', asyncHandler(createProject))

router.param(
  'projectId',
  asyncHandler(async (req, res, next, projectId) => {
    const project = await Project.findById(projectId)
    if (!project) {
      res.status(404).json({ message: 'Project not found.' })
      return
    }
    if (!userCanAccessProject(req.user._id, project)) {
      res.status(403).json({ message: 'You do not have access to this project.' })
      return
    }
    req.project = project
    next()
  }),
)

router.get('/:projectId/settings/team', asyncHandler(getTeam))
router.post('/:projectId/settings/team', asyncHandler(addTeamMember))
router.delete('/:projectId/settings/team/:memberId', asyncHandler(removeTeamMember))
router.patch('/:projectId/settings/team/:memberId', asyncHandler(updateTeamMemberRole))

router.patch('/:projectId', asyncHandler(updateProject))
router.get('/:projectId', asyncHandler(getProject))
router.get('/:projectId/dashboard', asyncHandler(getDashboard))

router.get('/:projectId/logs', asyncHandler(listLogs))
router.post('/:projectId/logs', asyncHandler(createLog))

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

module.exports = router
