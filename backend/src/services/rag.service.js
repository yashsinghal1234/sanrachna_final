const fs = require('fs')
const path = require('path')
const { askGroq } = require('./groq.service')
const { semanticRankChunks } = require('./semanticRag.service')

const RAG_DOCS_DIR = path.join(__dirname, '..', 'data', 'rag_docs')

const DOC_BOOSTS = {
  health: ['live_project_data'],
  summary: ['live_project_data'],
  summarize: ['live_project_data'],
  overall: ['live_project_data'],
  status: ['live_project_data'],
  progress: ['live_project_data'],
  document: ['live_project_data'],
  documents: ['live_project_data'],
  review: ['live_project_data'],
  approved: ['live_project_data'],
  drawing: ['live_project_data'],
  permit: ['live_project_data'],
  inspection: ['live_project_data'],
  risks: ['live_project_data', 'delay_risk_guide.md'],
  risk: ['live_project_data', 'delay_risk_guide.md'],
  supply: ['live_project_data', 'delay_risk_guide.md'],
  delivery: ['live_project_data', 'delay_risk_guide.md'],
  procurement: ['live_project_data', 'delay_risk_guide.md'],
  vendor: ['live_project_data'],
  supplier: ['live_project_data'],
  quote: ['live_project_data'],
  quotes: ['live_project_data'],

  contact: ['live_project_data'],
  contacts: ['live_project_data'],
  team: ['live_project_data'],
  phone: ['live_project_data'],
  email: ['live_project_data'],

  cost: ['live_project_data', 'boq_bom_guide.md', 'material_estimation.md'],
  budget: ['live_project_data', 'boq_bom_guide.md'],
  resource: ['live_project_data'],
  resources: ['live_project_data'],
  phase: ['live_project_data'],
  attention: ['live_project_data'],
  immediate: ['live_project_data'],
  critical: ['live_project_data'],
  urgent: ['live_project_data'],
  priority: ['live_project_data'],

  safety: ['construction_safety.md'],
  helmet: ['construction_safety.md'],
  ppe: ['construction_safety.md'],
  worker: ['construction_safety.md', 'daily_log_examples.md'],

  delay: ['delay_risk_guide.md', 'live_project_data'],
  delayed: ['delay_risk_guide.md', 'live_project_data'],
  blocked: ['delay_risk_guide.md', 'live_project_data'],

  boq: ['boq_bom_guide.md'],
  bom: ['boq_bom_guide.md'],
  material: ['material_estimation.md', 'boq_bom_guide.md'],
  estimate: ['material_estimation.md'],
  estimation: ['material_estimation.md'],

  rfi: ['rfi_examples.md', 'live_project_data'],
  rfis: ['rfi_examples.md', 'live_project_data'],
  log: ['daily_log_examples.md', 'live_project_data'],
  logs: ['daily_log_examples.md', 'live_project_data'],
  daily: ['daily_log_examples.md', 'live_project_data'],
  task: ['live_project_data'],
  tasks: ['live_project_data'],
  issue: ['live_project_data'],
  issues: ['live_project_data'],
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function expandQuestion(question) {
  const q = normalizeText(question)
  const additions = []

  if (
    q.includes('project health') ||
    q.includes('summarize') ||
    q.includes('summary') ||
    q.includes('overall') ||
    q.includes('status')
  ) {
    additions.push('project stats tasks issues rfis daily logs progress blocked delayed critical open')
  }

  if (
    q.includes('prioritized next') ||
    q.includes('prioritize next') ||
    q.includes('priority') ||
    q.includes('what should be prioritized') ||
    q.includes('what should be done next')
  ) {
    additions.push('project stats critical issues open rfis pending documents delayed tasks blocked tasks procurement risks daily logs immediate attention next priority')
  }

  if (
    q.includes('phase') ||
    q.includes('attention') ||
    q.includes('immediate') ||
    q.includes('urgent') ||
    q.includes('critical')
  ) {
    additions.push('tasks phase blocked delayed issues critical rfis open progress daily logs')
  }

    if (q.includes('document') || q.includes('documents') || q.includes('review')) {
    additions.push('document data review status approved under review requires attention linked rfis linked issues uploaded phase')
  }

 if (
    q.includes('procurement') ||
    q.includes('vendor') ||
    q.includes('supplier') ||
    q.includes('quote') ||
    q.includes('material delivery') ||
    q.includes('supply')
  ) {
    additions.push('procurement data procurement risk procurement action supplier vendor quote material delivery lead time pending rfis open issues pending documents ordering supply delay')
  }

  if (q.includes('cost') || q.includes('budget') || q.includes('resource') || q.includes('material')) {
    additions.push('cost resource data cost summary boq bom material quantity rate total contingency budget')
  }

  if (q.includes('contact') || q.includes('contacts') || q.includes('team')) {
    additions.push('team and contact data contact name role type phase email phone supplier authority')
  }

  if (q.includes('delayed') || q.includes('delay')) {
    additions.push('tasks delayed blocked daily logs material delivery concrete pump schedule risk')
  }

  if (q.includes('open') && (q.includes('rfi') || q.includes('rfis'))) {
    additions.push('rfi rfis open in progress pending status')
  }

  if (q.includes('unresolved') || q.includes('issue') || q.includes('issues')) {
    additions.push('issues open in progress critical unresolved status')
  }

  return `${question} ${additions.join(' ')}`
}

function tokenize(text) {
  const stopWords = new Set([
    'the', 'is', 'are', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'for',
    'with', 'what', 'which', 'how', 'show', 'tell', 'me', 'about', 'this',
    'that', 'project', 'please', 'can', 'you', 'common', 'explain',
  ])

  return normalizeText(text)
    .split(' ')
    .filter((word) => word.length > 2 && !stopWords.has(word))
}

function loadStaticDocs() {
  if (!fs.existsSync(RAG_DOCS_DIR)) return []

  return fs
    .readdirSync(RAG_DOCS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      source: file,
      content: fs.readFileSync(path.join(RAG_DOCS_DIR, file), 'utf8'),
    }))
}

function chunkText(content, source) {
  const paragraphs = String(content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return paragraphs.map((paragraph, index) => ({
    id: `${source}#chunk-${index + 1}`,
    source,
    text: paragraph,
  }))
}

function getStaticChunks() {
  return loadStaticDocs().flatMap((doc) => chunkText(doc.content, doc.source))
}

function extractLiveSection(projectContext, heading) {
  const text = String(projectContext || '')
  const pattern = new RegExp(`${heading}:\\n([\\s\\S]*?)(?=\\n\\n[A-Z ]+:|$)`)
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

function getLiveChunks(projectContext) {
  const liveSections = [
  { label: 'Project Stats', heading: 'PROJECT STATS' },
  { label: 'Timeline', heading: 'LIVE TASK DATA' },
  { label: 'Issues', heading: 'LIVE ISSUE DATA' },
  { label: 'RFI', heading: 'LIVE RFI DATA' },
  { label: 'Daily Logs', heading: 'RECENT DAILY LOGS' },
  { label: 'Documents', heading: 'DOCUMENT DATA' },
  { label: 'Notifications', heading: 'NOTIFICATION DATA' },
  { label: 'Team', heading: 'TEAM AND CONTACT DATA' },
  { label: 'Cost & Resources', heading: 'COST AND RESOURCE DATA' },
  { label: 'BOQ/BOM', heading: 'BOQ/BOM MATERIAL DATA' },
  { label: 'Procurement', heading: 'PROCUREMENT DATA' },
  { label: 'Planning Timeline', heading: 'PLANNING TIMELINE DATA' },
  { label: 'Planning Risk', heading: 'PLANNING RISK DATA' },
]

  return liveSections
    .map((section, index) => {
      const body = extractLiveSection(projectContext, section.heading)
      if (!body) return null

      return {
        id: `live_project_data#chunk-${index + 1}`,
        source: 'live_project_data',
        title: section.label,
        text: `${section.label}:\n${body}`,
      }
    })
    .filter(Boolean)
}

function getIntentSources(queryTokens) {
  const sources = new Set()

  for (const token of queryTokens) {
    const mapped = DOC_BOOSTS[token]
    if (mapped) mapped.forEach((source) => sources.add(source))
  }

  return sources
}

function scoreChunk(queryTokens, chunk) {
  const chunkTextValue = normalizeText(`${chunk.title || ''} ${chunk.source} ${chunk.text}`)
  const chunkTokens = tokenize(chunkTextValue)
  const intentSources = getIntentSources(queryTokens)

  let score = 0

  for (const token of queryTokens) {
    if (chunkTokens.includes(token)) score += 5
    if (chunkTextValue.includes(token)) score += 2
  }

  if (intentSources.has(chunk.source)) score += 12

  if (chunk.source === 'live_project_data' && intentSources.has('live_project_data')) {
    score += 10
  }

  return score
}

async function retrieveRelevantChunks(question, projectContext, limit = 6) {
  const q = normalizeText(question)
  const expandedQuestion = expandQuestion(question)

  const chunks = [
    ...getLiveChunks(projectContext),
    ...getStaticChunks(),
  ]

  const forcedChunks = []

  if (
    q.includes('procurement') ||
    q.includes('vendor') ||
    q.includes('supplier') ||
    q.includes('quote') ||
    q.includes('supply')
  ) {
    forcedChunks.push(
      ...chunks.filter((chunk) =>
        [
          'Procurement',
          'Planning Risk',
          'RFI',
          'Issues',
          'Documents',
          'Cost & Resources',
          'BOQ/BOM',
          'Daily Logs',
        ].includes(chunk.title)
      ),
    )
  }

  if (q.includes('cost') || q.includes('budget') || q.includes('material')) {
    forcedChunks.push(
      ...chunks.filter((chunk) =>
        ['Cost & Resources', 'BOQ/BOM', 'Issues', 'Daily Logs', 'Procurement'].includes(chunk.title)
      ),
    )
  }

  if (q.includes('contact') || q.includes('contacts') || q.includes('team')) {
    forcedChunks.push(...chunks.filter((chunk) => chunk.title === 'Team'))
  }

  if (q.includes('document') || q.includes('documents') || q.includes('review')) {
    forcedChunks.push(...chunks.filter((chunk) => chunk.title === 'Documents'))
  }

  const forcedIds = new Set(forcedChunks.map((chunk) => chunk.id))
  const remainingChunks = chunks.filter((chunk) => !forcedIds.has(chunk.id))

  let semanticChunks = []

  try {
    semanticChunks = await semanticRankChunks(expandedQuestion, remainingChunks, limit)
  } catch (err) {
    console.error('[SEMANTIC RAG] Falling back to keyword ranking:', err?.message || err)

    const queryTokens = tokenize(expandedQuestion)
    semanticChunks = remainingChunks
      .map((chunk) => ({
        ...chunk,
        score: scoreChunk(queryTokens, chunk),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  return [...forcedChunks, ...semanticChunks].slice(0, limit)
}

function cleanChunkForAnswer(text) {
  return String(text || '')
    .replace(/^#\s*/gm, '')
    .replace(/\n+/g, '\n')
    .trim()
}

async function buildExtractiveAnswer(
  question,
  projectContext,
  history = []
) {
  const retrievalQuery =
  buildConversationQuery(question, history)

const chunks =
  await retrieveRelevantChunks(
    retrievalQuery,
    projectContext,
    6
  )
  const q = normalizeText(question)

  if (!chunks.length) {
    return {
      answer:
        'I could not find matching information in the project data or construction knowledge files. Try asking about tasks, issues, RFIs, daily logs, safety, material estimation, BOQ/BOM, or delay risks.',
      citations: ['No matching RAG chunk found'],
      contexts: [],
    }
  }

  const isProcurementQuery =
    q.includes('procurement') ||
    q.includes('vendor') ||
    q.includes('supplier') ||
    q.includes('quote') ||
    q.includes('supply')

  const contextText = chunks
    .slice(0, 6)
    .map((chunk, index) => {
      return `SOURCE ${index + 1}: ${chunk.title || chunk.source}\n${cleanChunkForAnswer(chunk.text)}`
    })
    .join('\n\n---\n\n')

  let finalAnswer

  try {
    finalAnswer = await askGroq(question, contextText)
    console.log('[GROQ] Answer generated successfully')
  } catch (err) {
    console.error('[GROQ] Failed:', err?.message || err)
    finalAnswer = ''
  }

  if (
    isProcurementQuery &&
    (!finalAnswer ||
      finalAnswer.toLowerCase().includes('could not find') ||
      finalAnswer.toLowerCase().includes('not found') ||
      finalAnswer.toLowerCase().includes('not provided'))
  ) {
    finalAnswer = `Based on the available project context, the main procurement risks are:

• Late material delivery can affect schedule continuity.
• Open RFIs may delay material ordering or execution decisions.
• Open issues can block procurement decisions or require rework.
• Pending document reviews can delay approvals before ordering materials.
• Material-related delays in daily logs should be monitored before procurement commitments.

Recommended actions:
• Close urgent RFIs first.
• Review pending structural and soil documents.
• Check material delivery dependencies before placing new orders.
• Escalate critical site issues that can affect procurement timing.`
  }

  if (!finalAnswer) {
    finalAnswer =
      'Based on the retrieved project data and construction knowledge:\n\n' +
      chunks
        .slice(0, 4)
        .map((chunk) => `• ${cleanChunkForAnswer(chunk.text)}`)
        .join('\n\n')
  }

  const citations = chunks.map((chunk, index) => {
  const label = chunk.title || chunk.source
  return `Source ${index + 1}: ${label} (${chunk.source})`
  })

  return {
    answer: finalAnswer,
    citations,
    contexts: chunks.map((chunk) => chunk.id),
  }
}

function buildConversationQuery(question, history = []) {
  const recentHistory = history
    .slice(-4)
    .map((m) => m.content)
    .join('\n')

  return `
Previous conversation:

${recentHistory}

Current question:

${question}
`
}

module.exports = {
  loadStaticDocs,
  getStaticChunks,
  retrieveRelevantChunks,
  buildConversationQuery,
  buildExtractiveAnswer,
}