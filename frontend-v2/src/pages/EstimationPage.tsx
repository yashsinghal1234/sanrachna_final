import { Chart } from 'react-google-charts'
import { useEffect, useMemo, useState } from 'react'

import { fetchDashboardBundle } from '@/api/resources'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Loader'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useProjectsStore } from '@/store/useProjectsStore'
import type { CostBreakdown, ProjectSummary, ResourceLine, TimelineTask } from '@/types/dashboard.types'
import { formatINR } from '@/utils/format'
import { ganttColumns, tasksToGanttRows } from '@/utils/gantt'
import { FolderOpen } from 'lucide-react'

const emptyCost: CostBreakdown = {
  foundation_inr: 0,
  structure_inr: 0,
  mep_inr: 0,
  finishing_inr: 0,
  contingency_inr: 0,
  total_inr: 0,
}

export function EstimationPage() {
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const [loading, setLoading] = useState(false)
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null)
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null)
  const [resources, setResources] = useState<ResourceLine[]>([])
  const [timelineTasks, setTimelineTasks] = useState<TimelineTask[]>([])

  useEffect(() => {
    if (!currentProjectId) {
      setProjectSummary(null)
      setCostBreakdown(null)
      setResources([])
      setTimelineTasks([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetchDashboardBundle(currentProjectId)
      .then((b) => {
        if (cancelled) return
        setProjectSummary(b.summary)
        setCostBreakdown(b.cost_breakdown)
        setResources(b.resources)
        setTimelineTasks(b.timeline_tasks)
      })
      .catch(() => {
        if (!cancelled) {
          setProjectSummary(null)
          setCostBreakdown(null)
          setResources([])
          setTimelineTasks([])
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

  const costCards = useMemo(
    () => [
      { key: 'foundation' as const, label: 'Foundation', amount: cost_breakdown.foundation_inr, color: 'bg-amber-500' },
      { key: 'structure' as const, label: 'Structure', amount: cost_breakdown.structure_inr, color: 'bg-blue-600' },
      { key: 'mep' as const, label: 'MEP', amount: cost_breakdown.mep_inr, color: 'bg-teal-600' },
      { key: 'finishing' as const, label: 'Finishing', amount: cost_breakdown.finishing_inr, color: 'bg-emerald-600' },
    ],
    [cost_breakdown],
  )

  const rows = tasksToGanttRows(timelineTasks)
  const data = useMemo(() => [[...ganttColumns.map((c) => c.label)], ...rows], [rows])

  if (!currentProjectId) {
    return (
      <div className="space-y-8">
        <EmptyState icon={FolderOpen} title="Select a project" description="Estimation data is loaded from your workspace dashboard API." />
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
          title="No estimation data"
          description="Provide GET /api/v1/workspaces/:id/dashboard (or cost-resources) with summary, cost_breakdown, resources, and timeline_tasks."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Estimation</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Itemised plan for <span className="font-medium text-slate-800">{projectSummary.name}</span> — sourced from your backend.
          </p>
        </div>
        <Badge variant="info" className="w-fit">
          API-driven
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {costCards.map((c) => (
          <Card key={c.key} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`h-1 ${c.color}`} />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold tracking-tight">{formatINR(c.amount)}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-slate-900/10 bg-slate-900 text-white shadow-xl transition hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total + contingency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tracking-tight">{formatINR(cost_breakdown.total_inr)}</p>
            <p className="mt-2 text-xs text-slate-300">Includes {formatINR(cost_breakdown.contingency_inr)} contingency envelope</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource plan</CardTitle>
          <CardDescription>Bill-of-quantities lines from your API</CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <p className="text-sm text-muted">No resource lines in the current payload.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Benchmark (₹)</TableHead>
                  <TableHead>Extended</TableHead>
                  <TableHead>Hint</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.material}</TableCell>
                    <TableCell>
                      {r.quantity} {r.unit}
                    </TableCell>
                    <TableCell>{formatINR(r.benchmark_rate_inr)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatINR(r.extended_inr)}</TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted">{r.supplier_hint}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execution timeline</CardTitle>
          <CardDescription>Gantt from timeline_tasks in the dashboard response</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-h-[420px] min-w-[720px]">
            {timelineTasks.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No tasks to chart yet.</p>
            ) : (
              <Chart
                chartType="Gantt"
                width="100%"
                height="400px"
                data={data}
                options={{
                  height: 400,
                  gantt: {
                    trackHeight: 30,
                    barCornerRadius: 4,
                    palette: [
                      { color: '#f59e0b', dark: '#d97706', light: '#fde68a' },
                      { color: '#2563eb', dark: '#1d4ed8', light: '#bfdbfe' },
                      { color: '#0d9488', dark: '#0f766e', light: '#5eead4' },
                      { color: '#16a34a', dark: '#15803d', light: '#bbf7d0' },
                    ],
                  },
                  backgroundColor: 'transparent',
                }}
                loader={
                  <div className="flex h-[400px] items-center justify-center text-sm text-muted">Rendering schedule…</div>
                }
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
