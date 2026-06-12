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
You are Sanrachna AI.

Answer ONLY from the provided context.
If the answer is not present in the context, say:
"I could not find this information in the project data."

Be concise and use bullet points when appropriate.
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
    max_tokens: 600,
  })
  const content = completion?.choices?.[0]?.message?.content

  if (!content || typeof content !== 'string') {
    throw new Error('Groq returned an empty response.')
  }

  return content.trim()
}

module.exports = { askGroq }