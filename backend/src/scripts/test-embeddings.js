const { embedText, cosineSimilarity } = require('../services/embedding.service')

async function run() {
  const q1 = await embedText(
    'What are common construction delay risks?'
  )

  const q2 = await embedText(
    'Typical causes of project delays'
  )

  const q3 = await embedText(
    'How to wear safety helmets'
  )

  console.log(
    'Delay vs Delay:',
    cosineSimilarity(q1, q2)
  )

  console.log(
    'Delay vs Safety:',
    cosineSimilarity(q1, q3)
  )
}

run()