const CopilotThread = require('../models/CopilotThread')
const { serializeDoc } = require('../utils/serialize')
const { buildProjectContext, detectModules, buildFollowUps } = require('../services/projectContext.service')
const { buildExtractiveAnswer } = require('../services/rag.service')

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

async function listThreads(req, res) {
  const rows = await CopilotThread.find({
    project: req.project._id,
    user: req.user._id,
  })
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
  console.log('addMessage called with threadId:', req.params.threadId, 'projectId:', req.project._id);
  const row = await CopilotThread.findOne({
    _id: req.params.threadId,
    project: req.project._id,
    user: req.user._id,
  })

  if (!row) {
    res.status(404).json({ message: 'Thread not found.' })
    return
  }

  const originalContent = String(req.body.content || '').trim()
  const language = req.body.language || 'English'

  if (!originalContent) {
    res.status(400).json({ message: 'content is required.' })
    return
  }

  row.messages.push({ role: 'user', content: originalContent })
  
  const prompt = originalContent + (language !== 'English' ? ` (Please reply in ${language})` : '')

  let answerText = ''
  let usedModules = ['Project']
  let followUps = []
  let ragResult = {
    citations: [],
    contexts: [],
  }

  try {
    const systemContext = await buildProjectContext(req.project, req.user.role)
    const history = row.messages
      .slice(0, -1)
      .filter((m) => m.content && m.content.trim().length > 0)
      .slice(-6)
    ragResult = await buildExtractiveAnswer(
      prompt,
      systemContext,
      history,
      req.project._id
    )

    answerText = ragResult.answer

    if (!answerText || typeof answerText !== 'string') {
      answerText = 'I generated a response, but it was empty. Please try again.'
    }

    usedModules = detectModules(prompt, answerText)
    followUps = buildFollowUps(answerText, req.user.role)
  } catch (err) {
    console.error('[Copilot RAG] Error:', err?.message || err)

    answerText = 'I encountered an issue generating the Copilot response. Please try again in a moment.'
    usedModules = ['Project']
    followUps = ['Which tasks are delayed?', 'Show unresolved issues']
  }

  row.messages.push({
    role: 'assistant',
    content: answerText,
    citations: ragResult.citations || [],
    usedModules,
    followUps,
    contexts: ragResult.contexts || [],
    actions: [],
    structured: null,
  })

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

  if (req.body.title) {
    row.title = String(req.body.title).slice(0, 80)
  }

  await row.save()

  res.json({ thread: threadToDto(row) })
}

async function deleteThread(req, res) {
  await CopilotThread.deleteOne({
    _id: req.params.threadId,
    project: req.project._id,
    user: req.user._id,
  })

  res.json({ success: true })
}

const { transcribeAudio: transcribeGroq } = require('../services/groq.service')

async function transcribeAudioController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided.' })
    }

    const fileBuffer = req.file.buffer
    const filename = req.file.originalname || 'audio.webm'

    const transcription = await transcribeGroq(fileBuffer, filename)
    res.json({ text: transcription.text || '' })
  } catch (err) {
    console.error('[Copilot Transcribe] Error:', err?.message || err)
    res.status(500).json({ message: 'Failed to transcribe audio.', error: err?.message })
  }
}

module.exports = {
  listThreads,
  createThread,
  getThread,
  addMessage,
  patchThread,
  deleteThread,
  transcribeAudio: transcribeAudioController,
}