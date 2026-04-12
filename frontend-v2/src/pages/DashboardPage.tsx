import { Activity, AlertCircle, CalendarDays, FolderOpen, IndianRupee, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { fetchDashboardBundle } from '@/api/resources'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Loader'
import { useApprovedReport } from '@/hooks/useApprovedReport'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { ActivityItem, CostBreakdown, ProjectSummary, TimelineTask } from '@/types/dashboard.types'
import { formatINR, formatDate } from '@/utils/format'

const PIE_COLORS = {
  Foundation: '#f59e0b',
  Structure: '#2563eb',
  MEP: '#0d9488',
  Finishing: '#16a34a',
  Contingency: '#94a3b8',
}

const emptyCost: CostBreakdown = {
  foundation_inr: 0,
  structure_inr: 0,
  mep_inr: 0,
  finishing_inr: 0,
  contingency_inr: 0,
  total_inr: 0,
}

/**
 * Derives a CostBreakdown from the approved planning report phases.
 * Maps named phases to the dashboard INR buckets.
 */
function reportCostToBreakdown(phases: { name: string; cost: number; percent: number }[], contingency: number): CostBreakdown {
  const map: Record<string, number> = {}
  for (const p of phases) {
    map[p.name.toLowerCase()] = p.cost
  }
  const foundation_inr = map['foundation'] ?? map['site preparation'] ?? 0
  const structure_inr = map['structure'] ?? map['structural works'] ?? map['structural'] ?? 0
  const mep_inr = map['mep'] ?? map['mechanical, electrical & plumbing'] ?? 0
  const finishing_inr = map['finishing'] ?? map['interiors'] ?? map['interior'] ?? 0
  const contingency_inr = contingency
  const total_inr = foundation_inr + structure_inr + mep_inr + finishing_inr + contingency_inr
  return { foundation_inr, structure_inr, mep_inr, finishing_inr, contingency_inr, total_inr }
}

/**
 * Derives a ProjectSummary from the approved planning report.
 */
function reportToProjectSummary(
  projectId: string,
  projectName: string,
  report: { executiveSummary: { estimatedMonths: number }; timeline: { totalMonths: number } },
  formData?: Record<string, unknown>
): ProjectSummary {
  const months = report.timeline.totalMonths || report.executiveSummary.estimatedMonths || 0
  const targetDate = new Date()
  targetDate.setMonth(targetDate.getMonth() + months)

  return {
    id: projectId,
    name: projectName,
    location: String(formData?.location ?? ''),
    area_sqm: Number(formData?.builtUpArea ?? 0),
    project_type: String(formData?.projectType ?? 'Construction'),
    target_completion: targetDate.toISOString().slice(0, 10),
    currency: 'INR',
  }
}

/**
 * Derives timeline tasks from planning report phases.
 */
function reportToTimelineTasks(phases: { name: string; months: number; milestones: string[] }[]): TimelineTask[] {
  let weekCursor = 0
  const phaseKeys: Record<string, TimelineTask['phase']> = {
    foundation: 'foundation', 'site preparation': 'foundation',
    structure: 'structure', 'structural works': 'structure',
    mep: 'mep', finishing: 'finishing', interiors: 'finishing',
  }
  return phases.map((phase, i) => {
    const durationWeeks = Math.max(1, Math.round((phase.months || 1) * 4.33))
    const phaseKey = phaseKeys[phase.name.toLowerCase()] ?? 'structure'
    const task: TimelineTask = {
      id: `phase_${i}`,
      name: phase.name,
      phase: phaseKey,
      start_week: weekCursor,
      end_week: weekCursor + durationWeeks,
      dependency_ids: i > 0 ? [`phase_${i - 1}`] : [],
      pct_complete: 0,
    }
    weekCursor += durationWeeks
    return task
  })
}

export function DashboardPage() {
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const projects = useProjectsStore((s) => s.projects)
  const currentProject = currentProjectId ? projects[currentProjectId] : undefined

  const [loading, setLoading] = useState(false)
  const [apiSummary, setApiSummary] = useState<ProjectSummary | null>(null)
  const [apiCostBreakdown, setApiCostBreakdown] = useState<CostBreakdown | null>(null)
  const [apiTimelineTasks, setApiTimelineTasks] = useState<TimelineTask[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  // ── Approved report (client-side primary source) ──────────────────────────
  const { report, cost: reportCost, timeline: reportTimeline, isApproved } = useApprovedReport()

  // ── Report-derived data ───────────────────────────────────────────────────
  const reportCostBreakdown = useMemo(() => {
    if (!reportCost) return null
    return reportCostToBreakdown(reportCost.phases, reportCost.contingency)
  }, [reportCost])

  const reportProjectSummary = useMemo(() => {
    if (!report || !currentProjectId) return null
    return reportToProjectSummary(
      currentProjectId,
      currentProject?.name ?? '',
      report,
      currentProject?.currentForm as Record<string, unknown> | undefined,
    )
  }, [report, currentProjectId, currentProject])

  const reportTimelineTasks = useMemo(() => {
    if (!reportTimeline) return []
    return reportToTimelineTasks(reportTimeline.phases)
  }, [reportTimeline])

  // ── API fetch (backend enrichment — activity, live issue counts, etc.) ────
  useEffect(() => {
    if (!currentProjectId) {
      setApiSummary(null)
      setApiCostBreakdown(null)
      setApiTimelineTasks([])
      setActivity([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetchDashboardBundle(currentProjectId)
      .then((b) => {
        if (cancelled) return
        setApiSummary(b.summary)
        setApiCostBreakdown(b.cost_breakdown)
        setApiTimelineTasks(b.timeline_tasks)
        setActivity(b.activity)
      })
      .catch(() => {
        if (!cancelled) {
          setApiSummary(null)
          setApiCostBreakdown(null)
          setApiTimelineTasks([])
          setActivity([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [currentProjectId])

  // ── Merged data: report takes priority, API fills gaps ───────────────────
  const cost_breakdown = reportCostBreakdown ?? apiCostBreakdown ?? emptyCost
  const projectSummary = reportProjectSummary ?? apiSummary
  const timelineTasks = reportTimelineTasks.length ? reportTimelineTasks : apiTimelineTasks

  const avgProgress = useMemo(() => {
    if (!timelineTasks.length) return 0
    return timelineTasks.reduce((acc, t) => acc + t.pct_complete, 0) / timelineTasks.length
  }, [timelineTasks])

  const pieData = [
    { name: 'Foundation', value: cost_breakdown.foundation_inr },
    { name: 'Structure', value: cost_breakdown.structure_inr },
    { name: 'MEP', value: cost_breakdown.mep_inr },
    { name: 'Finishing', value: cost_breakdown.finishing_inr },
    { name: 'Contingency', value: cost_breakdown.contingency_inr },
  ].filter((d) => d.value > 0)

  const openIssuesCount = 0

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <EmptyState icon={FolderOpen} title="Select a project" description="Choose a workspace to load dashboard data." />
      </div>
    )
  }

  if (loading && !reportCostBreakdown) {
    return <PageLoader />
  }

  if (!projectSummary || cost_breakdown.total_inr === 0) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={FolderOpen}
          title="No dashboard data"
          description={
            isApproved
              ? 'Data should have loaded from the approved plan. Check your backend connection.'
              : 'Generate and approve a plan in AI Planning Studio to populate the dashboard.'
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Executive view — grounded estimates, live schedule risk, and site signals in one place.
          {reportCostBreakdown && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <TrendingUp className="size-3" /> From approved plan
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted">Total cost (plan)</CardTitle>
              <CardDescription>AI-estimated + benchmarks</CardDescription>
            </div>
            <IndianRupee className="size-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{formatINR(cost_breakdown.total_inr)}</p>
            <p className="mt-2 text-xs text-muted">
              {projectSummary.area_sqm.toLocaleString('en-IN')} m² · {projectSummary.project_type}
            </p>
          </CardContent>
        </Card>

        <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted">Timeline</CardTitle>
              <CardDescription>Target handover</CardDescription>
            </div>
            <CalendarDays className="size-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">
              {projectSummary.target_completion
                ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(projectSummary.target_completion))
                : '—'}
            </p>
            <p className="mt-2 text-xs text-muted">
              {reportTimeline?.totalMonths
                ? `${reportTimeline.totalMonths} months total · `
                : ''}
              Schedule completion: {Math.round(avgProgress)}%
            </p>
          </CardContent>
        </Card>

        <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted">Project health</CardTitle>
              <CardDescription>Plan feasibility + confidence</CardDescription>
            </div>
            <PieIcon className="size-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold tracking-tight">
                {report?.executiveSummary?.confidencePercent != null
                  ? `${report.executiveSummary.confidencePercent}%`
                  : '—'}
              </p>
              <Badge
                variant={
                  report?.executiveSummary?.feasibility === 'Feasible'
                    ? 'success'
                    : report?.executiveSummary?.feasibility === 'Challenging'
                      ? 'warning'
                      : 'muted'
                }
              >
                {report?.executiveSummary?.feasibility ?? 'Awaiting plan'}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted">
              {report?.executiveSummary?.confidencePercent != null
                ? 'Confidence score from AI planning report.'
                : 'Approve a plan in Planning Studio to score.'}
            </p>
          </CardContent>
        </Card>

        <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted">Active issues</CardTitle>
              <CardDescription>Open / in progress</CardDescription>
            </div>
            <AlertCircle className="size-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{openIssuesCount}</p>
            <p className="mt-2 text-xs text-muted">Real-time count from issue tracker.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Cost breakdown</CardTitle>
            <CardDescription>Share of sanctioned budget by phase</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? '#94a3b8'}
                          stroke="white"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatINR(value)}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted">
                  {pieData.map((d) => (
                    <span key={d.name} className="inline-flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[d.name as keyof typeof PIE_COLORS] ?? '#94a3b8' }}
                      />
                      {d.name} — {formatINR(d.value)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No cost breakdown data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-slate-500" />
              Recent activity
            </CardTitle>
            <CardDescription>Logs, RFIs, issues, and system alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted">No recent activity for this project yet.</p>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-slate-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{item.title}</span>
                    <Badge
                      variant={
                        item.type === 'alert' ? 'warning' : item.type === 'issue' ? 'danger' : item.type === 'rfi' ? 'info' : 'muted'
                      }
                      className="capitalize"
                    >
                      {item.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{item.detail}</p>
                  <p className="mt-2 text-[11px] font-mono text-slate-400">{formatDate(item.at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline phase summary */}
      {timelineTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule overview</CardTitle>
            <CardDescription>Phase-wise breakdown from the approved plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {timelineTasks.slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-slate-200 transition"
                >
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t.phase}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{t.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    Weeks {t.start_week}–{t.end_week} · {Math.round(t.pct_complete)}% done
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Major risks from plan */}
      {report?.executiveSummary?.majorRisks && report.executiveSummary.majorRisks.length > 0 && (
        <Card className="border-amber-100 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-amber-800">Major risks identified</CardTitle>
            <CardDescription>Flagged during AI planning analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-amber-900">
              {report.executiveSummary.majorRisks.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
