import { create } from 'zustand'

import { useTimelineStore } from '@/store/useTimelineStore'
import type { ProjectTimeline } from '@/types/timeline.types'
import { simulateTimelineWhatIf, type SimulationParams, type SimulationResult } from '@/simulation/timelineSimulationEngine'

type SimulationState = {
  params: SimulationParams
  lastAppliedAt: number | null
  baselineSnapshot: ProjectTimeline | null

  setParams: (patch: Partial<SimulationParams>) => void
  resetParams: () => void
  getPreview: () => SimulationResult | null
  applyToTimeline: () => { ok: boolean; message: string }
  applyRecommendationToTimeline: () => { ok: boolean; message: string }
  resetTimelineToBaseline: () => { ok: boolean; message: string }
}

const defaultParams: SimulationParams = {
  workersDelta: 0,
  budgetAdjustmentPct: 0,
  taskAccelerationPct: 0,
}

function cloneDates(tl: ProjectTimeline): ProjectTimeline {
  return {
    ...tl,
    lastSynced: new Date(tl.lastSynced),
    plannedCompletionDate: new Date(tl.plannedCompletionDate),
    forecastedCompletionDate: new Date(tl.forecastedCompletionDate),
    tasks: tl.tasks.map((t) => ({
      ...t,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
      baselineStart: new Date(t.baselineStart),
      baselineEnd: new Date(t.baselineEnd),
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
    const tl = useTimelineStore.getState().timeline
    if (!tl) return null
    return simulateTimelineWhatIf(tl, get().params)
  },

  applyToTimeline: () => {
    const tl = useTimelineStore.getState().timeline
    if (!tl) return { ok: false, message: 'Timeline not loaded.' }
    if (!get().baselineSnapshot) set({ baselineSnapshot: cloneDates(tl) })
    const res = simulateTimelineWhatIf(tl, get().params)
    useTimelineStore.getState().setTimeline(res.simulatedTimeline)
    set({ lastAppliedAt: Date.now() })
    return { ok: true, message: 'Applied simulation to Timeline.' }
  },

  applyRecommendationToTimeline: () => {
    const tl = useTimelineStore.getState().timeline
    if (!tl) return { ok: false, message: 'Timeline not loaded.' }
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

