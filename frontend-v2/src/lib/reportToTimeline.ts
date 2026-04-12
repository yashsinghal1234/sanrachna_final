/**
 * reportToTimeline.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts a PlanningReport's timeline phases + milestones into a
 * ProjectTimeline filled with GanttTask entries.
 *
 * Called by TimelinePage when the timeline store has no saved tasks, to
 * bootstrap the Gantt from the approved deterministic report.
 */

import type { PlanningReport } from '@/types/planning.types'
import type { GanttTask, Phase, ProjectTimeline } from '@/types/timeline.types'

function newId(prefix = 'rt') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

const PHASE_MAP: Record<string, Phase> = {
  Foundation: 'Foundation',
  Substructure: 'Substructure',
  Superstructure: 'Superstructure',
  MEP: 'MEP',
  Finishing: 'Finishing',
  Handover: 'Handover',
  // fallback aliases
  Structure: 'Substructure',
  Electrical: 'MEP',
  Plumbing: 'MEP',
}

function toPhase(name: string): Phase {
  return PHASE_MAP[name] ?? 'Finishing'
}

export function reportToTimeline(
  report: PlanningReport,
  projectId: string,
  projectName: string,
): ProjectTimeline {
  const now = new Date()
  let cursor = new Date(now)
  const tasks: GanttTask[] = []

  for (const phase of report.timeline.phases) {
    const phaseDays = Math.round(phase.months * 30.5)
    const phaseStart = new Date(cursor)
    const phaseEnd = addDays(cursor, phaseDays)
    const gPhase = toPhase(phase.name)

    // One summary task per phase
    const phaseTaskId = newId('ph')
    tasks.push({
      id: phaseTaskId,
      name: `${phase.name} phase`,
      phase: gPhase,
      startDate: new Date(phaseStart),
      endDate: new Date(phaseEnd),
      durationDays: phaseDays,
      dependsOn: [],
      assignedCrew: 'Crew',
      status: 'not-started',
      percentComplete: 0,
      isCriticalPath: true,
      isMilestone: false,
      baselineStart: new Date(phaseStart),
      baselineEnd: new Date(phaseEnd),
      delayDays: 0,
    })

    // One milestone per phase milestone
    for (const ms of phase.milestones) {
      const msDate = addDays(phaseStart, Math.round(phaseDays * 0.8))
      tasks.push({
        id: newId('ms'),
        name: ms,
        phase: gPhase,
        startDate: new Date(msDate),
        endDate: new Date(msDate),
        durationDays: 0,
        dependsOn: [phaseTaskId],
        assignedCrew: '—',
        status: 'not-started',
        percentComplete: 0,
        isCriticalPath: false,
        isMilestone: true,
        baselineStart: new Date(msDate),
        baselineEnd: new Date(msDate),
        delayDays: 0,
      })
    }

    cursor = phaseEnd
  }

  const totalMonths = report.timeline.totalMonths
  const totalDays = Math.round(totalMonths * 30.5)
  const plannedEnd = addDays(now, totalDays)

  // S-curve: simple linear ramp
  const weeks = Math.max(1, Math.floor(totalDays / 7))
  const sCurveData = Array.from({ length: weeks }, (_, i) => ({
    week: `W${i + 1}`,
    planned: Math.round(((i + 1) / weeks) * 100),
    actual: 0,
  }))

  // Resource timeline from workforcePlan
  const peakWorkers = report.workforcePlan.peakWorkers
  const capacity = Math.round(peakWorkers * 1.2)
  const resourceTimeline = report.workforcePlan.byTrade.map((t, i) => ({
    weekLabel: `W${i + 1}`,
    workers: t.count,
    capacity,
    isOverallocated: t.count > capacity,
    isIdle: t.count === 0,
  }))

  const risks = report.riskForecast.map((r, i) => ({
    id: `risk_${i}`,
    taskName: r.risk.slice(0, 60),
    riskLevel: (r.level === 'High' || r.level === 'Medium' || r.level === 'Low' ? r.level : 'Medium') as import('@/types/timeline.types').RiskLevel,
    description: r.risk,
    delayProbability: r.level === 'High' ? 0.75 : r.level === 'Medium' ? 0.45 : 0.2,
    impactDays: r.level === 'High' ? 14 : r.level === 'Medium' ? 7 : 3,
  }))

  const recoveryActions = report.optimizations.slice(0, 4).map((opt, i) => ({
    id: `rec_${i}`,
    suggestion: opt.suggestion.slice(0, 80),
    impact: opt.impact ?? 'Value engineering opportunity',
    savingDays: 7,
    type: 'other' as const,
  }))

  return {
    projectId,
    projectName,
    version: 'V1',
    status: 'On Track',
    delayDays: 0,
    criticalTaskCount: tasks.filter((t) => t.isCriticalPath).length,
    milestonesRemaining: tasks.filter((t) => t.isMilestone).length,
    scheduleHealthScore: report.executiveSummary.confidencePercent ?? 80,
    plannedCompletionDate: plannedEnd,
    forecastedCompletionDate: plannedEnd,
    lastSynced: now,
    tasks,
    resourceTimeline,
    risks,
    recoveryActions,
    sCurveData,
  }
}
