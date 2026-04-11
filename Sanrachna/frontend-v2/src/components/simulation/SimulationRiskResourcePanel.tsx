import { useMemo } from 'react'
import { AlertTriangle, Users } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTimelineSimulationStore } from '@/store/useTimelineSimulationStore'

export function SimulationRiskResourcePanel() {
  const { params, getPreview } = useTimelineSimulationStore()
  const preview = useMemo(() => getPreview(), [params, getPreview])
  const impact = preview?.impact

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
          Predictive Risk Analysis
        </CardTitle>
        <CardDescription>Scenario-adjusted risk and bottlenecks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!impact ? (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-[color:var(--color-text_secondary)]">
            Loading…
          </div>
        ) : (
          <>
            <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
              <div className="text-xs text-[color:var(--color-text_secondary)]">Delay Risk (After)</div>
              <div className="mt-1 text-xl font-bold">{impact.after.delayRiskPct}%</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_muted)]">Before: {impact.before.delayRiskPct}%</div>
            </div>

            <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-[color:var(--color-text_secondary)]">Crew utilization</div>
                  <div className="mt-1 text-xl font-bold">{impact.crewUtilizationPct}%</div>
                </div>
                <Users className="size-5 text-[color:var(--color-text_muted)]" />
              </div>
              {impact.bottlenecks.length ? (
                <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                  Top bottleneck: <span className="font-semibold text-[color:var(--color-text)]">{impact.bottlenecks[0]!.weekLabel}</span> (+{impact.bottlenecks[0]!.overBy})
                </div>
              ) : (
                <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">No over-allocation in this scenario.</div>
              )}
            </div>

            <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-bg)] p-3">
              <div className="text-xs text-[color:var(--color-text_secondary)]">AI Optimization Recommendation</div>
              <div className="mt-1 font-semibold">{impact.recommendation.title}</div>
              <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{impact.recommendation.summary}</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

