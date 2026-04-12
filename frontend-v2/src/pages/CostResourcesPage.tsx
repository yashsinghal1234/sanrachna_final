import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BrainCircuit,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Download,
  HardHat,
  Info,
  Lightbulb,
  Loader2,
  Package2,
  Percent,
  Save,
  Upload,
  Wrench,
} from 'lucide-react'

import { ProjectContextBanner } from '@/components/ProjectContextBanner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { fetchWorkspaceCostResources, apiEstimateBudget, type EstimateResult } from '@/api/resources'
import { apiPatchPlanningStudio } from '@/api/projectTeamApi'
import { useActiveProject } from '@/hooks/useActiveProject'
import type { BillOfMaterialRow } from '@/types/planning.types'
import type { CostBreakdown, ProjectSummary, ResourceLine } from '@/types/dashboard.types'
import { useProjectsStore } from '@/store/useProjectsStore'

function inr(n: number) {
  try {
    return n.toLocaleString('en-IN')
  } catch {
    return String(n)
  }
}

function bomWithWaste(bom: BillOfMaterialRow[], wastePct: number) {
  return bom.map((r) => {
    const wasteQty = r.quantity * wastePct
    const totalQty = r.quantity + wasteQty
    const totalCost = Math.round(totalQty * r.unitRate)
    return {
      ...r,
      wastePct,
      wasteQty,
      totalQty,
      totalCost,
    }
  })
}

type BomRowEditable = {
  material: string
  category: string
  quantity: number
  unit: string
  unitRate: number
  wastePct: number
  supplierLink: string
}

function inr0(n: number) {
  return `₹${inr(Math.round(n))}`
}

export function CostResourcesPage() {
  const { project, masterPlan } = useActiveProject()
  const { projects, currentProjectId, setCurrentProjectId } = useProjectsStore()
  const [toast, setToast] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(true)

  const [costApiLoading, setCostApiLoading] = useState(false)
  const [costApiError, setCostApiError] = useState<string | null>(null)
  const [apiSummary, setApiSummary] = useState<ProjectSummary | null>(null)
  const [apiCostBreakdown, setApiCostBreakdown] = useState<CostBreakdown | null>(null)
  const [apiResources, setApiResources] = useState<ResourceLine[]>([])

  // ── ML Budget Estimator ───────────────────────────────────────────────────
  const [estMaterial, setEstMaterial] = useState(40000)
  const [estLabor, setEstLabor] = useState(15000)
  const [estProfitRate, setEstProfitRate] = useState(20)
  const [estMarkup, setEstMarkup] = useState(5000)
  const [estDiscount, setEstDiscount] = useState(-2000)
  // Track if values are loaded from backend
  const [estLoaded, setEstLoaded] = useState(false)
    // Load planning fields from backend on mount or project change
    useEffect(() => {
      if (!project?.id) return
      const studio = ((project as any).planning?.sanrachnaStudio) || {}
      if (typeof studio === 'object') {
        if (typeof studio.material === 'number') setEstMaterial(studio.material)
        if (typeof studio.labor === 'number') setEstLabor(studio.labor)
        if (typeof studio.profit_rate === 'number') setEstProfitRate(studio.profit_rate)
        if (typeof studio.markup === 'number') setEstMarkup(studio.markup)
        if (typeof studio.discount === 'number') setEstDiscount(studio.discount)
      }
      setEstLoaded(true)
    }, [project?.id])

    // Auto-save planning fields to backend when changed
    useEffect(() => {
      if (!project?.id || !estLoaded) return
      const timer = setTimeout(() => {
        apiPatchPlanningStudio(project.id, {
          material: estMaterial,
          labor: estLabor,
          profit_rate: estProfitRate,
          markup: estMarkup,
          discount: estDiscount,
        }).catch(() => {})
      }, 500)
      return () => clearTimeout(timer)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estMaterial, estLabor, estProfitRate, estMarkup, estDiscount, project?.id, estLoaded])
  const [estLoading, setEstLoading] = useState(false)
  const [estError, setEstError] = useState<string | null>(null)
  const [estResult, setEstResult] = useState<EstimateResult | null>(null)

  const runEstimate = async () => {
    if (!project?.id) return
    setEstLoading(true)
    setEstError(null)
    try {
      const res = await apiEstimateBudget(project.id, {
        material: estMaterial,
        labor: estLabor,
        profit_rate: estProfitRate,
        markup: estMarkup,
        discount: estDiscount,
      })
      setEstResult(res)
    } catch (e) {
      setEstError(e instanceof Error ? e.message : 'Prediction failed.')
    } finally {
      setEstLoading(false)
    }
  }

  const wastePct = 0.05

  const cost = masterPlan?.costBreakdown ?? null
  const workforce = masterPlan?.workforcePlan ?? null
  const equip = masterPlan?.equipmentPlan ?? []
  const assumptions = masterPlan?.assumptions ?? []

  const computed = useMemo(() => {
    if (!masterPlan) return null
    const costPerSqM = Math.round(masterPlan.costBreakdown.costPerSqFt * 10.7639)
    const phases = masterPlan.costBreakdown.phases.map((p) => ({ phase: p.name, cost: p.cost, percent: p.percent }))
    const bomRows = bomWithWaste(masterPlan.billOfMaterials, wastePct)
    const bomTotal = bomRows.reduce((a, r) => a + r.totalCost, 0)

    // Very lightweight demo labor estimate: use average monthly labor cost from workforce & duration
    const months = Math.max(1, masterPlan.timeline.totalMonths)
    const assumedMonthlyLaborPerWorker = 18000
    const laborCost = workforce ? workforce.totalWorkers * assumedMonthlyLaborPerWorker * months : null

    // Equipment buy vs rent demo assumptions (in INR)
    const equipmentAnalysis = equip.map((e) => {
      const purchase = e.recommendation === 'Rent' ? 0 : e.name.toLowerCase().includes('pump') ? 650000 : 450000
      const monthlyRent = e.name.toLowerCase().includes('pump') ? 85000 : 60000
      const usageMonths = Math.min(6, months)
      const rentTotal = monthlyRent * usageMonths
      const breakEvenMonths = purchase > 0 ? Math.ceil(purchase / monthlyRent) : null
      const recommendation =
        e.recommendation === 'Buy'
          ? 'Buy'
          : e.recommendation === 'Rent'
            ? 'Rent'
            : 'Not needed'
      return {
        name: e.name,
        recommendation,
        purchase,
        monthlyRent,
        usageMonths,
        rentTotal,
        breakEvenMonths,
        reason: e.reason,
      }
    })

    return { costPerSqM, phases, bomRows, bomTotal, laborCost, equipmentAnalysis }
  }, [masterPlan, wastePct])

  useEffect(() => {
    if (!project?.id) {
      setApiSummary(null)
      setApiCostBreakdown(null)
      setApiResources([])
      setCostApiError(null)
      setCostApiLoading(false)
      return
    }
    let cancelled = false
    setCostApiLoading(true)
    setCostApiError(null)
    fetchWorkspaceCostResources(project.id)
      .then((b) => {
        if (cancelled) return
        setApiSummary(b.summary)
        setApiCostBreakdown(b.cost_breakdown)
        setApiResources(b.resources)
      })
      .catch((e) => {
        if (cancelled) return
        setCostApiError(e instanceof Error ? e.message : 'Could not load cost data')
        setApiSummary(null)
        setApiCostBreakdown(null)
        setApiResources([])
      })
      .finally(() => {
        if (!cancelled) setCostApiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [project?.id])

  const apiDerivedPhases = useMemo(() => {
    const cb = apiCostBreakdown
    if (!cb) return []
    const total = cb.total_inr || 1
    const mk = (phase: string, n: number) => ({ phase, cost: n, percent: Math.round((n / total) * 1000) / 10 })
    return [
      mk('Foundation', cb.foundation_inr),
      mk('Structure', cb.structure_inr),
      mk('MEP', cb.mep_inr),
      mk('Finishing', cb.finishing_inr),
      mk('Contingency', cb.contingency_inr),
    ].filter((p) => p.cost > 0)
  }, [apiCostBreakdown])

  const projectOptions = useMemo(() => {
    return Object.values(projects)
      .filter((p) => !p.archived)
      .map((p) => ({ id: p.id, name: p.name }))
  }, [projects])

  const summary = useMemo(() => {
    // If there is a predicted budget, show it as totalCost
    if (estResult) {
      return {
        totalCost: estResult.prediction,
        costPerSqFt: 0,
        materialPct: 0,
        laborPct: 0,
        equipmentCost: 0,
        contingency: 0,
        materialCost: estResult.features.Material_Cost,
        laborCost: estResult.features.Labor_Cost,
      }
    }
    if (computed && cost) {
      const totalCost = cost.totalCost
      const costPerSqFt = cost.costPerSqFt
      const materialCost = computed.bomTotal
      const laborCost = computed.laborCost ?? Math.round(totalCost * 0.18)
      const equipmentCost = computed.equipmentAnalysis.reduce((a, e) => a + e.rentTotal, 0)
      const contingency = cost.contingencyAmount
      const materialPct = Math.round((materialCost / Math.max(1, totalCost)) * 100)
      const laborPct = Math.round((laborCost / Math.max(1, totalCost)) * 100)
      return { totalCost, costPerSqFt, materialPct, laborPct, equipmentCost, contingency, materialCost, laborCost }
    }
    const cb = apiCostBreakdown
    if (cb) {
      const totalCost = cb.total_inr
      const areaSqFt = apiSummary ? Math.max(1, apiSummary.area_sqm * 10.7639) : 0
      const costPerSqFt = areaSqFt > 0 ? Math.round(totalCost / areaSqFt) : 0
      const materialCost = apiResources.reduce((a, r) => a + r.extended_inr, 0)
      const contingency = cb.contingency_inr
      const equipmentCost = Math.round(totalCost * 0.06)
      const laborCost = Math.max(0, totalCost - materialCost - equipmentCost - contingency)
      const materialPct = Math.round((materialCost / Math.max(1, totalCost)) * 100)
      const laborPct = Math.round((laborCost / Math.max(1, totalCost)) * 100)
      return { totalCost, costPerSqFt, materialPct, laborPct, equipmentCost, contingency, materialCost, laborCost }
    }
    return {
      totalCost: 0,
      costPerSqFt: 0,
      materialPct: 0,
      laborPct: 0,
      equipmentCost: 0,
      contingency: 0,
      materialCost: 0,
      laborCost: 0,
    }
  }, [computed, cost, apiCostBreakdown, apiSummary, apiResources, estResult])

  const costByPhase = useMemo(() => {
    if (computed) return computed.phases
    if (apiDerivedPhases.length) return apiDerivedPhases
    return []
  }, [computed, apiDerivedPhases])

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#94A3B8']

  const editableBom = useMemo((): BomRowEditable[] => {
    if (computed) {
      return computed.bomRows.map((r) => ({
        material: r.material,
        category: 'Materials',
        quantity: Number(r.totalQty.toFixed(2)),
        unit: r.unit,
        unitRate: r.unitRate,
        wastePct: Math.round(r.wastePct * 100),
        supplierLink: '',
      }))
    }
    if (apiResources.length) {
      return apiResources.map((r) => ({
        material: r.material,
        category: 'Materials',
        quantity: Number(String(r.quantity).replace(/_/g, '')) || 0,
        unit: r.unit,
        unitRate: r.benchmark_rate_inr,
        wastePct: 5,
        supplierLink: r.supplier_hint ?? '',
      }))
    }
    return []
  }, [computed, apiResources])

  const [bomRows, setBomRows] = useState<BomRowEditable[]>([])

  useEffect(() => {
    setBomRows(editableBom)
    setIsDirty(false)
  }, [editableBom])

  const bumpDirty = () => {
    if (!isDirty) setIsDirty(true)
  }

  const saveChanges = () => {
    setIsDirty(false)
    setToast('Saved changes (demo).')
    window.setTimeout(() => setToast(null), 2600)
  }

  const publishUpdates = () => {
    setIsDirty(false)
    setToast('Published updates (demo).')
    window.setTimeout(() => setToast(null), 2600)
  }

  const exportCostSheet = () => {
    const payload = {
      projectId: project?.id ?? apiSummary?.id ?? '',
      projectName: project?.name ?? apiSummary?.name ?? '',
      version: project?.currentVersionLabel ?? '—',
      summary,
      bom: bomRows,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sanrachna_cost_sheet_${payload.projectId || 'project'}_${payload.version}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast('Exported cost sheet JSON.')
    window.setTimeout(() => setToast(null), 2600)
  }

  return (
    <div className="space-y-6">
      {/* HEADER / CONTROLS */}
      <Card className="sticky top-0 z-30 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm shadow-sm">
              <span className="text-[color:var(--color-text_secondary)]">Project</span>
              <div className="relative">
                <select
                  className="appearance-none bg-transparent pr-6 font-semibold text-[color:var(--color-text)] focus:outline-none"
                  value={currentProjectId ?? ''}
                  onChange={(e) => setCurrentProjectId(e.target.value || null)}
                  aria-label="Select project"
                >
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
              </div>
            </div>

            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-800">
              Plan {project?.currentVersionLabel ?? '—'}
            </span>
            <span className="text-xs text-[color:var(--color-text_secondary)]">
              Last updated:{' '}
              {masterPlan
                ? 'Synced from approved plan'
                : costApiLoading
                  ? 'Loading from API…'
                  : apiCostBreakdown || apiResources.length
                    ? 'From cost-resources API'
                    : costApiError
                      ? 'API error — see banner'
                      : 'No cost data yet'}
            </span>
            {isDirty ? (
              <span className="rounded-full bg-[color:var(--color-warning)]/12 px-3 py-1 text-xs font-semibold text-[color:var(--color-warning)]">
                Unsaved changes
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={saveChanges}>
              <Save className="size-4" />
              Save Changes
            </Button>
            <Button variant="primary" onClick={publishUpdates}>
              <Upload className="size-4" />
              Publish Updates
            </Button>
            <Button variant="outline" onClick={exportCostSheet}>
              <Download className="size-4" />
              Export Cost Sheet
            </Button>
          </div>
        </div>
      </Card>

      <ProjectContextBanner />

      {!project ? (
        <Card>
          <CardContent className="py-8 text-sm text-[color:var(--color-text_secondary)]">
            Select a project to load cost and resource data from the workspace API.
          </CardContent>
        </Card>
      ) : null}

      {project && costApiError ? (
        <Card className="border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-error)]">{costApiError}</CardContent>
        </Card>
      ) : null}

      {project && !costApiLoading && !computed && !apiCostBreakdown && !apiResources.length && !costApiError ? (
        <Card>
          <CardContent className="py-8 text-sm text-[color:var(--color-text_secondary)]">
            <div className="space-y-2">
              <div>
                No cost or BOM rows returned for <span className="font-semibold">{project.name}</span>. Approve a plan in AI Planning Studio or expose{' '}
                <span className="font-mono text-xs">GET /api/v1/workspaces/&#123;id&#125;/cost-resources</span>.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* SUMMARY METRICS ROW */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total Estimated Cost', value: inr0(summary.totalCost), tone: 'bg-[#EEF3FB] ring-[#DBE9F8]' },
          { label: 'Cost / Sq Ft', value: inr0(summary.costPerSqFt), tone: 'bg-[#E9F7F2] ring-[#CFE8DE]' },
          { label: 'Material Cost %', value: `${summary.materialPct}%`, tone: 'bg-[#FFF7E8] ring-[#F6E4BB]' },
          { label: 'Labor Cost %', value: `${summary.laborPct}%`, tone: 'bg-[#F2F5FC] ring-[#E1E8F7]' },
          { label: 'Equipment Cost', value: inr0(summary.equipmentCost), tone: 'bg-[#F8FAFC] ring-[#E2E8F0]' },
          { label: 'Contingency Allocation', value: inr0(summary.contingency), tone: 'bg-[#FFEef0] ring-[#F8D8DD]' },
        ].map((c) => (
          <Card key={c.label} className={`${c.tone} shadow-none ring-1`}>
            <CardContent className="pt-4">
              <div className="text-xs text-[color:var(--color-text_secondary)]">{c.label}</div>
              <div className="mt-1 text-xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* LEFT MAIN (70%) + RIGHT SIDE (30%) */}
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          {/* Cost Breakdown Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-4 text-[color:var(--color-primary_dark)]" />
                Cost breakdown analysis
              </CardTitle>
              <CardDescription>Donut + expandable table by phase.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <div className="h-[260px]">
                {costByPhase.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costByPhase} dataKey="cost" nameKey="phase" innerRadius={70} outerRadius={105} paddingAngle={2}>
                        {costByPhase.map((_, idx) => (
                          <Cell key={idx} fill={pieColors[idx % pieColors.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => (typeof v === 'number' ? inr0(v) : String(v))}
                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] text-sm text-[color:var(--color-text_secondary)]">
                    No phase breakdown yet
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                      <th className="px-3 py-2">Phase</th>
                      <th className="px-3 py-2">Cost</th>
                      <th className="px-3 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]">
                    {costByPhase.map((p) => (
                      <tr key={p.phase}>
                        <td className="px-3 py-3 font-semibold">{p.phase}</td>
                        <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{inr0(p.cost)}</td>
                        <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{p.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* BOM Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package2 className="size-4 text-[color:var(--color-primary_dark)]" />
                    Bill of materials (BOM)
                  </CardTitle>
                  <CardDescription>Edit/add/remove materials, waste, and supplier link.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setBomRows((prev) => [
                        ...prev,
                        {
                          material: 'New material',
                          category: 'Materials',
                          quantity: 1,
                          unit: 'unit',
                          unitRate: 0,
                          wastePct: 5,
                          supplierLink: '',
                        },
                      ])
                      bumpDirty()
                      setToast('Added material row.')
                      window.setTimeout(() => setToast(null), 2600)
                    }}
                  >
                    Add Material
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                    <th className="px-3 py-2">Material Name</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Quantity</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Unit Rate</th>
                    <th className="px-3 py-2">Total Cost</th>
                    <th className="px-3 py-2">Waste %</th>
                    <th className="px-3 py-2">Supplier Link</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {bomRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-[color:var(--color-text_secondary)]">
                        No bill of materials rows. Load an approved plan or populate the cost-resources API.
                      </td>
                    </tr>
                  ) : null}
                  {bomRows.map((r, idx) => {
                    const total = Math.round(r.quantity * r.unitRate * (1 + r.wastePct / 100))
                    return (
                      <tr key={`${r.material}-${idx}`} className="hover:bg-[color:var(--color-surface_hover)]/40">
                        <td className="px-3 py-3">
                          <input
                            className="h-9 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            value={r.material}
                            onChange={(e) => {
                              const v = e.target.value
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, material: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            className="h-9 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            value={r.category}
                            onChange={(e) => {
                              const v = e.target.value
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, category: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            className="h-9 w-28 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            value={r.quantity}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            className="h-9 w-24 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            value={r.unit}
                            onChange={(e) => {
                              const v = e.target.value
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            className="h-9 w-32 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            value={r.unitRate}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, unitRate: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold">{inr0(total)}</td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            className="h-9 w-20 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            value={r.wastePct}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, wastePct: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            className="h-9 w-full min-w-[220px] rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                            placeholder="https://supplier…"
                            value={r.supplierLink}
                            onChange={(e) => {
                              const v = e.target.value
                              setBomRows((prev) => prev.map((x, i) => (i === idx ? { ...x, supplierLink: v } : x)))
                              bumpDirty()
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setBomRows((prev) => prev.filter((_, i) => i !== idx))
                                bumpDirty()
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Workforce Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="size-4 text-[color:var(--color-primary_dark)]" />
                Workforce planning
              </CardTitle>
              <CardDescription>Crew by trade + allocation by phase + labor cost.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[var(--radius-2xl)] bg-[color:var(--color-bg)] p-4 ring-1 ring-[color:var(--color-border)]">
                  <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Peak workforce</div>
                  <div className="mt-1 text-2xl font-bold">{workforce?.peakWorkers ?? '—'}</div>
                </div>
                <div className="rounded-[var(--radius-2xl)] bg-[color:var(--color-bg)] p-4 ring-1 ring-[color:var(--color-border)]">
                  <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Total workers</div>
                  <div className="mt-1 text-2xl font-bold">{workforce?.totalWorkers ?? '—'}</div>
                </div>
                <div className="rounded-[var(--radius-2xl)] bg-[color:var(--color-bg)] p-4 ring-1 ring-[color:var(--color-border)]">
                  <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Labor cost (est.)</div>
                  <div className="mt-1 text-2xl font-bold">{inr0(summary.laborCost)}</div>
                </div>
              </div>

              <div className="h-[280px]">
                <div className="mb-2 text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">
                  WORKFORCE ALLOCATION (proxy by phase cost %)
                </div>
                {costByPhase.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costByPhase} margin={{ top: 10, right: 16, left: -6, bottom: 0 }}>
                      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                      <XAxis dataKey="phase" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }} />
                      <Legend />
                      <Bar dataKey="percent" name="Allocation %" fill="#8B5CF6" radius={[10, 10, 10, 10]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] text-sm text-[color:var(--color-text_secondary)]">
                    No allocation data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Cost Assumptions (collapsible) */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="size-4 text-[color:var(--color-text_muted)]" />
                    Cost assumptions
                  </CardTitle>
                  <CardDescription>Sources + productivity + waste factor.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAssumptionsOpen((s) => !s)}>
                  {assumptionsOpen ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {assumptionsOpen ? (
              <CardContent className="space-y-2 text-sm text-[color:var(--color-text_secondary)]">
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">WASTE FACTOR</div>
                  <div className="mt-1">Applied waste factor: <span className="font-semibold">{Math.round(wastePct * 100)}%</span></div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">LABOR RATES</div>
                  <div className="mt-1">
                    Labor estimates use the approved plan workforce section when available; otherwise they are derived from totals returned by the API.
                  </div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">MATERIAL RATE SOURCE</div>
                  <div className="mt-1">Material lines mirror the BOM from the approved plan or the cost-resources API resource list.</div>
                </div>
                <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[color:var(--color-border)]">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">PLAN ASSUMPTIONS</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {(assumptions.length ? assumptions : ['No approved plan assumptions yet.']).slice(0, 8).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            ) : null}
          </Card>

          {/* Quick Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="size-4 text-[color:var(--color-primary_dark)]" />
                Quick insights
              </CardTitle>
              <CardDescription>What to watch this week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[color:var(--color-text_secondary)]">
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                Material spend is <span className="font-semibold text-[color:var(--color-text)]">{summary.materialPct}%</span> of total — supplier overrides can shift this quickly.
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white p-3">
                Labor is <span className="font-semibold text-[color:var(--color-text)]">{summary.laborPct}%</span> — reduce crew idle time in finishing to protect contingency.
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card className="overflow-hidden border-[#d6ece7] bg-[#f2fcf9]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-[color:var(--color-primary_dark)]" />
                AI suggestions
              </CardTitle>
              <CardDescription>Optimization ideas (demo).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                'Replace AAC blocks with fly-ash bricks to save ~6% on masonry basket.',
                'Rent scaffolding instead of buying for short duration tasks.',
                'Reduce crew idle time in finishing by parallelizing wet-area waterproofing approvals.',
              ].map((s) => (
                <div key={s} className="rounded-[var(--radius-xl)] bg-white px-3 py-2 ring-1 ring-[#dcece9]">
                  {s}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── ML BUDGET ESTIMATOR ─────────────────────────────────────── */}
      <Card className="overflow-hidden border-purple-100 bg-gradient-to-br from-purple-50/60 to-blue-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="size-5 text-purple-600" />
            AI Budget Estimator
            <span className="ml-2 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
              XGBoost ML Model
            </span>
          </CardTitle>
          <CardDescription>
            Enter cost inputs and run the trained XGBoost model to predict the final project budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Input form */}
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-purple-600">
                Input Features
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Material Cost (₹)', state: estMaterial, set: setEstMaterial, icon: '🧱' },
                  { label: 'Labor Cost (₹)', state: estLabor, set: setEstLabor, icon: '👷' },
                  { label: 'Markup Cost (₹)', state: estMarkup, set: setEstMarkup, icon: '📈' },
                  { label: 'Discount (₹, use negative)', state: estDiscount, set: setEstDiscount, icon: '🏷️' },
                ].map(({ label, state, set, icon }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                      {icon} {label}
                    </label>
                    <input
                      type="number"
                      className="h-10 w-full rounded-xl border border-purple-200 bg-white px-3 text-sm font-medium shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      value={state}
                      onChange={(e) => set(Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">📊 Profit Rate (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={0.5}
                    className="flex-1 accent-purple-600"
                    value={estProfitRate}
                    onChange={(e) => setEstProfitRate(Number(e.target.value))}
                  />
                  <span className="w-14 rounded-lg border border-purple-200 bg-white px-2 py-1 text-center text-sm font-bold text-purple-700">
                    {estProfitRate}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => void runEstimate()}
                  disabled={estLoading || !project?.id}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                >
                  {estLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Running XGBoost…
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="size-4" />
                      Predict Budget
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={estLoading || !project?.id}
                  onClick={async () => {
                    setEstLoading(true)
                    setEstError(null)
                    try {
                      const studio = ((project as any).planning?.sanrachnaStudio) || {}
                      const res = await apiEstimateBudget(project.id, {
                        material: typeof studio.material === 'number' ? studio.material : 0,
                        labor: typeof studio.labor === 'number' ? studio.labor : 0,
                        profit_rate: typeof studio.profit_rate === 'number' ? studio.profit_rate : 0,
                        markup: typeof studio.markup === 'number' ? studio.markup : 0,
                        discount: typeof studio.discount === 'number' ? studio.discount : 0,
                      })
                      setEstResult(res)
                    } catch (e) {
                      setEstError(e instanceof Error ? e.message : 'Prediction failed.')
                    } finally {
                      setEstLoading(false)
                    }
                  }}
                  className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                  title="Predict using saved planning data"
                >
                  Use Saved Data
                </Button>
              </div>
              {estError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  ⚠️ {estError}
                </div>
              ) : null}
            </div>

            {/* Divider */}
            <div className="hidden lg:flex lg:items-center">
              <div className="h-full w-px bg-purple-100" />
            </div>

            {/* Result */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
              {estResult ? (
                <div className="w-full space-y-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="size-5" />
                    Prediction ready
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Predicted Budget
                    </div>
                    <div className="mt-1 text-4xl font-black text-purple-700">
                      ₹{inr(Math.round(estResult.prediction))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold text-slate-400">Input Total</div>
                      <div className="mt-0.5 text-base font-bold">₹{inr(Math.round(estResult.inputTotal))}</div>
                    </div>
                    <div className={`rounded-xl p-3 ${estResult.variance >= 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                      <div className="text-[11px] font-semibold text-slate-400">Variance</div>
                      <div className={`mt-0.5 text-base font-bold ${estResult.variance >= 0 ? 'text-amber-700' : 'text-green-700'}`}>
                        {estResult.variance >= 0 ? '+' : ''}₹{inr(Math.round(Math.abs(estResult.variance)))}
                        <span className="ml-1 text-xs font-medium">({estResult.variancePct}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                    <div className="font-semibold">Model: {estResult.model}</div>
                    <div className="mt-1">
                      Mat: ₹{inr(Math.round(estResult.features.Material_Cost))} · 
                      Lab: ₹{inr(Math.round(estResult.features.Labor_Cost))} · 
                      Profit: {estResult.features.Profit_Rate}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <div className="flex items-center justify-center">
                    <div className="rounded-full bg-purple-100 p-6">
                      <BrainCircuit className="size-10 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-500">
                    Fill in the inputs and click<br />
                    <span className="text-purple-600">Predict Budget</span> to run the model
                  </div>
                  <div className="text-xs text-slate-400">
                    Trained on: Material_Cost · Labor_Cost<br />
                    Profit_Rate · Markup_cost · Discount_cost
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOTTOM FULL WIDTH: Equipment / Buy vs Rent Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="size-4 text-[color:var(--color-primary_dark)]" />
            Equipment / buy vs rent analysis
          </CardTitle>
          <CardDescription>Decision table with break-even and override.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                <th className="px-3 py-2">Equipment</th>
                <th className="px-3 py-2">Usage Duration</th>
                <th className="px-3 py-2">Rental Cost</th>
                <th className="px-3 py-2">Purchase Cost</th>
                <th className="px-3 py-2">Break-even</th>
                <th className="px-3 py-2">AI Recommendation</th>
                <th className="px-3 py-2">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {(
                (computed?.equipmentAnalysis?.length
                  ? computed.equipmentAnalysis
                  : ([
                      {
                        name: 'Concrete pump',
                        usageMonths: 4,
                        monthlyRent: 85000,
                        rentTotal: 340000,
                        purchase: 650000,
                        breakEvenMonths: 8,
                        recommendation: 'Rent',
                      },
                      {
                        name: 'Scaffolding set',
                        usageMonths: 5,
                        monthlyRent: 60000,
                        rentTotal: 300000,
                        purchase: 450000,
                        breakEvenMonths: 8,
                        recommendation: 'Rent',
                      },
                    ] as any[]))
              ).map((e: any) => (
                <tr key={e.name}>
                  <td className="px-3 py-3 font-semibold">{e.name}</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{e.usageMonths} months</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{inr0(e.rentTotal)}</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{e.purchase ? inr0(e.purchase) : '—'}</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{e.breakEvenMonths ? `${e.breakEvenMonths} mo` : '—'}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-[color:var(--color-info)]/10 px-2 py-1 text-xs font-semibold text-[color:var(--color-info)]">
                      {e.recommendation}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="h-9 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                      defaultValue={e.recommendation}
                      onChange={() => bumpDirty()}
                    >
                      <option value="Buy">Buy</option>
                      <option value="Rent">Rent</option>
                      <option value="Not needed">Not needed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[80] max-w-sm rounded-[var(--radius-2xl)] bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}

