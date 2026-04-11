import { useMemo } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useTimelineSimulationStore } from '@/store/useTimelineSimulationStore'
import { formatINR } from '@/utils/format'

function fmtDate(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function SimulationScenarioComparisonTable() {
  const { params, getPreview } = useTimelineSimulationStore()
  const preview = useMemo(() => getPreview(), [params, getPreview])
  const impact = preview?.impact

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Comparison</CardTitle>
        <CardDescription>Before vs after simulation, using shared global scenario state.</CardDescription>
      </CardHeader>
      <CardContent>
        {!impact ? (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
            Loading scenario…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Delta</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              <TableRow>
                <TableCell className="font-semibold">Finish date</TableCell>
                <TableCell>{fmtDate(impact.before.finishDate)}</TableCell>
                <TableCell>{fmtDate(impact.after.finishDate)}</TableCell>
                <TableCell className="font-semibold">
                  {impact.scheduleDeltaDays >= 0 ? '+' : ''}
                  {impact.scheduleDeltaDays}d
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Final cost</TableCell>
                <TableCell>{formatINR(impact.before.finalCostInr)}</TableCell>
                <TableCell>{formatINR(impact.after.finalCostInr)}</TableCell>
                <TableCell className="font-semibold">
                  {impact.costDeltaInr >= 0 ? '+' : ''}
                  {formatINR(impact.costDeltaInr)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Delay risk</TableCell>
                <TableCell>{impact.before.delayRiskPct}%</TableCell>
                <TableCell>{impact.after.delayRiskPct}%</TableCell>
                <TableCell className="font-semibold">
                  {impact.after.delayRiskPct - impact.before.delayRiskPct >= 0 ? '+' : ''}
                  {impact.after.delayRiskPct - impact.before.delayRiskPct}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">ROI</TableCell>
                <TableCell>—</TableCell>
                <TableCell>{impact.roiPct}%</TableCell>
                <TableCell>—</TableCell>
              </TableRow>
            </tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

