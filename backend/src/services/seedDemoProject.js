const defaultPlanning = require('../data/defaultPlanning')
const { logs, rfis, issues, contacts, documents } = require('../data/defaultSeedRows')
const Project = require('../models/Project')
const DailyLog = require('../models/DailyLog')
const Rfi = require('../models/Rfi')
const Issue = require('../models/Issue')
const Contact = require('../models/Contact')
const DocumentMeta = require('../models/DocumentMeta')
const Notification = require('../models/Notification')
const EmergencyIncident = require('../models/EmergencyIncident')

async function seedDemoProjectForUser(userId) {
  const count = await Project.countDocuments({
    $or: [{ owner: userId }, { members: userId }],
  })
  if (count > 0) return null

  const summary = defaultPlanning.project_summary
  const project = await Project.create({
    name: summary.name,
    location: summary.location,
    owner: userId,
    members: [userId],
    startDate: '2026-04-01',
    deadline: '2026-10-30',
    status: 'Active',
    scheduleNotes: 'Facade dependency is behind baseline — focus on services shaft readiness.',
    planning: { ...defaultPlanning },
  })

  await DailyLog.insertMany(logs.map((row) => ({ ...row, project: project._id })))
  await Rfi.insertMany(rfis.map((row) => ({ ...row, project: project._id })))
  await Issue.insertMany(issues.map((row) => ({ ...row, project: project._id })))
  await Contact.insertMany(contacts.map((row) => ({ ...row, project: project._id })))
  await DocumentMeta.insertMany(documents.map((row) => ({ ...row, project: project._id })))
  await Notification.insertMany([
    {
      project: project._id,
      user: null,
      role: 'owner',
      priority: 'critical',
      type: 'budget_overrun',
      title: 'Budget overrun alert',
      body: 'Tower A foundation cost exceeds plan by 12%. Forecast indicates continued drift.',
      createdAtLabel: '2h ago',
      actions: [{ label: 'Open Project Insights', to: '/app/insights' }],
    },
    {
      project: project._id,
      user: null,
      role: 'engineer',
      priority: 'warning',
      type: 'rfi',
      title: 'RFI assigned',
      body: 'Structural conflict in east stair shaft requires response.',
      createdAtLabel: '1h ago',
      actions: [{ label: 'Open RFI', to: '/app/rfi' }],
    },
    {
      project: project._id,
      user: null,
      role: 'worker',
      priority: 'critical',
      type: 'emergency',
      title: 'Emergency broadcast',
      body: 'Safety notice: scaffold inspection required before shift starts.',
      createdAtLabel: '30m ago',
      actions: [{ label: 'View Emergency', to: '/app/emergency' }],
    },
  ])
  await EmergencyIncident.insertMany([
    {
      project: project._id,
      type: 'safety_hazard',
      severity: 'high',
      status: 'acknowledged',
      zone: 'North elevation — Floor 8',
      description: 'Scaffold toe-board gap flagged and acknowledged by safety officer.',
      reported_by: 'Rahul Kulkarni',
      created_at_label: '1d ago',
      audit: [{ kind: 'raised', by: 'Rahul Kulkarni', at: new Date().toISOString() }],
    },
  ])

  return project
}

module.exports = { seedDemoProjectForUser }
