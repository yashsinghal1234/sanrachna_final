const Groq = require('groq-sdk')

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

async function* askGroq(question, context, imageBase64) {
  const model = imageBase64 ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile'
  
  const userContent = [
    {
      type: 'text',
      text: `CONTEXT:\n\n${context}\n\nQUESTION:\n\n${question}`,
    }
  ]

  if (imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: imageBase64 },
    })
  }

  const stream = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `
You are Sanrachna AI, a construction project management assistant.

Answer ONLY using the provided context.
Do not invent facts.
If the context does not contain the answer, say that clearly.

Use concise bullet points when useful.
Always end your reply with a polite sign-off like "Thank you" or "Hope this helps!".
        `,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    stream: true,
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) {
      yield text
    }
  }
}

async function transcribeAudio(fileBuffer, filename = 'audio.webm') {
  // Convert buffer to a File-like object or stream for groq SDK
  // Node.js 18+ has native File via buffer, but usually we just pass an object with .name
  // The official groq SDK accepts { buffer, name: string } or similar, but typically accepts a ReadStream.
  // Actually, standard way with groq-sdk taking a buffer:
  // It expects a File object or stream. If using buffer:
  // Using native File (Node 20+) or just passing an object { buffer, name, type }
  // To be safe in Node, we can use the `toFile` utility from groq-sdk or openai-like sdks.
  
  // Best approach for groq audio from buffer:
  const file = await Groq.toFile(fileBuffer, filename)

  const transcriptionAuto = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
  })

  return transcriptionAuto
}

module.exports = { askGroq, transcribeAudio }