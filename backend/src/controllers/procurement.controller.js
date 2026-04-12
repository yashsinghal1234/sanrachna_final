/**
 * procurement.controller.js
 * Serves GET /api/v1/workspaces/:id/procurement
 *
 * Derives procurement data from the approved AI planning report:
 *  - quotes: BOM rows with vendor placeholders
 *  - schedule: procurement timeline from BOM + phase timeline
 *  - recommendations: optimisation suggestions from report
 *  - alerts: risk flags relevant to procurement
 */

function buildQuotesFromBom(bom, phases) {
  const VENDOR_HINTS = {
    cement: ['UltraTech Cements', 'ACC Limited', 'Shree Cement'],
    steel: ['SAIL', 'Tata Steel', 'JSW Steel'],
    sand: ['Local Quarry Agency', 'River Sand Suppliers'],
    aggregate: ['Crushed Stone Depot', 'Local Aggregate Yard'],
    brick: ['Red Brick Works', 'AAC Block Suppliers'],
    water: ['Municipal Supply', 'Tanker Suppliers'],
    tile: ['Kajaria Ceramics', 'Somany Tiles'],
    paint: ['Asian Paints', 'Berger', 'Nerolac'],
    wood: ['Greenply Plywood', 'Century Ply'],
    glass: ['Saint-Gobain', 'Asahi Glass'],
    wire: ['Havells', 'Finolex Cables'],
    pipe: ['Astral Pipes', 'Supreme Industries'],
  }

  return bom.map((row) => {
    const mat = String(row.material || '').toLowerCase()
    const vendorPool = Object.entries(VENDOR_HINTS).find(([key]) => mat.includes(key))
    const vendors = vendorPool ? vendorPool[1] : ['Local Supplier']
    const supplier = vendors[Math.floor(Math.random() * vendors.length)]

    return {
      material: row.material || 'Material',
      supplierName: supplier,
      unitRate: Number(row.unitRate) || 0,
      unit: row.unit || 'unit',
      qualityRating: 3.5 + Math.round(Math.random() * 15) / 10, // 3.5–5.0
      leadTimeDays: 7 + Math.floor(Math.random() * 14), // 7–21 days
    }
  })
}

function buildScheduleFromBomAndTimeline(bom, phases) {
  const today = new Date()
  return bom.map((row, i) => {
    const phaseIdx = Math.floor((i / Math.max(1, bom.length)) * Math.max(1, phases.length))
    const phase = phases[phaseIdx] || phases[0] || { name: 'Structural Works' }

    const procureBy = new Date(today)
    procureBy.setDate(today.getDate() + 7 + i * 3)
    const deliveryBy = new Date(procureBy)
    deliveryBy.setDate(procureBy.getDate() + 14)

    return {
      id: `bom_sch_${i}`,
      material: row.material || 'Material',
      procureBy: procureBy.toISOString().slice(0, 10),
      deliveryDeadline: deliveryBy.toISOString().slice(0, 10),
      linkedPhase: phase.name || 'Structural Works',
      linkedTask: phase.milestones && phase.milestones[0] ? phase.milestones[0] : '—',
      status: 'planned',
    }
  })
}

function buildRecommendationsFromOptimizations(optimizations) {
  return (optimizations || []).slice(0, 8).map((opt, i) => ({
    id: `opt_${i}`,
    title: String(opt.suggestion || '').slice(0, 100) || 'Value Engineering Opportunity',
    rationale: String(opt.impact || '') || `Potential saving: ₹${(Number(opt.savingAmount) || 0).toLocaleString('en-IN')}`,
  }))
}

function buildAlertsFromRisks(risks) {
  return (risks || [])
    .filter((r) => {
      const level = String(r.level || '').toLowerCase()
      const text = String(r.risk || '').toLowerCase()
      return (
        level === 'high' ||
        text.includes('material') ||
        text.includes('supply') ||
        text.includes('procurement') ||
        text.includes('vendor') ||
        text.includes('delay')
      )
    })
    .slice(0, 5)
    .map((r) => `[${r.level}] ${r.risk} — Mitigation: ${r.mitigation || '—'}`)
}

async function getProcurement(req, res) {
  const project = req.project
  const planning = project.planning || {}
  const studio = planning.sanrachnaStudio || {}
  const masterPlan = studio.masterPlan || null

  if (masterPlan) {
    const bom = Array.isArray(masterPlan.billOfMaterials) ? masterPlan.billOfMaterials : []
    const phases = Array.isArray(masterPlan.timeline?.phases) ? masterPlan.timeline.phases : []
    const optimizations = Array.isArray(masterPlan.optimizations) ? masterPlan.optimizations : []
    const risks = Array.isArray(masterPlan.riskForecast) ? masterPlan.riskForecast : []

    const quotes = buildQuotesFromBom(bom, phases)
    const schedule = buildScheduleFromBomAndTimeline(bom, phases)
    const recommendations = buildRecommendationsFromOptimizations(optimizations)
    const alerts = buildAlertsFromRisks(risks)

    return res.json({ quotes, schedule, recommendations, alerts })
  }

  // Empty defaults
  return res.json({ quotes: [], schedule: [], recommendations: [], alerts: [] })
}

module.exports = { getProcurement }
