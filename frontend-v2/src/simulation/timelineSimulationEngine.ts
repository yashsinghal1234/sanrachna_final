import type { ProjectTimeline, GanttTask, ResourceWeek } from '@/types/timeline.types'

export type SimulationParams = {
  workersDelta: number
  budgetAdjustmentPct: number
  taskAccelerationPct: number
}

export type SimulationRecommendation = {
  title: string
  summary: string
  params: SimulationParams
  estimatedRoiPct: number
}

export type SimulationImpact = {
  forecastFinishDate: Date
  forecastFinalCostInr: number
  delayRiskPct: number
  before: { finishDate: Date; finalCostInr: number; delayRiskPct: number }
  after: { finishDate: Date; finalCostInr: number; delayRiskPct: number }
  roiPct: number
  costDeltaInr: number
  scheduleDeltaDays: number
  criticalPathDeltaDays: number
  dependencyImpacts: { taskId: string; taskName: string; pushedStartByDays: number }[]
  bottlenecks: { weekLabel: string; workers: number; capacity: number; overBy: number }[]
  crewUtilizationPct: number
  taskCompressionTop: { taskId: string; taskName: string; savedDays: number }[]
  recommendation: SimulationRecommendation
}

export type SimulationResult = {
  simulatedTimeline: ProjectTimeline
  impact: SimulationImpact
}

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function diffDays(a: Date, b: Date) {
  const one = dayStart(a).getTime()
  const two = dayStart(b).getTime()
  return Math.round((two - one) / (24 * 60 * 60 * 1000))
}

function addDays(d: Date, days: number) {
  const dt = dayStart(d)
  dt.setDate(dt.getDate() + days)
  return dt
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function mean(nums: number[]) {
  if (!nums.length) return 0
  return nums.reduce((a, v) => a + v, 0) / nums.length
}

function maxDate(ds: Date[]) {
  return ds.reduce((m, d) => (d.getTime() > m.getTime() ? d : m), ds[0] ?? new Date())
}

function topoOrder(tasks: GanttTask[]) {
  const byId = new Map(tasks.map((t) => [t.id, t] as const))
  const indeg = new Map<string, number>()
  const out = new Map<string, string[]>()
  tasks.forEach((t) => {
    indeg.set(t.id, 0)
    out.set(t.id, [])
  })
  tasks.forEach((t) => {
    t.dependsOn.forEach((dep) => {
      if (!byId.has(dep)) return
      indeg.set(t.id, (indeg.get(t.id) ?? 0) + 1)
      out.get(dep)!.push(t.id)
    })
  })
  const q: string[] = []
  indeg.forEach((v, k) => {
    if (v === 0) q.push(k)
  })
  const ordered: GanttTask[] = []
  while (q.length) {
    const id = q.shift()!
    ordered.push(byId.get(id)!)
    for (const nxt of out.get(id) ?? []) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1)
      if ((indeg.get(nxt) ?? 0) === 0) q.push(nxt)
    }
  }
  // cycle fallback: return stable original order
  if (ordered.length !== tasks.length) return tasks
  return ordered
}

function baseCostFromTimeline(tl: ProjectTimeline) {
  // Demo heuristic: treat health score + tasks as proxy for project scale.
  const taskScale = tl.tasks.length * 12_50_000 // ~₹12.5L per task
  const delayPenalty = Math.max(0, tl.delayDays) * 1_80_000
  return taskScale + delayPenalty
}

function computeRiskPct(tl: ProjectTimeline, params: SimulationParams) {
  const base = mean(tl.risks.map((r) => r.delayProbability))
  const accel = clamp(params.taskAccelerationPct, 0, 40) / 100
  const workersBoost = params.workersDelta / Math.max(1, mean(tl.resourceTimeline.map((w) => w.workers)) || 20)
  const adj = clamp(base * (1 - accel * 0.35 - clamp(workersBoost, -0.5, 0.8) * 0.18), 0, 1)
  return Math.round(adj * 100)
}

function applyResourceDelta(weeks: ResourceWeek[], workersDelta: number) {
  return weeks.map((w) => {
    const workers = Math.max(0, Math.round(w.workers + workersDelta))
    const over = workers - w.capacity
    return { ...w, workers, isOverallocated: over > 0, isIdle: workers === 0 }
  })
}

export function simulateTimelineWhatIf(tl: ProjectTimeline, params: SimulationParams): SimulationResult {
  const workersDelta = clamp(Math.round(params.workersDelta), -30, 60)
  const budgetAdjustmentPct = clamp(params.budgetAdjustmentPct, -25, 35)
  const taskAccelerationPct = clamp(params.taskAccelerationPct, 0, 40)

  const normalized: SimulationParams = { workersDelta, budgetAdjustmentPct, taskAccelerationPct }

  const baseCost = baseCostFromTimeline(tl)
  const beforeRisk = computeRiskPct(tl, { workersDelta: 0, budgetAdjustmentPct: 0, taskAccelerationPct: 0 })
  const beforeFinish = tl.forecastedCompletionDate

  const ordered = topoOrder(tl.tasks)
  const byId = new Map(tl.tasks.map((t) => [t.id, t] as const))
  const newById = new Map<string, GanttTask>()

  const avgWorkers = mean(tl.resourceTimeline.map((w) => w.workers)) || 20
  const workersFactor = 1 - clamp((workersDelta / Math.max(1, avgWorkers)) * 0.22, -0.12, 0.32)
  const accelFactor = 1 - clamp((taskAccelerationPct / 100) * 0.55, 0, 0.32)
  const durationFactor = clamp(workersFactor * accelFactor, 0.58, 1.12)

  const depImpacts: SimulationImpact['dependencyImpacts'] = []
  const compressionTop: SimulationImpact['taskCompressionTop'] = []

  for (const t of ordered) {
    const original = byId.get(t.id)!
    if (original.status === 'completed') {
      newById.set(original.id, { ...original })
      continue
    }

    const deps = original.dependsOn.map((id) => newById.get(id)).filter(Boolean) as GanttTask[]
    const depsEnd = deps.length ? maxDate(deps.map((d) => d.endDate)) : null
    const baseStart = dayStart(original.startDate)
    const earliest = depsEnd ? (depsEnd.getTime() > baseStart.getTime() ? depsEnd : baseStart) : baseStart

    const baseDur = Math.max(0, diffDays(original.startDate, original.endDate))
    const nextDur = original.isMilestone ? 0 : Math.max(1, Math.round(baseDur * durationFactor))

    const nextStart = earliest
    const nextEnd = addDays(nextStart, nextDur)

    const pushed = diffDays(baseStart, nextStart)
    if (pushed > 0) depImpacts.push({ taskId: original.id, taskName: original.name, pushedStartByDays: pushed })

    const saved = baseDur - nextDur
    if (saved > 0) compressionTop.push({ taskId: original.id, taskName: original.name, savedDays: saved })

    newById.set(original.id, {
      ...original,
      startDate: nextStart,
      endDate: nextEnd,
      durationDays: nextDur,
      delayDays: Math.max(0, diffDays(original.baselineEnd, nextEnd)),
    })
  }

  compressionTop.sort((a, b) => b.savedDays - a.savedDays)

  const nextTasks = tl.tasks.map((t) => newById.get(t.id) ?? t)
  const finish = maxDate(nextTasks.map((t) => t.endDate))
  const scheduleDeltaDays = diffDays(beforeFinish, finish)

  const criticalBefore = tl.tasks.filter((t) => t.isCriticalPath).reduce((a, t) => a + Math.max(0, diffDays(t.startDate, t.endDate)), 0)
  const criticalAfter = nextTasks.filter((t) => t.isCriticalPath).reduce((a, t) => a + Math.max(0, diffDays(t.startDate, t.endDate)), 0)
  const criticalPathDeltaDays = criticalAfter - criticalBefore

  const nextWeeks = applyResourceDelta(tl.resourceTimeline, workersDelta)
  const utilizationPct = (() => {
    const cap = mean(nextWeeks.map((w) => w.capacity)) || 1
    const use = mean(nextWeeks.map((w) => w.workers))
    return Math.round(clamp((use / cap) * 100, 0, 200))
  })()

  const bottlenecks = nextWeeks
    .map((w) => ({ weekLabel: w.weekLabel, workers: w.workers, capacity: w.capacity, overBy: Math.max(0, w.workers - w.capacity) }))
    .filter((b) => b.overBy > 0)
    .sort((a, b) => b.overBy - a.overBy)
    .slice(0, 6)

  const afterRisk = computeRiskPct(tl, normalized)

  const costDeltaFromWorkers = workersDelta * 2_10_000 * 4 // ~₹2.1L / worker / month (demo)
  const costDeltaFromAccel = (taskAccelerationPct / 100) * 0.06 * baseCost // overtime / rework buffer
  const budgetAdj = (budgetAdjustmentPct / 100) * baseCost
  const finalCost = Math.round(baseCost + costDeltaFromWorkers + costDeltaFromAccel + budgetAdj)

  const roiPct = (() => {
    const timeValue = Math.max(0, -scheduleDeltaDays) * 1_10_000 // demo: ₹1.1L per day earlier
    const invest = Math.max(1, Math.max(0, costDeltaFromWorkers + costDeltaFromAccel + Math.max(0, budgetAdj)))
    return Math.round(clamp((timeValue / invest) * 100, 0, 250))
  })()

  const recommendation: SimulationRecommendation = (() => {
    const wantSave = Math.max(4, Math.min(12, Math.round(tl.delayDays * 0.6)))
    const recWorkers = clamp(Math.round((wantSave / 12) * avgWorkers * 0.25), 0, 18)
    const recAccel = clamp(Math.round((wantSave / 14) * 18), 0, 28)
    const recBudget = clamp(Math.round((recWorkers * 0.8 + recAccel * 0.45)), 0, 18)
    return {
      title: 'Recommended fix',
      summary: `Add ${recWorkers} workers for 4 weeks and accelerate tasks by ${recAccel}% to recover ~${wantSave} days with controlled cost impact.`,
      params: { workersDelta: recWorkers, budgetAdjustmentPct: recBudget, taskAccelerationPct: recAccel },
      estimatedRoiPct: Math.round(clamp(roiPct + 12, 0, 250)),
    }
  })()

  const simulatedTimeline: ProjectTimeline = {
    ...tl,
    tasks: nextTasks,
    forecastedCompletionDate: finish,
    delayDays: Math.max(0, diffDays(tl.plannedCompletionDate, finish)),
    resourceTimeline: nextWeeks,
    status: finish.getTime() > tl.plannedCompletionDate.getTime() ? (finish.getTime() > addDays(tl.plannedCompletionDate, 28).getTime() ? 'Delayed' : 'At Risk') : 'On Track',
  }

  return {
    simulatedTimeline,
    impact: {
      forecastFinishDate: finish,
      forecastFinalCostInr: finalCost,
      delayRiskPct: afterRisk,
      before: { finishDate: beforeFinish, finalCostInr: Math.round(baseCost), delayRiskPct: beforeRisk },
      after: { finishDate: finish, finalCostInr: finalCost, delayRiskPct: afterRisk },
      roiPct,
      costDeltaInr: finalCost - Math.round(baseCost),
      scheduleDeltaDays,
      criticalPathDeltaDays,
      dependencyImpacts: depImpacts.sort((a, b) => b.pushedStartByDays - a.pushedStartByDays).slice(0, 10),
      bottlenecks,
      crewUtilizationPct: utilizationPct,
      taskCompressionTop: compressionTop.slice(0, 8),
      recommendation,
    },
  }
}

