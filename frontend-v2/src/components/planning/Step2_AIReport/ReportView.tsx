import { CheckCircle2, Download, MessageSquareText, Pencil } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { savePlanningToProject } from '@/planning/syncPlanningProject'
import { usePlanningStore } from '@/store/usePlanningStore'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { PlanningReport, RiskLevel } from '@/types/planning.types'
import { formatINR } from '@/utils/format'
import { cn } from '@/utils/cn'

function ReportSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2 h-36 animate-pulse rounded-[var(--radius-2xl)] bg-[color:var(--color-surface_muted)]" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-[var(--radius-2xl)] bg-[color:var(--color-surface_muted)]" />
      ))}
    </div>
  )
}

function riskVariant(level: RiskLevel): 'danger' | 'warning' | 'success' {
  if (level === 'High') return 'danger'
  if (level === 'Medium') return 'warning'
  return 'success'
}

function feasibilityVariant(f: PlanningReport['executiveSummary']['feasibility']): 'success' | 'warning' | 'danger' {
  if (f === 'Feasible') return 'success'
  if (f === 'Challenging') return 'warning'
  return 'danger'
}

export function ReportView() {
  const formData = usePlanningStore((s) => s.formData)
  const report = usePlanningStore((s) => s.currentReport)
  const reportLoading = usePlanningStore((s) => s.reportLoading)
  const setStep = usePlanningStore((s) => s.setStep)
  const setPendingRevisionPrompt = usePlanningStore((s) => s.setPendingRevisionPrompt)
  const approvePlan = usePlanningStore((s) => s.approvePlan)
  const setReportClear = usePlanningStore((s) => s.setReport)
  const setChatHistory = usePlanningStore((s) => s.setChatHistory)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editConfirmOpen, setEditConfirmOpen] = useState(false)

  if (reportLoading && !report) {
    return <ReportSkeleton />
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[color:var(--color-text_secondary)]">
          Generate a plan from Step 1 to see the AI report here.
        </CardContent>
      </Card>
    )
  }

  const r = report
  const maxMonths = Math.max(...r.timeline.phases.map((p) => p.months), 1)

  return (
    <div id="planning-report-print" className="space-y-3 pb-28">
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{formData.projectName || 'Project plan'}</CardTitle>
              <CardDescription className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>{formData.projectType}</span>
                <span>
                  Built-up {formData.builtUpArea} · Plot {formData.plotArea}
                </span>
                <span>Budget {formatINR(formData.totalBudget)}</span>
                <span>Confidence {r.executiveSummary.confidencePercent}%</span>
              </CardDescription>
            </div>
            <Badge variant={feasibilityVariant(r.executiveSummary.feasibility)}>
              {r.executiveSummary.feasibility}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Executive summary</CardTitle>
            <CardDescription>Feasibility, horizon, and headline risks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                Est. months
              </div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--color-text)]">
                {r.executiveSummary.estimatedMonths}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                Est. cost
              </div>
              <div className="mt-1 text-2xl font-semibold text-[color:var(--color-text)]">
                {formatINR(r.executiveSummary.estimatedCost)}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                Major risks
              </div>
              <ul className="mt-2 list-inside list-disc text-sm text-[color:var(--color-text_secondary)]">
                {r.executiveSummary.majorRisks.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                Key assumptions
              </div>
              <ul className="mt-2 list-inside list-disc text-sm text-[color:var(--color-text_secondary)]">
                {r.executiveSummary.keyAssumptions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Cost overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[color:var(--color-text_muted)]">Total</div>
              <div className="font-semibold">{formatINR(r.costBreakdown.totalCost)}</div>
            </div>
            <div>
              <div className="text-[color:var(--color-text_muted)]">Per sq.ft</div>
              <div className="font-semibold">{formatINR(r.costBreakdown.costPerSqFt)}</div>
            </div>
            <div>
              <div className="text-[color:var(--color-text_muted)]">Contingency</div>
              <div className="font-semibold">{formatINR(r.costBreakdown.contingencyAmount)}</div>
            </div>
            <div className="col-span-2 space-y-2 pt-2">
              {r.costBreakdown.phases.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span>{p.name}</span>
                    <span>{p.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color:var(--color-surface_muted)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--color-primary)]"
                      style={{ width: `${Math.min(100, p.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Phase timeline</CardTitle>
            <CardDescription>Relative duration by phase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.timeline.phases.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex justify-between text-xs font-medium">
                  <span>{p.name}</span>
                  <span>
                    {p.months} mo · {Math.round((p.months / maxMonths) * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[color:var(--color-surface_muted)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--color-info)]"
                    style={{ width: `${(p.months / maxMonths) * 100}%` }}
                  />
                </div>
                <ul className="mt-1 list-inside list-disc text-[11px] text-[color:var(--color-text_muted)]">
                  {p.milestones.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle>Bill of materials</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="overflow-x-auto rounded-xl border border-[color:var(--color-border)]">
              <table className="w-full min-w-[640px] text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {r.billOfMaterials.map((row) => (
                    <TableRow key={row.material}>
                      <TableCell className="font-medium">{row.material}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>{formatINR(row.unitRate)}</TableCell>
                      <TableCell>{formatINR(row.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Workforce</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[color:var(--color-text_muted)]">Total workers</span>
              <span className="font-semibold">{r.workforcePlan.totalWorkers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--color-text_muted)]">Peak</span>
              <span className="font-semibold">{r.workforcePlan.peakWorkers}</span>
            </div>
            <ul className="mt-2 space-y-1 border-t border-[color:var(--color-border)] pt-2">
              {r.workforcePlan.byTrade.map((t) => (
                <li key={`${t.trade}-${t.phase}`} className="flex justify-between text-xs">
                  <span>
                    {t.trade} · {t.phase}
                  </span>
                  <span className="font-semibold">{t.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.equipmentPlan.map((e) => (
              <div key={e.name} className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{e.name}</span>
                  <Badge variant={e.recommendation === 'Buy' ? 'success' : e.recommendation === 'Rent' ? 'info' : 'muted'}>
                    {e.recommendation}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{e.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Risk forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.riskForecast.map((x) => (
              <div
                key={x.risk}
                className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold">{x.risk}</div>
                  <p className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{x.mitigation}</p>
                </div>
                <Badge variant={riskVariant(x.level)}>{x.level}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Optimizations</CardTitle>
            <CardDescription>Tap to open revision chat with a suggested prompt</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {r.optimizations.map((o) => (
              <button
                key={o.suggestion}
                type="button"
                className={cn(
                  'rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-1.5 text-left text-xs font-semibold text-[color:var(--color-text)] shadow-sm transition hover:border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-primary)]/8',
                )}
                onClick={() => {
                  setPendingRevisionPrompt(
                    `${o.suggestion}${o.savingAmount != null ? ` (potential saving ~${formatINR(o.savingAmount)})` : ''}`,
                  )
                  setStep(3)
                }}
              >
                {o.suggestion}
                <span className="mt-0.5 block text-[10px] font-normal text-[color:var(--color-text_muted)]">
                  {o.impact}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Procurement sequence</CardTitle>
            <CardDescription>Order loosely aligned to phases + BOM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.timeline.phases.map((phase, i) => (
              <div key={phase.name} className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                <div className="text-xs font-semibold text-[color:var(--color-text_muted)]">{phase.name}</div>
                <div className="mt-1 text-[color:var(--color-text_secondary)]">
                  {r.billOfMaterials
                    .slice(0, 2)
                    .map((m) => m.material)
                    .join(', ')}
                  {i === r.timeline.phases.length - 1 ? ', snags & handover items' : ', deliveries staged to site'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Assumptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-[color:var(--color-text_secondary)]">
              {r.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {r.revisionSummary ? (
        <Card className="border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest revision</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[color:var(--color-text_secondary)]">{r.revisionSummary}</CardContent>
        </Card>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 border-t border-[color:var(--color-border)] bg-[color:var(--color-header_scrim)] px-1 py-3 backdrop-blur-md print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="bg-[color:var(--color-success)] text-white hover:brightness-95"
            onClick={() => setConfirmOpen(true)}
          >
            <CheckCircle2 className="size-4" />
            Approve plan
          </Button>
          <Button type="button" variant="secondary" onClick={() => setStep(3)}>
            <MessageSquareText className="size-4" />
            Ask AI to revise
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditConfirmOpen(true)}>
            <Pencil className="size-4" />
            Edit inputs
          </Button>
          <Button type="button" variant="outline" className="px-3" aria-label="Download or print" onClick={() => window.print()}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Approve this plan?"
        description="Once approved, downstream modules will be marked populated and the planning flow locks for editing."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[color:var(--color-success)] text-white hover:brightness-95"
              onClick={() => {
                const pid = useProjectsStore.getState().currentProjectId
                if (pid && report) {
                  useProjectsStore.getState().recordApproval(pid, formData, report)
                }
                approvePlan()
                setStep(4)
                if (pid) savePlanningToProject(pid)
                setConfirmOpen(false)
              }}
            >
              Approve & continue
            </Button>
          </>
        }
      />

      <Modal
        open={editConfirmOpen}
        onOpenChange={setEditConfirmOpen}
        title="Edit inputs?"
        description="Editing will require regenerating the plan from Step 1. Continue?"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEditConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const pid = useProjectsStore.getState().currentProjectId
                setReportClear(null)
                setChatHistory([])
                usePlanningStore.setState({ isApproved: false })
                setStep(1)
                if (pid) {
                  useProjectsStore.getState().updatePlanningSession(pid, {
                    formData: usePlanningStore.getState().formData,
                    lastGeneratedReport: null,
                    planningStep: 1,
                    isApproved: false,
                    chatHistory: [],
                  })
                  savePlanningToProject(pid)
                }
                setEditConfirmOpen(false)
              }}
            >
              Continue
            </Button>
          </>
        }
      />
    </div>
  )
}
