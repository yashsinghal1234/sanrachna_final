import { RotateCcw, Wand2 } from 'lucide-react'
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

export function EngineerSimulationWorkspace() {
  const { params, setParams, getPreview, applyToTimeline, resetTimelineToBaseline } = useTimelineSimulationStore()
  const [toast, setToast] = useState<string | null>(null)

  const preview = useMemo(() => getPreview(), [params, getPreview])
  const impact = preview?.impact

  return (
    <Card>
      {toast ? (
        <div role="status" className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-3 text-sm font-semibold" onClick={() => setToast(null)}>
          {toast}
        </div>
      ) : null}
      <CardHeader>
        <CardTitle>What‑If Simulation Workspace</CardTitle>
        <CardDescription>Operational controls with dependency + utilization previews. Apply updates to sync Timeline immediately.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SimulationSliders params={params} onChange={setParams} variant="engineer" />

        {impact ? (
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4 transition">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">FORECAST</div>
                  <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">
                    Finish: <span className="font-bold text-[color:var(--color-text)]">{fmtDate(impact.after.finishDate)}</span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    Final cost: <span className="font-bold text-[color:var(--color-text)]">{formatINR(impact.after.finalCostInr)}</span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    Delay risk: <span className="font-bold text-[color:var(--color-text)]">{impact.after.delayRiskPct}%</span>
                  </div>
                </div>
                <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4 transition">
                  <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">IMPACT</div>
                  <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">
                    Schedule Δ: <span className="font-bold text-[color:var(--color-text)]">{impact.scheduleDeltaDays >= 0 ? '+' : ''}{impact.scheduleDeltaDays}d</span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    Critical path Δ: <span className="font-bold text-[color:var(--color-text)]">{impact.criticalPathDeltaDays >= 0 ? '+' : ''}{impact.criticalPathDeltaDays}d</span>
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                    Crew utilization: <span className="font-bold text-[color:var(--color-text)]">{impact.crewUtilizationPct}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">DEPENDENCY IMPACT PREVIEW</div>
                {impact.dependencyImpacts.length === 0 ? (
                  <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">No dependency-pushed starts detected.</div>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {impact.dependencyImpacts.slice(0, 6).map((d) => (
                      <li key={d.taskId} className="flex items-center justify-between rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                        <span className="min-w-0 truncate font-semibold">{d.taskName}</span>
                        <span className="shrink-0 text-[color:var(--color-warning)]">+{d.pushedStartByDays}d</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">TASK COMPRESSION (TOP)</div>
                {impact.taskCompressionTop.length === 0 ? (
                  <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">No tasks compressed with current settings.</div>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {impact.taskCompressionTop.map((t) => (
                      <li key={t.taskId} className="flex items-center justify-between rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                        <span className="min-w-0 truncate font-semibold">{t.taskName}</span>
                        <span className="shrink-0 text-[color:var(--color-success)]">−{t.savedDays}d</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">BOTTLENECK BREAKDOWN</div>
                {impact.bottlenecks.length === 0 ? (
                  <div className="mt-2 text-sm text-[color:var(--color-text_secondary)]">No capacity overruns with this scenario.</div>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {impact.bottlenecks.map((b) => (
                      <li key={b.weekLabel} className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{b.weekLabel}</span>
                          <span className="text-[color:var(--color-error)]">+{b.overBy}</span>
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                          Workers: {b.workers} / {b.capacity}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
                <div className="text-xs font-semibold tracking-widest text-[color:var(--color-text_muted)]">ACTIONS</div>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const res = applyToTimeline()
                      setToast(res.message)
                    }}
                  >
                    <Wand2 className="size-4" />
                    Apply to Schedule
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const res = resetTimelineToBaseline()
                      setToast(res.message)
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Reset Simulation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
            Loading simulation preview…
          </div>
        )}
      </CardContent>
    </Card>
  )
}

