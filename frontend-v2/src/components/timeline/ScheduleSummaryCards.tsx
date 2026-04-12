import { useMemo } from 'react'
import { CalendarDays, Flag, HeartPulse, Timer, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/Card'
import { useTimelineStore } from '@/store/useTimelineStore'

function formatDate(d: unknown) {
  try {
    const dt = d instanceof Date ? d : new Date(d as string)
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(dt)
  } catch {
    return String(d).slice(0, 10)
  }
}

export function ScheduleSummaryCards() {
  const { timeline } = useTimelineStore()

  const cards = useMemo(() => {
    if (!timeline) return []
    return [
      {
        label: 'Planned Completion',
        value: formatDate(timeline.plannedCompletionDate),
        icon: CalendarDays,
        tone: 'bg-[#EEF3FB] ring-[#DBE9F8]',
      },
      {
        label: 'Forecasted Completion',
        value: formatDate(timeline.forecastedCompletionDate),
        icon: Timer,
        tone: 'bg-[#E9F7F2] ring-[#CFE8DE]',
      },
      {
        label: 'Schedule Variance',
        value: `${timeline.delayDays >= 0 ? '+' : ''}${timeline.delayDays} days`,
        icon: TrendingUp,
        tone: 'bg-[#FFF7E8] ring-[#F6E4BB]',
      },
      {
        label: 'Critical Tasks',
        value: String(timeline.criticalTaskCount),
        icon: Flag,
        tone: 'bg-[#F2F5FC] ring-[#E1E8F7]',
      },
      {
        label: 'Milestones Remaining',
        value: String(timeline.milestonesRemaining),
        icon: CalendarDays,
        tone: 'bg-[#F8FAFC] ring-[#E2E8F0]',
      },
      {
        label: 'Schedule Health Score',
        value: String(timeline.scheduleHealthScore),
        icon: HeartPulse,
        tone: 'bg-[#FFEef0] ring-[#F8D8DD]',
      },
    ] as const
  }, [timeline])

  if (!timeline) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="mt-2 h-6 w-32 rounded bg-slate-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className={`${c.tone} shadow-none ring-1`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--color-text_secondary)]">{c.label}</div>
              <c.icon className="size-4 text-[color:var(--color-text_muted)]" />
            </div>
            <div className="mt-1 text-xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

