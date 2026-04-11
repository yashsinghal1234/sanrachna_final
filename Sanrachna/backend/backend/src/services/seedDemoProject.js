const defaultPlanning = require('../data/defaultPlanning')
const { logs, rfis, issues, contacts, documents } = require('../data/defaultSeedRows')
const Project = require('../models/Project')
const DailyLog = require('../models/DailyLog')
const Rfi = require('../models/Rfi')
const Issue = require('../models/Issue')
const Contact = require('../models/Contact')
const DocumentMeta = require('../models/DocumentMeta')

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
    planning: { ...defaultPlanning },
  })

  await DailyLog.insertMany(logs.map((row) => ({ ...row, project: project._id })))
  await Rfi.insertMany(rfis.map((row) => ({ ...row, project: project._id })))
  await Issue.insertMany(issues.map((row) => ({ ...row, project: project._id })))
  await Contact.insertMany(contacts.map((row) => ({ ...row, project: project._id })))
  await DocumentMeta.insertMany(documents.map((row) => ({ ...row, project: project._id })))

  return project
}

module.exports = { seedDemoProjectForUser }
