import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  MessageSquareText,
  Sparkles,
  Star,
  Truck,
  Users,
} from 'lucide-react'

import { fetchWorkspaceProcurement } from '@/api/resources'
import { ProjectContextBanner } from '@/components/ProjectContextBanner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useActiveProject } from '@/hooks/useActiveProject'
import { useApprovedReport } from '@/hooks/useApprovedReport'
import type {
  ProcurementRecommendation,
  ProcurementScheduleRow,
  SupplierQuote,
} from '@/types/procurement.types'
import { useProjectsStore } from '@/store/useProjectsStore'

function formatISO(iso: string) {
  return iso
}

function parseSupplierQuote(raw: unknown): SupplierQuote | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const material = String(o.material ?? o.name ?? '').trim()
  const supplierName = String(o.supplierName ?? o.supplier ?? o.vendor ?? '').trim()
  const unit = String(o.unit ?? 'unit')
  const unitRate = Number(o.unitRate ?? o.price ?? 0)
  const qualityRating = Number(o.qualityRating ?? o.quality ?? 3)
  const leadTimeDays = Number(o.leadTimeDays ?? o.leadDays ?? 0)
  if (!material && !supplierName) return null
  return {
    material: material || 'Material',
    supplierName: supplierName || '—',
    unitRate: Number.isFinite(unitRate) ? unitRate : 0,
    unit,
    qualityRating: Number.isFinite(qualityRating) ? qualityRating : 3,
    leadTimeDays: Number.isFinite(leadTimeDays) ? leadTimeDays : 0,
  }
}

function parseScheduleRow(raw: unknown, idx: number): ProcurementScheduleRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? `sch-${idx}`)
  const material = String(o.material ?? '').trim()
  const procureBy = String(o.procureBy ?? o.procurementStart ?? o.start ?? '')
  const deliveryDeadline = String(o.deliveryDeadline ?? o.deadline ?? '')
  const linkedPhase = String(o.linkedPhase ?? o.phase ?? '—')
  const linkedTask = String(o.linkedTask ?? o.task ?? '—')
  const statusRaw = String(o.status ?? 'planned').toLowerCase()
  const status: ProcurementScheduleRow['status'] =
    statusRaw === 'delivered' ? 'delivered' : statusRaw === 'ordered' ? 'ordered' : 'planned'
  if (!material) return null
  return { id, material, procureBy, deliveryDeadline, linkedPhase, linkedTask, status }
}

function parseRecommendation(raw: unknown, idx: number): ProcurementRecommendation | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? `rec-${idx}`)
  const title = String(o.title ?? o.suggestion ?? o.name ?? '').trim()
  const rationale = String(o.rationale ?? o.description ?? o.detail ?? '').trim()
  if (!title) return null
  return { id, title, rationale: rationale || '—' }
}

function parseAlertLine(raw: unknown): string | null {
  if (typeof raw === 'string') return raw.trim() || null
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const text = o.text ?? o.message ?? o.label
    if (typeof text === 'string') return text.trim() || null
  }
  return null
}

export function ProcurementPage() {
  const { masterPlan, project } = useActiveProject()
  const { bom: reportBom, optimizations } = useApprovedReport()
  // prefer masterPlan BOM, fall back to approved report BOM
  const bom = masterPlan?.billOfMaterials ?? reportBom ?? []
  const [materialFilter, setMaterialFilter] = useState<string>('All')
  const [toast, setToast] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const { projects, currentProjectId, setCurrentProjectId } = useProjectsStore()

  const [procurementLoading, setProcurementLoading] = useState(false)
  const [procurementError, setProcurementError] = useState<string | null>(null)
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>([])
  const [procurementSchedule, setProcurementSchedule] = useState<ProcurementScheduleRow[]>([])
  const [procurementRecommendations, setProcurementRecommendations] = useState<ProcurementRecommendation[]>([])
  const [procurementAlerts, setProcurementAlerts] = useState<string[]>([])

  useEffect(() => {
    if (!project?.id) {
      setSupplierQuotes([])
      setProcurementSchedule([])
      setProcurementRecommendations([])
      setProcurementAlerts([])
      setProcurementError(null)
      setProcurementLoading(false)
      return
    }
    let cancelled = false
    setProcurementLoading(true)
    setProcurementError(null)
    fetchWorkspaceProcurement(project.id)
      .then((d) => {
        if (cancelled) return
        setSupplierQuotes(d.quotes.map(parseSupplierQuote).filter((x): x is SupplierQuote => Boolean(x)))
        setProcurementSchedule(d.schedule.map(parseScheduleRow).filter((x): x is ProcurementScheduleRow => Boolean(x)))
        setProcurementRecommendations(
          d.recommendations.map(parseRecommendation).filter((x): x is ProcurementRecommendation => Boolean(x)),
        )
        setProcurementAlerts(d.alerts.map(parseAlertLine).filter((x): x is string => Boolean(x)))
      })
      .catch((e) => {
        if (cancelled) return
        setProcurementError(e instanceof Error ? e.message : 'Could not load procurement data')
        setSupplierQuotes([])
        setProcurementSchedule([])
        setProcurementRecommendations([])
        setProcurementAlerts([])
      })
      .finally(() => {
        if (!cancelled) setProcurementLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [project?.id])

  const projectOptions = useMemo(() => {
    return Object.values(projects)
      .filter((p) => !p.archived)
      .map((p) => ({ id: p.id, name: p.name }))
  }, [projects])

  const materials = useMemo(() => {
    const set = new Set<string>()
    for (const row of bom) row.material && set.add(row.material)
    for (const q of supplierQuotes) set.add(q.material)
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [bom, supplierQuotes])

  const filteredQuotes = useMemo(() => {
    if (materialFilter === 'All') return supplierQuotes
    return supplierQuotes.filter((q) => q.material === materialFilter)
  }, [materialFilter, supplierQuotes])

  const bestByMaterial = useMemo(() => {
    const map = new Map<string, SupplierQuote>()
    const byMat = new Map<string, SupplierQuote[]>()
    for (const q of filteredQuotes) {
      const arr = byMat.get(q.material) ?? []
      arr.push(q)
      byMat.set(q.material, arr)
    }
    for (const [material, arr] of byMat.entries()) {
      const sorted = [...arr].sort((a, b) => (a.unitRate !== b.unitRate ? a.unitRate - b.unitRate : a.leadTimeDays - b.leadTimeDays))
      map.set(material, sorted[0]!)
    }
    return { byMat, best: map }
  }, [filteredQuotes])

  const scheduleRows = useMemo(() => {
    if (materialFilter === 'All') return procurementSchedule
    return procurementSchedule.filter((r) => r.material === materialFilter)
  }, [materialFilter, procurementSchedule])

  // Derive procurement schedule from BOM when API returns nothing
  const derivedSchedule = useMemo((): ProcurementScheduleRow[] => {
    if (!bom.length) return []
    const today = new Date()
    return bom.map((row, i) => {
      const procureBy = new Date(today)
      procureBy.setDate(today.getDate() + 7 + i * 3)
      const deliveryBy = new Date(procureBy)
      deliveryBy.setDate(procureBy.getDate() + 14)
      return {
        id: `bom-${i}`,
        material: row.material,
        procureBy: procureBy.toISOString().slice(0, 10),
        deliveryDeadline: deliveryBy.toISOString().slice(0, 10),
        linkedPhase: 'Structural Works',
        linkedTask: '—',
        status: 'planned' as const,
      }
    })
  }, [bom])

  // Derive recommendations from optimizations when API returns nothing
  const derivedRecommendations = useMemo((): ProcurementRecommendation[] => {
    if (!optimizations.length) return []
    return optimizations.slice(0, 5).map((opt, i) => ({
      id: `opt-${i}`,
      title: opt.suggestion.slice(0, 80),
      rationale: opt.impact ?? 'Value engineering recommendation from planning report',
    }))
  }, [optimizations])

  const summary = useMemo(() => {
    const totalValue = bom.reduce((a, r) => a + (r.totalCost ?? Math.round(r.quantity * r.unitRate)), 0)
    // Use API schedule if available, otherwise derived
    const activeSchedule = scheduleRows.length ? scheduleRows : derivedSchedule
    const pending = activeSchedule.filter((r) => r.status !== 'delivered').length
    const avgLead =
      supplierQuotes.length > 0 ? Math.round(supplierQuotes.reduce((a, q) => a + q.leadTimeDays, 0) / supplierQuotes.length) : 0
    const risk =
      activeSchedule.length === 0 ? '—' : activeSchedule.some((r) => r.status === 'planned') ? 'At Risk' : 'On Track'
    const preferred = bestByMaterial.best.size
    return { totalValue, pending, avgLead, risk, preferred }
  }, [bom, scheduleRows, derivedSchedule, bestByMaterial.best.size, supplierQuotes])

  // Active schedule and recommendations: API first, fall back to derived
  const activeScheduleRows = scheduleRows.length > 0 ? scheduleRows : derivedSchedule
  const activeRecommendations = procurementRecommendations.length > 0 ? procurementRecommendations : derivedRecommendations

  const exportPlan = () => {
    const payload = {
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      version: project?.currentVersionLabel ?? '—',
      filter: materialFilter,
      summary,
      schedule: scheduleRows,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sanrachna_procurement_${payload.projectId ?? 'project'}_${payload.version}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast('Exported procurement plan JSON.')
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
              Procurement {project?.currentVersionLabel ?? '—'}
            </span>
            <span className="text-xs text-[color:var(--color-text_secondary)]">
              Last synced:{' '}
              {procurementLoading
                ? 'Loading procurement…'
                : masterPlan
                  ? 'Plan BOM + procurement API'
                  : procurementError
                    ? 'Procurement API error'
                    : 'Procurement API'}
            </span>
            {isDirty ? (
              <span className="rounded-full bg-[color:var(--color-warning)]/12 px-3 py-1 text-xs font-semibold text-[color:var(--color-warning)]">
                Overrides pending
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportPlan}>
              <Download className="size-4" />
              Export Procurement Plan
            </Button>
          </div>
        </div>
      </Card>

      <ProjectContextBanner />

      {procurementError ? (
        <Card className="border-[color:var(--color-error)]/35 bg-[color:var(--color-error)]/5">
          <CardContent className="py-4 text-sm text-[color:var(--color-error)]">{procurementError}</CardContent>
        </Card>
      ) : null}

      {!project ? (
        <Card>
          <CardContent className="py-8 text-sm text-[color:var(--color-text_secondary)]">
            Select a project to load procurement quotes, schedule, and recommendations from the workspace API.
          </CardContent>
        </Card>
      ) : null}

      {/* PROCUREMENT SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total Procurement Value', value: `₹${summary.totalValue.toLocaleString('en-IN')}`, tone: 'bg-[#EEF3FB] ring-[#DBE9F8]' },
          { label: 'Materials Pending', value: String(summary.pending), tone: 'bg-[#E9F7F2] ring-[#CFE8DE]' },
          { label: 'Avg Lead Time', value: `${summary.avgLead} days`, tone: 'bg-[#FFF7E8] ring-[#F6E4BB]' },
          { label: 'Delayed Deliveries Risk', value: summary.risk, tone: 'bg-[#FFEef0] ring-[#F8D8DD]' },
          { label: 'Preferred Suppliers', value: String(summary.preferred), tone: 'bg-[#F8FAFC] ring-[#E2E8F0]' },
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
          {/* Filter row */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold">Supplier filters</div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                  className="h-10 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 text-sm"
                >
                  {materials.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={() => setMaterialFilter('All')}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="size-4 text-[color:var(--color-primary_dark)]" />
                Supplier comparison
              </CardTitle>
              <CardDescription>Material → suggested supplier, price, quality and lead time with override actions.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">Suggested Supplier</th>
                    <th className="px-3 py-2">Price / Unit</th>
                    <th className="px-3 py-2">Quality</th>
                    <th className="px-3 py-2">Lead Time</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {[...bestByMaterial.best.entries()].map(([material, best]) => (
                    <tr key={material} className="hover:bg-[color:var(--color-surface_hover)]/40">
                      <td className="px-3 py-3 font-semibold">{material}</td>
                      <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{best.supplierName}</td>
                      <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                        ₹{best.unitRate.toLocaleString('en-IN')} / {best.unit}
                      </td>
                      <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{best.qualityRating.toFixed(1)} / 5</td>
                      <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 className="size-4 text-[color:var(--color-text_muted)]" />
                          {best.leadTimeDays}d
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-semibold text-slate-700">Suggested</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsDirty(true)
                              setToast('Supplier overridden (demo).')
                              window.setTimeout(() => setToast(null), 2600)
                            }}
                          >
                            Override Supplier
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setToast('Contact supplier (demo).')
                              window.setTimeout(() => setToast(null), 2600)
                            }}
                          >
                            <MessageSquareText className="size-4" />
                            Contact
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bestByMaterial.best.size === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-sm text-[color:var(--color-text_secondary)]">
                        No supplier suggestions for this filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Material-wise Supplier Mapping */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-[color:var(--color-primary_dark)]" />
                Material-wise supplier mapping
              </CardTitle>
              <CardDescription>Grouped view for quick scanning.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {[...bestByMaterial.best.entries()].slice(0, 6).map(([material, best]) => (
                <div key={material} className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                  <div className="text-sm font-semibold">{material}</div>
                  <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                    {best.supplierName} · ₹{best.unitRate.toLocaleString('en-IN')}/{best.unit} · {best.leadTimeDays}d lead
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Procurement Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-[color:var(--color-warning)]" />
                Procurement alerts
              </CardTitle>
              <CardDescription>Warnings to prevent schedule slips.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[color:var(--color-text_secondary)]">
              {procurementAlerts.length ? (
                procurementAlerts.map((a) => (
                  <div key={a} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2">
                    {a}
                  </div>
                ))
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-border)] bg-white px-3 py-6 text-center text-xs">
                  No procurement alerts returned yet. Your backend can populate <span className="font-mono">alerts</span> on the
                  procurement payload.
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="overflow-hidden border-[#d6ece7] bg-[#f2fcf9]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-[color:var(--color-primary_dark)]" />
                AI procurement recommendations
              </CardTitle>
              <CardDescription>Best actions to reduce cost & risk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {activeRecommendations.length ? (
                activeRecommendations.map((r) => (
                  <div key={r.id} className="rounded-[var(--radius-xl)] bg-white px-3 py-2 ring-1 ring-[#dcece9]">
                    <div className="font-semibold">{r.title}</div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{r.rationale}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[var(--radius-xl)] bg-white px-3 py-6 text-center text-xs text-[color:var(--color-text_secondary)] ring-1 ring-[#dcece9]">
                  No recommendations from the API yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BOTTOM FULL WIDTH: Procurement Schedule Timeline (table) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-4 text-[color:var(--color-primary_dark)]" />
            Procurement schedule timeline
          </CardTitle>
          <CardDescription>Required-by dates, lead time, delivery deadline, linked phase/task.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Procurement Start</th>
                <th className="px-3 py-2">Lead Time</th>
                <th className="px-3 py-2">Delivery Deadline</th>
                <th className="px-3 py-2">Linked Phase / Task</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-border)]">
              {activeScheduleRows.map((r) => (
                <tr key={r.id} className="hover:bg-[color:var(--color-surface_hover)]/40">
                  <td className="px-3 py-3 font-semibold">{r.material}</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{formatISO(r.procureBy)}</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                    {(supplierQuotes.find((q) => q.material === r.material)?.leadTimeDays ?? 0)}d
                  </td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">{formatISO(r.deliveryDeadline)}</td>
                  <td className="px-3 py-3 text-[color:var(--color-text_secondary)]">
                    {r.linkedPhase} · {r.linkedTask}
                  </td>
                  <td className="px-3 py-3">
                    {r.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-success)]/12 px-2 py-1 text-xs font-semibold text-[color:var(--color-success)]">
                        <CheckCircle2 className="size-4" />
                        Delivered
                      </span>
                    ) : r.status === 'ordered' ? (
                      <span className="rounded-full bg-[color:var(--color-info)]/10 px-2 py-1 text-xs font-semibold text-[color:var(--color-info)]">
                        Ordered
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-900/5 px-2 py-1 text-xs font-semibold text-slate-700">
                        Planned
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {activeScheduleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-sm text-[color:var(--color-text_secondary)]">
                    No schedule rows for this filter.
                  </td>
                </tr>
              ) : null}
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
