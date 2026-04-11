const CopilotThread = require('../models/CopilotThread')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

function answerFor(prompt, mode) {
  const p = String(prompt || '').toLowerCase()
  if (p.includes('delay') || p.includes('facade')) {
    return {
      content: 'Facade is delayed by 4-6 days due to dependency on services shaft rough-in and late material dispatch.',
      citations: ['Timeline dependency graph', 'Daily log Apr 6', 'Issue vendor dispatch slip'],
      contexts: ['Facade task chain', 'Daily log extracts'],
      actions: [{ label: 'Open Timeline', to: '/app/timeline' }],
      structured: { title: 'Delay Analysis', lines: ['Current Delay: 6 Days', 'Main Cause: Facade dependency', 'Suggested Fix: Add 4 workers'] },
    }
  }
  if (p.includes('cost') || p.includes('budget') || p.includes('flooring')) {
    return {
      content: 'Cost trend is around +4.5% over plan, with structure and finishing showing the largest drift.',
      citations: ['CPWD DSR 2023', 'Cost Breakdown Week 6 snapshot'],
      contexts: ['Cost variance table'],
      actions: [{ label: 'Open Project Insights', to: '/app/insights' }],
      structured: { title: 'Cost Insight', lines: ['Variance: +4.5%', 'Driver: Structure + Finishing'] },
    }
  }
  return {
    content: `I can answer this in ${mode} mode with project-grounded context. Ask for cost, delay, documents, or procurement details.`,
    citations: ['Project context index'],
    contexts: ['Unified project index'],
    actions: [{ label: 'Open Dashboard', to: '/app' }],
    structured: null,
  }
}

async function listThreads(req, res) {
  const rows = await CopilotThread.find({ project: req.project._id, user: req.user._id }).sort({ updatedAt: -1 })
  res.json({ threads: serializeDocs(rows) })
}

async function createThread(req, res) {
  const { title, mode } = req.body
  const row = await CopilotThread.create({
    project: req.project._id,
    user: req.user._id,
    title: String(title || 'New chat').trim(),
    mode: ['project', 'benchmark', 'documents', 'procurement'].includes(mode) ? mode : 'project',
    messages: [{ role: 'assistant', content: 'I am grounded to this project context (documents, timeline, logs, and benchmark rates).', citations: ['Project context index'] }],
  })
  res.status(201).json({ thread: serializeDoc(row) })
}

async function getThread(req, res) {
  const row = await CopilotThread.findOne({ _id: req.params.threadId, project: req.project._id, user: req.user._id })
  if (!row) {
    res.status(404).json({ message: 'Thread not found.' })
    return
  }
  res.json({ thread: serializeDoc(row) })
}

async function addMessage(req, res) {
  const row = await CopilotThread.findOne({ _id: req.params.threadId, project: req.project._id, user: req.user._id })
  if (!row) {
    res.status(404).json({ message: 'Thread not found.' })
    return
  }
  const prompt = String(req.body.content || '').trim()
  if (!prompt) {
    res.status(400).json({ message: 'content is required.' })
    return
  }
  row.messages.push({ role: 'user', content: prompt })
  const answer = answerFor(prompt, row.mode)
  row.messages.push({ role: 'assistant', ...answer })
  await row.save()
  res.status(201).json({ thread: serializeDoc(row), message: row.messages[row.messages.length - 1] })
}

module.exports = { listThreads, createThread, getThread, addMessage }
