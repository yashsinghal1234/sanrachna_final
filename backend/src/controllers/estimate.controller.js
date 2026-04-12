const { spawn } = require('child_process')
const path = require('path')

const SCRIPT = path.join(__dirname, '..', 'ml', 'predict.py')

/**
 * Run the Python ML script and return the prediction result.
 * Input: { material, labor, profit_rate, markup, discount }
 * Output: { prediction, model, features }
 */
function runPythonPredict(features) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''

    py.stdout.on('data', (d) => { stdout += d.toString() })
    py.stderr.on('data', (d) => { stderr += d.toString() })

    py.on('close', (code) => {
      if (code !== 0) {
        const msg = stderr.trim() || `Python exited with code ${code}`
        try {
          const parsed = JSON.parse(msg)
          return reject(new Error(parsed.error || msg))
        } catch {
          return reject(new Error(msg))
        }
      }
      try {
        const result = JSON.parse(stdout.trim())
        if (result.error) return reject(new Error(result.error))
        resolve(result)
      } catch {
        reject(new Error('Invalid JSON from Python script: ' + stdout.slice(0, 120)))
      }
    })

    py.on('error', (e) => reject(new Error(`Could not start Python: ${e.message}`)))

    // Write input as JSON to stdin
    py.stdin.write(JSON.stringify(features))
    py.stdin.end()
  })
}

// POST /api/projects/:projectId/estimate
async function estimateBudget(req, res) {
  const body = req.body || {}

  const material    = Number(body.material ?? body.material_cost ?? 0)
  const labor       = Number(body.labor ?? body.labor_cost ?? 0)
  const profit_rate = Number(body.profit_rate ?? 0)
  const markup      = Number(body.markup ?? body.markup_cost ?? 0)
  const discount    = Number(body.discount ?? body.discount_cost ?? 0)

  // Basic validation
  if (isNaN(material) || isNaN(labor) || isNaN(profit_rate) || isNaN(markup) || isNaN(discount)) {
    return res.status(400).json({ message: 'All fields must be valid numbers.' })
  }

  try {
    const result = await runPythonPredict({ material, labor, profit_rate, markup, discount })

    // Material + labor + profit as a simple sanity check
    const inputTotal = material + labor
    const variance = result.prediction - inputTotal
    const variancePct = inputTotal > 0 ? Math.round((variance / inputTotal) * 100) : 0

    res.json({
      prediction: result.prediction,
      model: result.model,
      features: result.features,
      inputTotal,         // sum of material + labor (for display)
      variance,           // predicted - inputTotal
      variancePct,        // % variance
      projectId: req.project._id,
    })
  } catch (err) {
    console.error('[Estimate] Python error:', err.message)
    res.status(500).json({ message: `Prediction failed: ${err.message}` })
  }
}

module.exports = { estimateBudget }
