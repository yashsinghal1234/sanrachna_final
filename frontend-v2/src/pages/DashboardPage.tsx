import { Activity, AlertCircle, CalendarDays, FolderOpen, IndianRupee, PieChart as PieIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { fetchDashboardBundle } from '@/api/resources'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Loader'
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

export function DashboardPage() {
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
  const [timelineTasks, setTimelineTasks] = useState<TimelineTask[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    if (!currentProjectId) {
      setSummary(null)
      setCostBreakdown(null)
      setTimelineTasks([])
      setActivity([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetchDashboardBundle(currentProjectId)
      .then((b) => {
        if (cancelled) return
        setSummary(b.summary)
        setCostBreakdown(b.cost_breakdown)
        setTimelineTasks(b.timeline_tasks)
        setActivity(b.activity)
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null)
          setCostBreakdown(null)
          setTimelineTasks([])
          setActivity([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentProjectId])

  const cost_breakdown = costBreakdown ?? emptyCost
  const projectSummary = summary

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
  ]

  const openIssuesCount = 0

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <EmptyState icon={FolderOpen} title="Select a project" description="Choose a workspace to load dashboard data from your API." />
      </div>
    )
  }

  if (loading) {
    return <PageLoader />
  }

  if (!projectSummary || !costBreakdown) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={FolderOpen}
          title="No dashboard data"
          description="Your backend should expose GET /api/v1/workspaces/:id/dashboard with summary, cost_breakdown, resources, timeline_tasks, and activity."
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
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted">Total cost (plan)</CardTitle>
              <CardDescription>Validated JSON + benchmarks</CardDescription>
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
              {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(projectSummary.target_completion))}
            </p>
            <p className="mt-2 text-xs text-muted">Schedule completion across tasks: {Math.round(avgProgress)}%</p>
          </CardContent>
        </Card>

        <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium text-muted">Project health</CardTitle>
              <CardDescription>Composite score from your API</CardDescription>
            </div>
            <PieIcon className="size-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold tracking-tight">—</p>
              <Badge variant="muted">Awaiting signals</Badge>
            </div>
            <p className="mt-2 text-xs text-muted">Wire health scoring in the dashboard endpoint response.</p>
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
            <p className="mt-2 text-xs text-muted">Populated when the dashboard payload includes issue counts.</p>
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]}
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
                  <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[d.name as keyof typeof PIE_COLORS] }} />
                  {d.name}
                </span>
              ))}
            </div>
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
              <p className="text-sm text-muted">No recent activity returned for this project.</p>
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
    </div>
  )
}
