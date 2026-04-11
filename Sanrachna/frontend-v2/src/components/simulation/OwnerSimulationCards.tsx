import { ArrowRight, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SimulationSliders } from '@/components/simulation/SimulationSliders'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTimelineSimulationStore } from '@/store/useTimelineSimulationStore'
import { formatINR } from '@/utils/format'

function fmtDate(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function OwnerSimulationCards() {
  const { params, setParams, getPreview, applyRecommendationToTimeline, applyToTimeline } = useTimelineSimulationStore()
  const [toast, setToast] = useState<string | null>(null)

  const preview = useMemo(() => getPreview(), [params, getPreview])
  const impact = preview?.impact

  return (
    <Card className="overflow-hidden border-[#d6ece7] bg-[#f2fcf9]">
      {toast ? (
        <div
          role="status"
          className="border-b border-[#d6ece7] bg-white px-4 py-3 text-sm font-semibold text-[color:var(--color-text_secondary)]"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      ) : null}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-[color:var(--color-primary_dark)]" />
          What‑If Simulation (Executive)
        </CardTitle>
        <CardDescription>Strategic forecasting with limited controls. Apply recommendations to sync Timeline instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {impact ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9] transition">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Forecast Finish Date</div>
              <div className="mt-1 text-lg font-bold">{fmtDate(impact.after.finishDate)}</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">Before: {fmtDate(impact.before.finishDate)}</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9] transition">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Forecast Final Cost</div>
              <div className="mt-1 text-lg font-bold">{formatINR(impact.after.finalCostInr)}</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">Before: {formatINR(impact.before.finalCostInr)}</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9] transition">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Delay Risk %</div>
              <div className="mt-1 text-lg font-bold">{impact.after.delayRiskPct}%</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">Before: {impact.before.delayRiskPct}%</div>
            </div>
            <div className="rounded-[var(--radius-xl)] bg-white p-3 ring-1 ring-[#dcece9] transition">
              <div className="text-xs text-[color:var(--color-text_secondary)]">ROI / Cost Impact</div>
              <div className="mt-1 text-lg font-bold">{impact.roiPct}%</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">
                Δ Cost: {impact.costDeltaInr >= 0 ? '+' : ''}
                {formatINR(impact.costDeltaInr)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-white p-4 text-sm text-[color:var(--color-text_secondary)]">
            Loading simulation preview…
          </div>
        )}

        <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">Recommended Fix Summary</div>
              <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">{impact?.recommendation.summary ?? '—'}</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">
                Est. ROI: {impact?.recommendation.estimatedRoiPct ?? '—'}%
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const res = applyRecommendationToTimeline()
                setToast(res.message)
              }}
            >
              Apply Recommendation to Timeline
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
          <div className="text-sm font-bold">Mini simulation controls</div>
          <div className="mt-3">
            <SimulationSliders params={params} onChange={setParams} variant="owner" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const res = applyToTimeline()
                setToast(res.message)
              }}
            >
              Apply Simulation
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

