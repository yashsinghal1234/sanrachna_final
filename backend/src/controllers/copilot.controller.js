const CopilotThread = require('../models/CopilotThread')
const { serializeDoc, serializeDocs } = require('../utils/serialize')
const { buildProjectContext, detectModules, buildFollowUps, callGemini } = require('../services/deepseek.service')

// ─── helpers ──────────────────────────────────────────────────────────────────

function threadToDto(row) {
  const obj = serializeDoc(row)
  return {
    id: obj.id,
    projectId: obj.project?.toString() || '',
    userId: obj.user?.toString() || '',
    title: obj.title,
    mode: obj.mode,
    messages: (obj.messages || []).map((m) => ({
      id: m._id?.toString() || m.id || '',
      role: m.role,
      content: m.content,
      citations: m.citations || [],
      contexts: m.contexts || [],
      actions: m.actions || [],
      structured: m.structured || null,
      usedModules: m.usedModules || [],
      followUps: m.followUps || [],
      createdAt: m.createdAt || new Date().toISOString(),
    })),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

// ─── controllers ──────────────────────────────────────────────────────────────

async function listThreads(req, res) {
  const rows = await CopilotThread.find({ project: req.project._id, user: req.user._id })
    .sort({ updatedAt: -1 })
    .limit(50)
  res.json({ threads: rows.map(threadToDto) })
}

async function createThread(req, res) {
  const { title, mode } = req.body
  const projectName = req.project.name

  const welcomeContent = `Project context: **${projectName}**.

As ${req.user.role === 'worker' ? 'a worker' : req.user.role === 'owner' ? 'an owner' : 'an engineer'}, you can ask about operational details across modules.

Ask natural-language questions like "Which tasks are delayed?" or "What issues are unresolved?". I will cite what I used and respect your role permissions.`

  const row = await CopilotThread.create({
    project: req.project._id,
    user: req.user._id,
    title: String(title || 'New chat').trim(),
    mode: ['project', 'benchmark', 'documents', 'procurement'].includes(mode) ? mode : 'project',
    messages: [
      {
        role: 'assistant',
        content: welcomeContent,
        citations: ['Project context index'],
        usedModules: ['Project'],
        followUps: ['Which tasks are delayed?', 'Show open RFIs', 'Show unresolved issues'],
      },
    ],
  })
  res.status(201).json({ thread: threadToDto(row) })
}

async function getThread(req, res) {
  const row = await CopilotThread.findOne({
    _id: req.params.threadId,
    project: req.project._id,
    user: req.user._id,
  })
  if (!row) {
    res.status(404).json({ message: 'Thread not found.' })
    return
  }
  res.json({ thread: threadToDto(row) })
}

async function addMessage(req, res) {
  const row = await CopilotThread.findOne({
    _id: req.params.threadId,
    project: req.project._id,
    user: req.user._id,
  })
  if (!row) {
    res.status(404).json({ message: 'Thread not found.' })
    return
  }

  const prompt = String(req.body.content || '').trim()
  if (!prompt) {
    res.status(400).json({ message: 'content is required.' })
    return
  }

  // Add the user message
  row.messages.push({ role: 'user', content: prompt })

  let answerText = ''
  let usedModules = ['Project']
  let followUps = []

  try {
    // Build live project context from database
    const systemContext = await buildProjectContext(req.project, req.user.role)

    // Pass previous conversation (excluding the welcome message and the message just added)
    const history = row.messages
      .slice(0, -1) // exclude the message we just added
      .filter((m) => m.content.trim().length > 0)
      .slice(-20) // last 20 messages for context window management

    // Call DeepSeek
    answerText = await callGemini(systemContext, history, prompt)
    usedModules = detectModules(prompt, answerText)
    followUps = buildFollowUps(answerText, req.user.role)
  } catch (err) {
    console.error('[DeepSeek] Error:', err?.message || err)
    // Graceful fallback so the chat doesn't crash
    answerText = 'I encountered an issue calling the AI service. Please try again in a moment.'
    if (!process.env.DEEPSEEK_API_KEY) {
      answerText = 'DeepSeek API key is not configured on the server. Please set DEEPSEEK_API_KEY in the backend .env file.'
    }
    usedModules = ['Project']
    followUps = ['Which tasks are delayed?', 'Show unresolved issues']
  }

  // Store the assistant reply
  row.messages.push({
    role: 'assistant',
    content: answerText,
    citations: usedModules.map((m) => `${m} module`),
    usedModules,
    followUps,
    contexts: usedModules,
    actions: [],
    structured: null,
  })

  // Auto-title the thread from the first user message
  if (row.title === 'New chat') {
    row.title = prompt.slice(0, 60)
  }

  await row.save()

  const lastMsg = row.messages[row.messages.length - 1]
  res.status(201).json({
    thread: threadToDto(row),
    message: {
      id: lastMsg._id?.toString() || '',
      role: lastMsg.role,
      content: lastMsg.content,
      usedModules: lastMsg.usedModules || [],
      followUps: lastMsg.followUps || [],
      citations: lastMsg.citations || [],
    },
  })
}

// Patch thread title (rename)
async function patchThread(req, res) {
  const row = await CopilotThread.findOne({
    _id: req.params.threadId,
    project: req.project._id,
    user: req.user._id,
  })
  if (!row) {
    res.status(404).json({ message: 'Thread not found.' })
    return
  }
  if (req.body.title) row.title = String(req.body.title).slice(0, 80)
  await row.save()
  res.json({ thread: threadToDto(row) })
}

// Delete a thread
async function deleteThread(req, res) {
  await CopilotThread.deleteOne({
    _id: req.params.threadId,
    project: req.project._id,
    user: req.user._id,
  })
  res.json({ success: true })
}

module.exports = { listThreads, createThread, getThread, addMessage, patchThread, deleteThread }
