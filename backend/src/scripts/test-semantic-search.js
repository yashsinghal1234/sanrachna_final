const { pipeline } = require('@xenova/transformers')

async function run() {
  console.log('Loading model...')

  const extractor = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  )

  const q1 =
    'What are common delay risks in construction projects?'

  const q2 =
    'How can schedule slippage be reduced?'

  const q3 =
    'What PPE should workers wear on site?'

  const emb1 = await extractor(q1, {
    pooling: 'mean',
    normalize: true,
  })

  const emb2 = await extractor(q2, {
    pooling: 'mean',
    normalize: true,
  })

  const emb3 = await extractor(q3, {
    pooling: 'mean',
    normalize: true,
  })

  const cosine = (a, b) =>
    a.reduce((sum, val, i) => sum + val * b[i], 0)

  console.log(
    'Delay vs Slippage:',
    cosine(
      Array.from(emb1.data),
      Array.from(emb2.data)
    )
  )

  console.log(
    'Delay vs PPE:',
    cosine(
      Array.from(emb1.data),
      Array.from(emb3.data)
    )
  )
}

run()