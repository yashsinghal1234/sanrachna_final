import { ArrowRight, Bot, Clock3, TrendingUp, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { isBackendConfigured } from '@/api/http'
import { apiGetProject, apiPatchPlanningInsights, messageFromApiError } from '@/api/projectTeamApi'
import { useAuth } from '@/auth/AuthContext'
import { ProjectContextBanner } from '@/components/ProjectContextBanner'
import { SimulationEmbed } from '@/components/simulation/SimulationEmbed'
import { SimulationScenarioComparisonTable } from '@/components/simulation/SimulationScenarioComparisonTable'
import { SimulationRiskResourcePanel } from '@/components/simulation/SimulationRiskResourcePanel'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useActiveProject } from '@/hooks/useActiveProject'
import { useProjectsStore } from '@/store/useProjectsStore'
import { useTimelineStore } from '@/store/useTimelineStore'

export type InsightTextRow = { id: string; text: string; locked: boolean }

type ProgressRow = { week: string; planned: number; actual: number; gap: number }

export type ProjectInsightsModel = {
  forecastOriginal: string
  forecastedCompletion: string
  delaySummary: string
  confidencePct: number
  topDelayDriverRows: InsightTextRow[]
  progressTrend: ProgressRow[]
  recommendationRows: InsightTextRow[]
  costPlannedVsActual: string
  costForecastFinal: string
  costOverrunRisk: string
  costCategories: string
  blockerRows: InsightTextRow[]
  productivityAvgTasks: string
  productivityCrew: string
  productivityTrade: string
  productivityTrend: string
}

const DEFAULT_PROGRESS: ProgressRow[] = [
  { week: 'W1', planned: 12, actual: 11, gap: 1 },
  { week: 'W2', planned: 21, actual: 18, gap: 3 },
  { week: 'W3', planned: 34, actual: 29, gap: 5 },
  { week: 'W4', planned: 46, actual: 40, gap: 6 },
  { week: 'W5', planned: 58, actual: 52, gap: 6 },
  { week: 'W6', planned: 67, actual: 61, gap: 6 },
]

export const DEFAULT_DELAY_DRIVERS = [
  'Facade elevation — scaffold dependency drift',
  'MEP shaft coordination rework',
  'RFI-138 awaiting structural clarification',
  'Material delay: conduit batch B2',
] as const

const DEFAULT_RECOMMENDATIONS = [
  'Add 6 masons for 3 weeks',
  'Increase daily task pace to 2.4/day',
  'Reorder Task B before Task C',
  'Extend curing overlap by 2 days',
] as const

const DEFAULT_BLOCKERS = [
  '3 RFIs blocking critical path',
  '2 high-severity unresolved issues',
  'Missing MEP shop drawing approval',
  'Material delay: electrical conduits',
] as const

function newRowId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function defaultLockedRows(defaults: readonly string[], idPrefix: string): InsightTextRow[] {
  return defaults.map((text, i) => ({
    id: `${idPrefix}-def-${i}`,
    text,
    locked: true,
  }))
}

function parseInsightRows(
  storedRows: unknown,
  legacyStrings: unknown,
  defaults: readonly string[],
  idPrefix: string,
): InsightTextRow[] {
  if (Array.isArray(storedRows) && storedRows.length > 0) {
    const first = storedRows[0]
    if (first && typeof first === 'object' && first !== null && 'text' in first) {
      return (storedRows as { id?: unknown; text?: unknown; locked?: unknown }[]).map((r) => ({
        id: typeof r.id === 'string' && r.id ? r.id : newRowId(idPrefix),
        text: String(r.text ?? ''),
        locked: Boolean(r.locked),
      }))
    }
  }
  const strings = Array.isArray(legacyStrings) ? legacyStrings.map((x) => String(x)) : []
  if (!strings.length) return defaultLockedRows(defaults, idPrefix)
  return strings.map((text, i) => {
    const locked = i < defaults.length && defaults[i] === text
    return {
      id: locked ? `${idPrefix}-def-${i}` : `${idPrefix}-mig-${i}`,
      text,
      locked,
    }
  })
}

function defaultInsightsModel(): ProjectInsightsModel {
  return {
    forecastOriginal: 'Oct 30, 2026',
    forecastedCompletion: 'Nov 5, 2026',
    delaySummary: 'Delay +6 days',
    confidencePct: 84,
    topDelayDriverRows: defaultLockedRows(DEFAULT_DELAY_DRIVERS, 'delay'),
    progressTrend: DEFAULT_PROGRESS,
    recommendationRows: defaultLockedRows(DEFAULT_RECOMMENDATIONS, 'rec'),
    costPlannedVsActual: '₹8.90 Cr vs ₹9.24 Cr',
    costForecastFinal: '₹9.96 Cr',
    costOverrunRisk: '38%',
    costCategories: 'Facade, Reinforcement Steel, Temporary Works',
    blockerRows: defaultLockedRows(DEFAULT_BLOCKERS, 'blk'),
    productivityAvgTasks: '2.1',
    productivityCrew: '78%',
    productivityTrade: 'Facade',
    productivityTrend: '+6% WoW',
  }
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v : fallback
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return fallback
}

function asProgressTrend(v: unknown, fallback: ProgressRow[]): ProgressRow[] {
  if (!Array.isArray(v)) return fallback
  const rows: ProgressRow[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    rows.push({
      week: asString(o.week, 'W'),
      planned: asNumber(o.planned, 0),
      actual: asNumber(o.actual, 0),
      gap: asNumber(o.gap, 0),
    })
  }
  return rows.length ? rows : fallback
}

function mergeFromStored(raw: unknown): ProjectInsightsModel {
  const base = defaultInsightsModel()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const o = raw as Record<string, unknown>
  return {
    forecastOriginal: asString(o.forecastOriginal, base.forecastOriginal),
    forecastedCompletion: asString(o.forecastedCompletion, base.forecastedCompletion),
    delaySummary: asString(o.delaySummary, base.delaySummary),
    confidencePct: Math.min(100, Math.max(0, asNumber(o.confidencePct, base.confidencePct))),
    topDelayDriverRows: parseInsightRows(o.topDelayDriverRows, o.topDelayDrivers, DEFAULT_DELAY_DRIVERS, 'delay'),
    progressTrend: asProgressTrend(o.progressTrend, base.progressTrend),
    recommendationRows: parseInsightRows(o.recommendationRows, o.recommendations, DEFAULT_RECOMMENDATIONS, 'rec'),
    costPlannedVsActual: asString(o.costPlannedVsActual, base.costPlannedVsActual),
    costForecastFinal: asString(o.costForecastFinal, base.costForecastFinal),
    costOverrunRisk: asString(o.costOverrunRisk, base.costOverrunRisk),
    costCategories: asString(o.costCategories, base.costCategories),
    blockerRows: parseInsightRows(o.blockerRows, o.blockers, DEFAULT_BLOCKERS, 'blk'),
    productivityAvgTasks: asString(o.productivityAvgTasks, base.productivityAvgTasks),
    productivityCrew: asString(o.productivityCrew, base.productivityCrew),
    productivityTrade: asString(o.productivityTrade, base.productivityTrade),
    productivityTrend: asString(o.productivityTrend, base.productivityTrend),
  }
}

function insightsToApiPayload(m: ProjectInsightsModel): Record<string, unknown> {
  return {
    forecastOriginal: m.forecastOriginal,
    forecastedCompletion: m.forecastedCompletion,
    delaySummary: m.delaySummary,
    confidencePct: m.confidencePct,
    topDelayDriverRows: m.topDelayDriverRows,
    topDelayDrivers: m.topDelayDriverRows.map((r) => r.text),
    recommendationRows: m.recommendationRows,
    recommendations: m.recommendationRows.map((r) => r.text),
    blockerRows: m.blockerRows,
    blockers: m.blockerRows.map((r) => r.text),
    progressTrend: m.progressTrend,
    costPlannedVsActual: m.costPlannedVsActual,
    costForecastFinal: m.costForecastFinal,
    costOverrunRisk: m.costOverrunRisk,
    costCategories: m.costCategories,
    productivityAvgTasks: m.productivityAvgTasks,
    productivityCrew: m.productivityCrew,
    productivityTrade: m.productivityTrade,
    productivityTrend: m.productivityTrend,
  }
}

const MONGO_ID_RE = /^[a-f0-9]{24}$/i

export function ProjectInsightsPage() {
  const { role, token } = useAuth()
  const navigate = useNavigate()
  const { projectId, project } = useActiveProject()
  const projectsById = useProjectsStore((s) => s.projects)
  const fetchTimeline = useTimelineStore((s) => s.fetchTimeline)
  const timelineProjectId = useTimelineStore((s) => s.timelineProjectId)

  // Auto-fetch timeline in background so simulation panels get real data
  useEffect(() => {
    if (!projectId) return
    if (timelineProjectId === projectId) return // already loaded
    const name = project?.name ?? projectsById[projectId]?.name ?? 'Project'
    void fetchTimeline(projectId, name)
  }, [projectId, project, projectsById, fetchTimeline, timelineProjectId])

  const [model, setModel] = useState<ProjectInsightsModel>(defaultInsightsModel)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!projectId || !token || !isBackendConfigured() || !MONGO_ID_RE.test(projectId)) {
      setModel(defaultInsightsModel())
      setLoadError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const { project } = await apiGetProject(projectId)
        if (cancelled) return
        const planning = project.planning && typeof project.planning === 'object' ? project.planning : null
        const ins = planning && 'insights' in planning ? (planning as { insights?: unknown }).insights : undefined
        setModel(mergeFromStored(ins))
      } catch (e) {
        if (!cancelled) setLoadError(messageFromApiError(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, token])

  const confidenceW = useMemo(() => `${Math.min(100, Math.max(0, model.confidencePct))}%`, [model.confidencePct])

  const canPersist =
    Boolean(token) && isBackendConfigured() && projectId && MONGO_ID_RE.test(projectId) && role !== 'worker'

  const save = useCallback(async () => {
    if (!canPersist || !projectId) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await apiPatchPlanningInsights(projectId, insightsToApiPayload(model))
      setSaveMsg('Insights saved for this project.')
      window.setTimeout(() => setSaveMsg(null), 2800)
    } catch (e) {
      setLoadError(messageFromApiError(e))
    } finally {
      setSaving(false)
    }
  }, [canPersist, projectId, model])

  const patchRow = useCallback(
    (field: 'topDelayDriverRows' | 'recommendationRows' | 'blockerRows', id: string, text: string) => {
      setModel((m) => ({
        ...m,
        [field]: m[field].map((r) => (r.id === id && !r.locked ? { ...r, text } : r)),
      }))
    },
    [],
  )

  const addRow = useCallback((field: 'topDelayDriverRows' | 'recommendationRows' | 'blockerRows', prefix: string) => {
    setModel((m) => ({
      ...m,
      [field]: [...m[field], { id: newRowId(prefix), text: 'New item', locked: false }],
    }))
  }, [])

  if (role === 'worker') {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Project Intelligence</h1>
        <p className="text-sm text-[color:var(--color-text_secondary)]">
          This page is available to engineer and owner roles. Switch roles from login to continue.
        </p>
      </div>
    )
  }

  const pageTitle = role === 'owner' ? 'Project Insights' : 'Project Intelligence'
  const viewSource =
    projectId && token && isBackendConfigured() && MONGO_ID_RE.test(projectId)
      ? 'Showing saved project insights from the database.'
      : 'Showing demo values. Connect the API and pick a project to load saved insights.'

  return (
    <div className="space-y-6">
      <ProjectContextBanner />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            {role === 'owner'
              ? 'Executive forecasting and strategic levers.'
              : 'Operational intelligence with simulation + dependency impact previews.'}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-text_muted)]">{viewSource}</p>
          {loadError ? <p className="mt-2 text-sm text-[color:var(--color-error)]">{loadError}</p> : null}
          {loading ? <p className="mt-1 text-xs text-[color:var(--color-text_muted)]">Loading insights…</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPersist ? (
            <Button variant="primary" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save insights'}
            </Button>
          ) : null}
          {saveMsg ? <span className="text-sm text-[color:var(--color-success)]">{saveMsg}</span> : null}
          <Button variant="outline" onClick={() => navigate('/app/timeline')}>
            Open Timeline
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
      <SimulationEmbed context="project-insights" />
      <Card className="overflow-hidden border-[#d6ece7] bg-[#f2fcf9]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[color:var(--color-primary_dark)]" />
                Delay Forecast Engine
              </CardTitle>
              <CardDescription>
                Template delay drivers are read-only. Use Add row for your own entries (stable row ids keep the cursor while typing).
              </CardDescription>
            </div>
            <Button variant="secondary" onClick={() => navigate('/app/timeline')}>
              View Recovery Plan
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9]">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Original Completion Date</div>
              <p className="mt-1 text-lg font-bold text-[color:var(--color-text)]">{model.forecastOriginal}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9]">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Forecasted Completion Date</div>
              <p className="mt-1 text-lg font-bold text-[color:var(--color-text)]">{model.forecastedCompletion}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9]">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Delay / Ahead</div>
              <p className="mt-1 text-lg font-bold text-[color:var(--color-warning)]">{model.delaySummary}</p>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9]">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Confidence</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-[color:var(--color-primary)]" style={{ width: confidenceW }} />
                </div>
                <span className="text-sm font-semibold">{model.confidencePct}%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">TASKS CAUSING DELAY</div>
            <ul className="mt-2 space-y-2">
              {model.topDelayDriverRows.map((row) => (
                <li
                  key={row.id}
                  className="rounded-[var(--radius-xl)] bg-white px-3 py-2 ring-1 ring-[#dcece9] [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
                >
                  {row.locked ? (
                    <p className="text-sm text-[color:var(--color-text)]">{row.text}</p>
                  ) : (
                    <Input
                      aria-label="Delay driver"
                      value={row.text}
                      onChange={(e) => patchRow('topDelayDriverRows', row.id, e.target.value)}
                    />
                  )}
                </li>
              ))}
            </ul>
            <Button type="button" variant="secondary" className="mt-2" onClick={() => addRow('topDelayDriverRows', 'delay')}>
              Add row
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <SimulationScenarioComparisonTable />
          <Card>
            <CardHeader>
              <CardTitle>Planned vs Actual Progress</CardTitle>
              <CardDescription>Progress %, gap %, and trend over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={model.progressTrend}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
                  <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip
                    formatter={(v, name) => [`${v}%`, name]}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                  />
                  <Line type="monotone" dataKey="planned" stroke="#94A3B8" strokeWidth={2} dot={false} name="Planned %" />
                  <Line type="monotone" dataKey="actual" stroke="#2FBFAD" strokeWidth={3} dot={{ r: 3 }} name="Actual %" />
                  <Line type="monotone" dataKey="gap" stroke="#ef4444" strokeWidth={2} dot={false} name="Gap %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="size-4 text-[color:var(--color-primary_dark)]" />
                  AI Recovery Recommendations
                </CardTitle>
                <CardDescription>Template lines are read-only; add your own rows below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {model.recommendationRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[color:var(--color-text)] [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
                  >
                    {row.locked ? (
                      <p>{row.text}</p>
                    ) : (
                      <Input
                        aria-label="Recommendation"
                        value={row.text}
                        onChange={(e) => patchRow('recommendationRows', row.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => addRow('recommendationRows', 'rec')}>
                  Add row
                </Button>
                <Button variant="secondary" onClick={() => navigate('/app/chatbot?prompt=Generate recovery plan for current delay')}>
                  Ask Copilot for full plan
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Forecast Snapshot</CardTitle>
                <CardDescription>Operational cost outlook from project data; values are read-only here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Planned Spend vs Actual Spend</div>
                  <p className="mt-1 font-semibold text-[color:var(--color-text)]">{model.costPlannedVsActual}</p>
                </div>
                <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Forecast Final Cost</div>
                  <p className="mt-1 font-semibold text-[color:var(--color-text)]">{model.costForecastFinal}</p>
                </div>
                <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Overrun Risk</div>
                  <p className="mt-1 font-semibold text-[color:var(--color-warning)]">{model.costOverrunRisk}</p>
                </div>
                <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Over-budget Categories</div>
                  <p className="mt-1 text-[color:var(--color-text)]">{model.costCategories}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <SimulationRiskResourcePanel />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert className="size-4 text-[color:var(--color-warning)]" />
                Blockers & Risk Signals
              </CardTitle>
              <CardDescription>Template lines are read-only; add your own rows below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {model.blockerRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[color:var(--color-text)] [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
                >
                  {row.locked ? (
                    <p>{row.text}</p>
                  ) : (
                    <Input
                      aria-label="Blocker"
                      value={row.text}
                      onChange={(e) => patchRow('blockerRows', row.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
              <Button type="button" variant="secondary" onClick={() => addRow('blockerRows', 'blk')}>
                Add row
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4 text-[color:var(--color-info)]" />
                Productivity Insights
              </CardTitle>
              <CardDescription>Team-level operational analytics from project data; values are read-only here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Avg Tasks / Day</div>
                <p className="mt-1 text-xl font-bold text-[color:var(--color-text)]">{model.productivityAvgTasks}</p>
              </div>
              <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Crew Efficiency</div>
                <p className="mt-1 text-xl font-bold text-[color:var(--color-text)]">{model.productivityCrew}</p>
              </div>
              <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Most Delayed Trade</div>
                <p className="mt-1 text-xl font-bold text-[color:var(--color-text)]">{model.productivityTrade}</p>
              </div>
              <div className="block rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
                <div className="text-xs text-[color:var(--color-text_secondary)]">Productivity Trend</div>
                <p className="mt-1 text-xl font-bold text-[color:var(--color-success)]">{model.productivityTrend}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:var(--color-border)]">
            <CardContent className="pt-4 text-xs text-[color:var(--color-text_secondary)]">
              This page is intentionally summary + analysis focused. Execution tables and full trackers remain in Dashboard, Timeline, Issues, RFI and Daily Logs pages.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
