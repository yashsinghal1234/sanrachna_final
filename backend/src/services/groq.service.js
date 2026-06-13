const Groq = require('groq-sdk')

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

async function askGroq(question, context) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `
You are Sanrachna AI, a construction project management assistant.

Answer ONLY using the provided context.
Do not invent facts.
If the context does not contain the answer, say that clearly.

Use concise bullet points when useful.

At the end of your answer, add a short "Sources used:" section.
Mention source labels exactly as they appear in the context, such as SOURCE 1, SOURCE 2.
        `,
      },
      {
        role: 'user',
        content: `
CONTEXT:

${context}

QUESTION:

${question}
        `,
      },
    ],
    temperature: 0.2,
    max_tokens: 700,
  })

  const content = completion?.choices?.[0]?.message?.content

  if (!content || typeof content !== 'string') {
    throw new Error('Groq returned an empty response.')
  }

  return content.trim()
}

module.exports = { askGroq }