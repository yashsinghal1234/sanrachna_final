const fs = require('fs')
const path = require('path')

const RAG_DOCS_DIR = path.join(__dirname, '..', 'data', 'rag_docs')

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text) {
  const stopWords = new Set([
    'the', 'is', 'are', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'for',
    'with', 'what', 'which', 'how', 'show', 'tell', 'me', 'about', 'this',
    'that', 'project', 'please', 'can', 'you',
  ])

  return normalizeText(text)
    .split(' ')
    .filter((word) => word.length > 2 && !stopWords.has(word))
}

function loadStaticDocs() {
  if (!fs.existsSync(RAG_DOCS_DIR)) {
    return []
  }

  const files = fs
    .readdirSync(RAG_DOCS_DIR)
    .filter((file) => file.endsWith('.md'))

  return files.map((file) => {
    const fullPath = path.join(RAG_DOCS_DIR, file)
    return {
      source: file,
      content: fs.readFileSync(fullPath, 'utf8'),
    }
  })
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
  const docs = loadStaticDocs()
  return docs.flatMap((doc) => chunkText(doc.content, doc.source))
}

function getLiveChunks(projectContext) {
  const sections = String(projectContext || '')
    .split(/\n(?=PROJECT STATS:|LIVE TASK DATA:|LIVE ISSUE DATA:|LIVE RFI DATA:|RECENT DAILY LOGS:)/g)
    .map((s) => s.trim())
    .filter(Boolean)

  return sections.map((section, index) => ({
    id: `live_project_data#chunk-${index + 1}`,
    source: 'Live MongoDB project data',
    text: section,
  }))
}

function scoreChunk(queryTokens, chunkTextValue) {
  const chunkTokens = tokenize(chunkTextValue)
  if (!chunkTokens.length) return 0

  let score = 0
  for (const token of queryTokens) {
    if (chunkTokens.includes(token)) score += 3
    if (normalizeText(chunkTextValue).includes(token)) score += 1
  }

  return score
}

function retrieveRelevantChunks(question, projectContext, limit = 6) {
  const queryTokens = tokenize(question)

  const chunks = [
    ...getLiveChunks(projectContext),
    ...getStaticChunks(),
  ]

  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTokens, chunk.text),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return ranked
}

function buildExtractiveAnswer(question, projectContext) {
  const chunks = retrieveRelevantChunks(question, projectContext, 6)

  if (!chunks.length) {
    return {
      answer:
        'I could not find strong matching information in the project data or construction knowledge files. Try asking about tasks, issues, RFIs, daily logs, safety, material estimation, BOQ/BOM, or delay risks.',
      citations: ['No matching RAG chunk found'],
      contexts: [],
    }
  }

  const answerLines = [
    'Based on the available project data and construction knowledge files:',
    '',
    ...chunks.slice(0, 4).map((chunk) => `- ${chunk.text.replace(/\n/g, ' ')}`),
  ]

  return {
    answer: answerLines.join('\n'),
    citations: chunks.map((chunk) => chunk.source),
    contexts: chunks.map((chunk) => chunk.id),
  }
}

module.exports = {
  loadStaticDocs,
  getStaticChunks,
  retrieveRelevantChunks,
  buildExtractiveAnswer,
}