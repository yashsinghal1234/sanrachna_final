import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTimelineStore } from '@/store/useTimelineStore'

export function ResourceLoadingTimeline() {
  const { timeline } = useTimelineStore()

  const summary = useMemo(() => {
    if (!timeline) return null
    const weeks = timeline.resourceTimeline
    // Guard: empty array causes weeks[0]! to be undefined → crash
    if (!weeks || weeks.length === 0) return null
    const peak = weeks.reduce((m, w) => (w.workers > m.workers ? w : m), weeks[0]!)
    const avg = Math.round(weeks.reduce((a, w) => a + w.workers, 0) / Math.max(1, weeks.length))
    const over = weeks.filter((w) => w.isOverallocated).length
    return { peak, avg, over }
  }, [timeline])

  if (!timeline || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resource loading</CardTitle>
          <CardDescription>No resource data available yet — approve a plan first.</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          <div className="flex h-full items-center justify-center rounded-[var(--radius-2xl)] bg-slate-50 text-sm text-[color:var(--color-text_muted)]">
            Resource data will appear after the schedule is populated.
          </div>
        </CardContent>
      </Card>
    )
  }

  const cap = timeline.resourceTimeline[0]?.capacity ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource loading timeline</CardTitle>
        <CardDescription>Workers vs capacity, with overallocation and idle weeks highlighted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Peak week</div>
            <div className="mt-1 text-xl font-bold">
              {summary.peak.weekLabel} · {summary.peak.workers} workers
            </div>
          </div>
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Average crew</div>
            <div className="mt-1 text-xl font-bold">{summary.avg}</div>
          </div>
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Overallocated weeks</div>
            <div className="mt-1 text-xl font-bold">{summary.over}</div>
          </div>
        </div>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline.resourceTimeline} margin={{ top: 10, right: 16, left: -6, bottom: 0 }}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" />
              <XAxis dataKey="weekLabel" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
              <ReferenceLine y={cap} stroke="#EF4444" strokeDasharray="4 4" />
              <Tooltip
                formatter={(v, k, item: any) => {
                  if (k === 'workers') {
                    const w = item?.payload
                    const tag = w?.isIdle ? ' (idle)' : w?.isOverallocated ? ' (overallocated)' : ''
                    return [`${v} workers${tag}`, 'Workers']
                  }
                  return [String(v), String(k)]
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
                }}
              />
              <Bar dataKey="workers" name="Workers">
                {timeline.resourceTimeline.map((w, i) => (
                  <Cell
                    key={i}
                    fill={w.isIdle ? '#CBD5E1' : w.isOverallocated ? '#F59E0B' : '#2FBFAD'}
                    opacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-text_secondary)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-4 rounded bg-[#2FBFAD]" /> Normal
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-4 rounded bg-[#F59E0B]" /> Overallocated
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-4 rounded bg-[#CBD5E1]" /> Idle
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-6 bg-[#EF4444]" /> Capacity
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
