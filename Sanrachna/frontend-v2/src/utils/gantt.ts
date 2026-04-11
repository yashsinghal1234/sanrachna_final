import type { TimelineTask } from '@/types/dashboard.types'

const phaseLabel: Record<TimelineTask['phase'], string> = {
  foundation: 'Foundation',
  structure: 'Structure',
  mep: 'MEP',
  finishing: 'Finishing',
}

/** Build Gantt rows: week indices map to calendar from project start */
export function tasksToGanttRows(
  tasks: TimelineTask[],
  projectStart: Date = new Date(2026, 0, 6),
): (string | number | Date | null)[][] {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000

  return tasks.map((t) => {
    const start = new Date(projectStart.getTime() + (t.start_week - 1) * msPerWeek)
    const end = new Date(projectStart.getTime() + t.end_week * msPerWeek)
    return [
      t.id,
      t.name,
      phaseLabel[t.phase],
      start,
      end,
      null,
      t.pct_complete,
      t.dependency_ids.length ? t.dependency_ids.join(',') : null,
    ]
  })
}

export const ganttColumns = [
  { type: 'string', label: 'Task ID' },
  { type: 'string', label: 'Task Name' },
  { type: 'string', label: 'Resource' },
  { type: 'date', label: 'Start Date' },
  { type: 'date', label: 'End Date' },
  { type: 'number', label: 'Duration' },
  { type: 'number', label: 'Percent Complete' },
  { type: 'string', label: 'Dependencies' },
] as const
