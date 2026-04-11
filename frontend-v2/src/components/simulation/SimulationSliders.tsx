import { Range } from '@/components/ui/Range'
import type { SimulationParams } from '@/simulation/timelineSimulationEngine'

export function SimulationSliders({
  params,
  onChange,
  variant,
}: {
  params: SimulationParams
  variant: 'owner' | 'engineer'
  onChange: (patch: Partial<SimulationParams>) => void
}) {
  const ownerLimited = variant === 'owner'

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Range
        label="+Workers"
        hint={ownerLimited ? 'Limited control (strategic)' : 'Adjust workforce for recovery scenarios'}
        value={params.workersDelta}
        min={ownerLimited ? 0 : -10}
        max={ownerLimited ? 12 : 30}
        step={1}
        onChange={(v) => onChange({ workersDelta: v })}
      />
      <Range
        label="Budget Adjustment (%)"
        hint={ownerLimited ? 'High-level budget shift' : 'Cost delta applied to forecast'}
        value={params.budgetAdjustmentPct}
        min={ownerLimited ? 0 : -15}
        max={ownerLimited ? 18 : 25}
        step={1}
        onChange={(v) => onChange({ budgetAdjustmentPct: v })}
      />
      <Range
        label="Task Acceleration (%)"
        hint={ownerLimited ? 'Controlled compression' : 'Accelerate durations (overtime/parallelism)'}
        value={params.taskAccelerationPct}
        min={0}
        max={ownerLimited ? 20 : 40}
        step={1}
        onChange={(v) => onChange({ taskAccelerationPct: v })}
      />
    </div>
  )
}

