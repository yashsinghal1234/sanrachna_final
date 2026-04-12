/**
 * costResources.controller.js
 * Serves GET /api/v1/workspaces/:id/cost-resources
 *
 * Priority:
 *  1. planning.sanrachnaStudio.masterPlan  (AI-approved report)
 *  2. planning.cost_breakdown + planning.resources (legacy direct fields)
 *  3. Empty safe defaults
 */

async function getCostResources(req, res) {
  const project = req.project
  const planning = project.planning || {}
  const studio = planning.sanrachnaStudio || {}
  const masterPlan = studio.masterPlan || null

  // ── Build summary ────────────────────────────────────────────────────────
  const summaryBase = planning.project_summary || {}
  const summary = {
    id: String(project._id),
    name: project.name,
    location: project.location || summaryBase.location || '',
    area_sqm: summaryBase.area_sqm || 0,
    project_type: summaryBase.project_type || 'Construction',
    target_completion: summaryBase.target_completion || project.deadline || '',
    currency: 'INR',
  }

  // ── Derive from masterPlan (approved AI report) ─────────────────────────
  if (masterPlan && masterPlan.costBreakdown) {
    const cb = masterPlan.costBreakdown
    const phases = Array.isArray(cb.phases) ? cb.phases : []

    // Map phases into INR bucket keys
    const phaseMap = {}
    for (const p of phases) {
      phaseMap[String(p.name || '').toLowerCase()] = Number(p.cost) || 0
    }

    const foundation_inr = phaseMap['foundation'] || phaseMap['site preparation'] || 0
    const structure_inr = phaseMap['structure'] || phaseMap['structural works'] || phaseMap['structural'] || 0
    const mep_inr = phaseMap['mep'] || phaseMap['mechanical, electrical & plumbing'] || 0
    const finishing_inr = phaseMap['finishing'] || phaseMap['interiors'] || phaseMap['interior'] || 0
    const contingency_inr = Number(cb.contingencyAmount) || 0
    const total_inr = Number(cb.totalCost) || phases.reduce((a, p) => a + (Number(p.cost) || 0), 0)

    const cost_breakdown = {
      foundation_inr,
      structure_inr,
      mep_inr,
      finishing_inr,
      contingency_inr,
      total_inr,
    }

    // BOM → resources
    const bom = Array.isArray(masterPlan.billOfMaterials) ? masterPlan.billOfMaterials : []
    const resources = bom.map((row, i) => ({
      id: `bom_${i}`,
      material: row.material || 'Material',
      quantity: String(row.quantity ?? 0),
      unit: row.unit || 'unit',
      benchmark_rate_inr: Number(row.unitRate) || 0,
      extended_inr:
        row.totalCost != null
          ? Number(row.totalCost)
          : Math.round((Number(row.quantity) || 0) * (Number(row.unitRate) || 0)),
      supplier_hint: '',
    }))

    // Enrich summary with area from form data
    const formData = studio.currentForm || {}
    if (formData.builtUpArea) {
      summary.area_sqm = Number(formData.builtUpArea) || summary.area_sqm
    }
    if (formData.projectType) {
      summary.project_type = formData.projectType || summary.project_type
    }

    return res.json({ summary, cost_breakdown, resources })
  }

  // ── Legacy direct fields ─────────────────────────────────────────────────
  if (planning.cost_breakdown) {
    return res.json({
      summary,
      cost_breakdown: planning.cost_breakdown,
      resources: planning.resources || [],
    })
  }

  // ── Empty safe default ───────────────────────────────────────────────────
  return res.json({
    summary,
    cost_breakdown: {
      foundation_inr: 0,
      structure_inr: 0,
      mep_inr: 0,
      finishing_inr: 0,
      contingency_inr: 0,
      total_inr: 0,
    },
    resources: [],
  })
}

module.exports = { getCostResources }
