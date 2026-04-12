const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const key = process.env.GEMINI_API_KEY
console.log('Key present:', !!key)

// Test v1 endpoint for 1.5 models and v1beta for 2.0
const tests = [
  { model: 'gemini-1.5-flash', api: 'v1' },
  { model: 'gemini-1.5-flash-latest', api: 'v1' },
  { model: 'gemini-2.0-flash-lite', api: 'v1beta' },
  { model: 'gemini-2.0-flash', api: 'v1beta' },
]

const body = JSON.stringify({ contents: [{ parts: [{ text: 'Reply with just the word OK' }] }] })

async function tryModel({ model, api }) {
  const url = `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${key}`
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    const j = await r.json()
    if (r.ok) return { ok: true, model, api, text: j.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 30) }
    return { ok: false, model, api, status: r.status, error: (j.error?.message || 'unknown').slice(0, 120) }
  } catch (e) { return { ok: false, model, api, status: 0, error: e.message?.slice(0, 80) } }
}

Promise.all(tests.map(tryModel)).then(results => {
  console.log('\n--- Results ---')
  for (const r of results) {
    if (r.ok) console.log(`✓ ${r.api}/${r.model} -> "${r.text}"`)
    else console.log(`✗ ${r.api}/${r.model} [${r.status}] -> ${r.error}`)
  }
}).catch(e => { console.error(e.message); process.exit(1) })
