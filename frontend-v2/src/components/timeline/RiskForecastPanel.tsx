import { useMemo } from 'react'
import { AlertTriangle, CalendarClock } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTimelineStore } from '@/store/useTimelineStore'
import type { RiskItem, RiskLevel } from '@/types/timeline.types'
import { cn } from '@/utils/cn'

function riskTone(level: RiskLevel) {
  if (level === 'High') return 'bg-[color:var(--color-error)]/10 text-[color:var(--color-error)]'
  if (level === 'Medium') return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function scoreFromRisks(risks: RiskItem[]) {
  if (risks.length === 0) return 0
  const avg = risks.reduce((a, r) => a + r.delayProbability, 0) / risks.length
  return Math.round(avg * 100)
}

function Ring({ value }: { value: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  const tone = pct >= 65 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#22C55E'
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} stroke="#E2E8F0" strokeWidth="10" fill="none" />
      <circle
        cx="55"
        cy="55"
        r={r}
        stroke={tone}
        strokeWidth="10"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="58" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0F172A">
        {pct}%
      </text>
      <text x="55" y="76" textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748B">
        Delay risk
      </text>
    </svg>
  )
}

export function RiskForecastPanel() {
  const { timeline } = useTimelineStore()

  const riskScore = useMemo(() => scoreFromRisks(timeline?.risks ?? []), [timeline?.risks])

  if (!timeline) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Risk & forecast</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px]">
          <div className="h-full rounded-[var(--radius-2xl)] bg-slate-100" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
          Risk forecast
        </CardTitle>
        <CardDescription>What is likely to delay the schedule next?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-3">
            <div className="text-xs font-semibold text-[color:var(--color-text_secondary)]">Predicted completion</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-bold">
              <CalendarClock className="size-4 text-[color:var(--color-text_muted)]" />
              {formatDate(timeline.forecastedCompletionDate)}
            </div>
            <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
              Variance: <span className="font-semibold text-[color:var(--color-error)]">+{timeline.delayDays}d</span>
            </div>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-2">
            <Ring value={riskScore} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">RISK ITEMS</div>
          {timeline.risks.length === 0 ? (
            <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
              No risks detected.
            </div>
          ) : (
            timeline.risks.map((r) => (
              <div
                key={r.id}
                className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.taskName}</div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{r.description}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-1 text-xs font-semibold', riskTone(r.riskLevel))}>
                    {r.riskLevel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--color-text_secondary)]">
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                    Prob: <span className="font-semibold text-[color:var(--color-text)]">{Math.round(r.delayProbability * 100)}%</span>
                  </div>
                  <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                    Impact: <span className="font-semibold text-[color:var(--color-text)]">{r.impactDays}d</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

