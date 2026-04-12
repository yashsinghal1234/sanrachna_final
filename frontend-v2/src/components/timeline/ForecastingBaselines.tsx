import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Phase } from '@/types/timeline.types'
import { useTimelineStore } from '@/store/useTimelineStore'

/** Safely coerce a value that may be a Date or ISO string to a Date. */
function toDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function diffDays(a: unknown, b: unknown) {
  const da = toDate(a)
  const db = toDate(b)
  const one = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime()
  const two = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime()
  return Math.round((two - one) / (24 * 60 * 60 * 1000))
}


const PHASES: Phase[] = ['Foundation', 'Substructure', 'Superstructure', 'MEP', 'Finishing', 'Handover']

export function ForecastingBaselines() {
  const { timeline } = useTimelineStore()

  const phaseBars = useMemo(() => {
    if (!timeline) return []
    return PHASES.map((p) => {
      const inPhase = timeline.tasks.filter((t) => t.phase === p && !t.isMilestone)
      const baseline = inPhase.reduce((a, t) => a + Math.max(0, diffDays(t.baselineStart, t.baselineEnd)), 0)
      const forecast = inPhase.reduce((a, t) => a + Math.max(0, diffDays(t.startDate, t.endDate)), 0)
      return { phase: p, baseline, forecast }
    })
  }, [timeline])

  if (!timeline) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Forecasting baselines</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="h-[360px]">
          <div className="h-full rounded-[var(--radius-2xl)] bg-slate-100" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecasting baselines</CardTitle>
        <CardDescription>S-curve progress + baseline vs forecast by phase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-[260px]">
          <div className="mb-2 text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">PROGRESS S-CURVE</div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline.sCurveData} margin={{ top: 10, right: 16, left: -6, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
              <XAxis dataKey="week" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="planned" stroke="#94A3B8" fill="#CBD5E1" fillOpacity={0.35} name="Planned" />
              <Area type="monotone" dataKey="actual" stroke="#2FBFAD" fill="#99F6E4" fillOpacity={0.25} name="Actual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="h-[280px]">
          <div className="mb-2 text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">BASELINE VS FORECAST</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={phaseBars} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="phase" tick={{ fill: '#334155', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip
                formatter={(v) => (typeof v === 'number' ? `${v} days` : String(v))}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
                }}
              />
              <Legend />
              <Bar dataKey="baseline" name="Baseline (days)" fill="#94A3B8" radius={[8, 8, 8, 8]} />
              <Bar dataKey="forecast" name="Forecast (days)" fill="#F59E0B" radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

