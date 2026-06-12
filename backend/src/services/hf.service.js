async function callHuggingFace(prompt) {
  const token = process.env.HF_API_TOKEN
  const model = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'

  console.log('[HF] Token exists:', Boolean(token))
  console.log('[HF] Model:', model)

  if (!token) {
    throw new Error('HF_API_TOKEN is not configured.')
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 450,
        temperature: 0.2,
        return_full_text: false,
      },
    }),
  })

  const rawText = await response.text()
  console.log('[HF] Status:', response.status)
  console.log('[HF] Raw response:', rawText.slice(0, 500))

  if (!response.ok) {
    throw new Error(`Hugging Face API failed: ${response.status} ${rawText}`)
  }

  const data = JSON.parse(rawText)

  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim()
  }

  if (data?.generated_text) {
    return data.generated_text.trim()
  }

  return JSON.stringify(data)
}

module.exports = { callHuggingFace }
