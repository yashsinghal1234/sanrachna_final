const fs = require('fs')
const pdfParse = require('pdf-parse')
const { embedText } = require('./embedding.service')

function chunkText(text, chunkSize = 1000) {
  const chunks = []

  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize).trim()
    if (chunk) chunks.push(chunk)
  }

  return chunks
}

async function embedChunks(chunks) {
  const vectors = []

  for (const chunk of chunks) {
    const vector = await embedText(chunk)
    vectors.push(vector)
  }

  return vectors
}

async function extractPdfText(filePath) {
  const buffer = fs.readFileSync(filePath)
  const result = await pdfParse(buffer)

  const text = String(result.text || '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    text,
    chunks: chunkText(text),
  }
}

module.exports = {
  extractPdfText,
  embedChunks,
}