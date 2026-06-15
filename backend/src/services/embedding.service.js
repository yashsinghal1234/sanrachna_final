const { pipeline } = require('@xenova/transformers')

let extractor = null

async function getExtractor() {
  if (!extractor) {
    console.log('[EMBEDDINGS] Loading all-MiniLM-L6-v2...')
    
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    )

    console.log('[EMBEDDINGS] Model loaded')
  }

  return extractor
}

async function embedText(text) {
  const model = await getExtractor()

  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  })

  return Array.from(output.data)
}

function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

module.exports = {
  embedText,
  cosineSimilarity,
}