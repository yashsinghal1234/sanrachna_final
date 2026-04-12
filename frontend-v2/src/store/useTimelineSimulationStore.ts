import { create } from 'zustand'

import { useTimelineStore } from '@/store/useTimelineStore'
import type { GanttTask, ProjectTimeline, ResourceWeek, RiskItem, RecoveryAction } from '@/types/timeline.types'
import { simulateTimelineWhatIf, type SimulationParams, type SimulationResult } from '@/simulation/timelineSimulationEngine'

type SimulationState = {
  params: SimulationParams
  lastAppliedAt: number | null
  baselineSnapshot: ProjectTimeline | null

  setParams: (patch: Partial<SimulationParams>) => void
  resetParams: () => void
  getPreview: () => SimulationResult
  applyToTimeline: () => { ok: boolean; message: string }
  applyRecommendationToTimeline: () => { ok: boolean; message: string }
  resetTimelineToBaseline: () => { ok: boolean; message: string }
}

const defaultParams: SimulationParams = {
  workersDelta: 0,
  budgetAdjustmentPct: 0,
  taskAccelerationPct: 0,
}

/** Build a realistic demo timeline that mirrors the Project Insights page defaults.
 *  Oct 30 2026 planned → Nov 5 2026 forecasted (6-day delay, 84% confidence). */
function makeDemoTimeline(): ProjectTimeline {
  const planned = new Date(2026, 9, 30)  // Oct 30 2026
  const forecasted = new Date(2026, 10, 5) // Nov 5 2026

  function makeTask(
    id: string,
    name: string,
    phase: GanttTask['phase'],
    startOffset: number,
    durationDays: number,
    isCriticalPath: boolean,
    status: GanttTask['status'] = 'in-progress',
    dependsOn: string[] = [],
  ): GanttTask {
    const start = new Date(planned)
    start.setDate(start.getDate() - 180 + startOffset)
    const end = new Date(start)
    end.setDate(end.getDate() + durationDays)
    const baselineEnd = new Date(end)
    baselineEnd.setDate(baselineEnd.getDate() - (isCriticalPath ? 6 : 0))
    return {
      id,
      name,
      phase,
      startDate: start,
      endDate: end,
      durationDays,
      dependsOn,
      assignedCrew: 'Crew A',
      status,
      percentComplete: status === 'completed' ? 100 : status === 'in-progress' ? 60 : 0,
      isCriticalPath,
      isMilestone: false,
      baselineStart: new Date(start),
      baselineEnd,
      delayDays: isCriticalPath ? 6 : 0,
    }
  }

  const tasks: GanttTask[] = [
    makeTask('t1', 'Foundation works', 'Foundation', 0, 28, false, 'completed'),
    makeTask('t2', 'Substructure concrete', 'Substructure', 28, 35, false, 'completed', ['t1']),
    makeTask('t3', 'Superstructure — slab L1', 'Superstructure', 63, 21, true, 'completed', ['t2']),
    makeTask('t4', 'Superstructure — slab L2', 'Superstructure', 84, 21, true, 'in-progress', ['t3']),
    makeTask('t5', 'Facade elevation — scaffold dependency drift', 'Finishing', 105, 45, true, 'in-progress', ['t4']),
    makeTask('t6', 'MEP shaft coordination rework', 'MEP', 105, 30, false, 'in-progress', ['t4']),
    makeTask('t7', 'RFI-138 awaiting structural clarification', 'Superstructure', 120, 10, true, 'not-started', ['t5']),
    makeTask('t8', 'Material delay: conduit batch B2', 'MEP', 135, 15, false, 'not-started', ['t6']),
    makeTask('t9', 'Finishing & snagging', 'Finishing', 150, 20, false, 'not-started', ['t5', 't6']),
    makeTask('t10', 'Handover inspection', 'Handover', 170, 7, true, 'not-started', ['t9']),
  ]

  const resourceTimeline: ResourceWeek[] = Array.from({ length: 12 }, (_, i) => ({
    weekLabel: `W${i + 1}`,
    workers: 18 + Math.round(Math.sin(i * 0.7) * 4),
    capacity: 24,
    isOverallocated: false,
    isIdle: false,
  }))

  const risks: RiskItem[] = [
    { id: 'r1', taskName: 'Facade elevation works', riskLevel: 'High', description: 'Scaffold dependency drift', delayProbability: 0.72, impactDays: 6 },
    { id: 'r2', taskName: 'MEP shaft coordination', riskLevel: 'Medium', description: 'Rework risk', delayProbability: 0.45, impactDays: 4 },
    { id: 'r3', taskName: 'RFI-138', riskLevel: 'High', description: 'Awaiting structural clarification', delayProbability: 0.68, impactDays: 5 },
    { id: 'r4', taskName: 'Conduit batch B2', riskLevel: 'Medium', description: 'Material delay', delayProbability: 0.38, impactDays: 3 },
  ]

  const recoveryActions: RecoveryAction[] = [
    { id: 'ra1', suggestion: 'Add 6 masons for 3 weeks', impact: 'Recover ~4 days', savingDays: 4, type: 'add-resource' },
    { id: 'ra2', suggestion: 'Parallelize MEP & Facade', impact: 'Recover ~3 days', savingDays: 3, type: 'parallelize' },
  ]

  const sCurveData = Array.from({ length: 10 }, (_, i) => ({
    week: `W${i + 1}`,
    planned: Math.round((i + 1) * 10),
    actual: Math.round((i + 1) * 10 - Math.min(i * 0.8, 6)),
  }))

  return {
    projectId: 'demo',
    projectName: 'Demo Project',
    version: 'V1',
    status: 'At Risk',
    plannedCompletionDate: planned,
    forecastedCompletionDate: forecasted,
    delayDays: 6,
    criticalTaskCount: 4,
    milestonesRemaining: 1,
    scheduleHealthScore: 74,
    lastSynced: new Date(),
    tasks,
    resourceTimeline,
    risks,
    recoveryActions,
    sCurveData,
  }
}

function safeDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v as string | number)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function cloneDates(tl: ProjectTimeline): ProjectTimeline {
  return {
    ...tl,
    lastSynced: safeDate(tl.lastSynced),
    plannedCompletionDate: safeDate(tl.plannedCompletionDate),
    forecastedCompletionDate: safeDate(tl.forecastedCompletionDate),
    tasks: tl.tasks.map((t) => ({
      ...t,
      startDate: safeDate(t.startDate),
      endDate: safeDate(t.endDate),
      baselineStart: safeDate(t.baselineStart),
      baselineEnd: safeDate(t.baselineEnd),
    })),
    resourceTimeline: tl.resourceTimeline.map((w) => ({ ...w })),
    risks: tl.risks.map((r) => ({ ...r })),
    recoveryActions: tl.recoveryActions.map((a) => ({ ...a })),
    sCurveData: tl.sCurveData.map((p) => ({ ...p })),
  }
}


export const useTimelineSimulationStore = create<SimulationState>((set, get) => ({
  params: defaultParams,
  lastAppliedAt: null,
  baselineSnapshot: null,

  setParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
  resetParams: () => set({ params: defaultParams }),

  getPreview: () => {
    // Use the real loaded timeline if available; fall back to rich demo data so
    // the What-If Simulation and related panels always render (never "Loading…").
    const tl = useTimelineStore.getState().timeline ?? makeDemoTimeline()
    return simulateTimelineWhatIf(tl, get().params)
  },

  applyToTimeline: () => {
    const tl = useTimelineStore.getState().timeline
    if (!tl) return { ok: false, message: 'Open the Timeline page first to load a project schedule, then apply the simulation.' }
    if (!get().baselineSnapshot) set({ baselineSnapshot: cloneDates(tl) })
    const res = simulateTimelineWhatIf(tl, get().params)
    useTimelineStore.getState().setTimeline(res.simulatedTimeline)
    set({ lastAppliedAt: Date.now() })
    return { ok: true, message: 'Applied simulation to Timeline.' }
  },

  applyRecommendationToTimeline: () => {
    const tl = useTimelineStore.getState().timeline
    if (!tl) return { ok: false, message: 'Open the Timeline page first to load a project schedule.' }
    if (!get().baselineSnapshot) set({ baselineSnapshot: cloneDates(tl) })
    const rec = simulateTimelineWhatIf(tl, defaultParams).impact.recommendation.params
    set({ params: rec })
    const res = simulateTimelineWhatIf(tl, rec)
    useTimelineStore.getState().setTimeline(res.simulatedTimeline)
    set({ lastAppliedAt: Date.now() })
    return { ok: true, message: 'Applied recommendation to Timeline.' }
  },

  resetTimelineToBaseline: () => {
    const base = get().baselineSnapshot
    if (!base) return { ok: false, message: 'No baseline snapshot available.' }
    useTimelineStore.getState().setTimeline(cloneDates(base))
    set({ params: defaultParams, lastAppliedAt: Date.now(), baselineSnapshot: null })
    return { ok: true, message: 'Reset Timeline to baseline.' }
  },
}))
