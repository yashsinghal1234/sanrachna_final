import type { ProjectTimeline } from '@/types/timeline.types'

/** Serialize timeline for `PATCH .../planning-timeline` (JSON-safe, dates as ISO strings). */
export function timelineToStoredJson(tl: ProjectTimeline): Record<string, unknown> {
  const iso = (d: Date) => d.toISOString()
  return {
    ...tl,
    lastSynced: iso(tl.lastSynced),
    plannedCompletionDate: iso(tl.plannedCompletionDate),
    forecastedCompletionDate: iso(tl.forecastedCompletionDate),
    tasks: tl.tasks.map((t) => ({
      ...t,
      startDate: iso(t.startDate),
      endDate: iso(t.endDate),
      baselineStart: iso(t.baselineStart),
      baselineEnd: iso(t.baselineEnd),
    })),
  }
}
