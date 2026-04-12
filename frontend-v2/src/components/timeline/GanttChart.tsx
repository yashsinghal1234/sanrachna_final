import { useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { GanttTask, Phase } from '@/types/timeline.types'
import { PHASE_COLORS, useTimelineStore, type ZoomLevel } from '@/store/useTimelineStore'
import { cn } from '@/utils/cn'

type DragMode = 'move' | 'resize-start' | 'resize-end'

function toDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN((v as Date).getTime())) return v as Date
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function dayStart(d: unknown) {
  const dt = toDate(d)
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

function diffDays(a: unknown, b: unknown) {
  const one = dayStart(a).getTime()
  const two = dayStart(b).getTime()
  return Math.round((two - one) / (24 * 60 * 60 * 1000))
}

function addDays(d: unknown, days: number) {
  const dt = dayStart(d)
  dt.setDate(dt.getDate() + days)
  return dt
}

function formatShort(d: unknown) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(toDate(d))
  } catch {
    return String(d).slice(5, 10)
  }
}


function zoomPpd(z: ZoomLevel) {
  // pixels per day
  if (z === 'week') return 18
  if (z === 'month') return 6
  return 2.5
}

function phases(): Phase[] {
  return ['Foundation', 'Substructure', 'Superstructure', 'MEP', 'Finishing', 'Handover']
}

function pillCls(active: boolean) {
  return cn(
    'rounded-full px-3 py-1 text-xs font-semibold transition',
    active
      ? 'bg-[color:var(--color-primary)] text-white'
      : 'bg-[color:var(--color-bg)] text-[color:var(--color-text_secondary)] hover:bg-[color:var(--color-surface_hover)]',
  )
}

export function GanttChart() {
  const {
    timeline,
    selectedPhaseFilter,
    setPhaseFilter,
    zoomLevel,
    setZoomLevel,
    showDependencies,
    showBaseline,
    showCriticalPath,
    toggleDependencies,
    toggleBaseline,
    toggleCriticalPath,
    updateTask,
  } = useTimelineStore()

  const listRef = useRef<HTMLDivElement | null>(null)
  const svgScrollRef = useRef<HTMLDivElement | null>(null)

  const [hover, setHover] = useState<{ x: number; y: number; task: GanttTask } | null>(null)
  const [drag, setDrag] = useState<{
    taskId: string
    mode: DragMode
    startX: number
    originStart: Date
    originEnd: Date
  } | null>(null)

  const ppd = zoomPpd(zoomLevel)
  const rowH = 34
  const leftW = 320
  const headerH = 44

  const tasks = useMemo(() => {
    if (!timeline) return []
    const base = selectedPhaseFilter === 'All' ? timeline.tasks : timeline.tasks.filter((t) => t.phase === selectedPhaseFilter)
    return [...base].sort((a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime())
  }, [timeline, selectedPhaseFilter])

  const bounds = useMemo(() => {
    const today = dayStart(new Date())
    const dates = tasks.flatMap((t) => [
      toDate(t.baselineStart),
      toDate(t.baselineEnd),
      toDate(t.startDate),
      toDate(t.endDate),
    ])
    const min = dates.reduce((m, d) => (d.getTime() < m.getTime() ? d : m), today)
    const max = dates.reduce((m, d) => (d.getTime() > m.getTime() ? d : m), today)
    const pad = 10
    return { start: addDays(min, -pad), end: addDays(max, pad), today }
  }, [tasks])

  const totalDays = Math.max(1, diffDays(bounds.start, bounds.end))
  const svgW = Math.max(900, Math.round(totalDays * ppd) + 240)
  const svgH = headerH + tasks.length * rowH + 24

  // scroll sync (task list ↔ chart)
  useEffect(() => {
    const list = listRef.current
    const svg = svgScrollRef.current
    if (!list || !svg) return

    let lock = false
    const onList = () => {
      if (lock) return
      lock = true
      svg.scrollTop = list.scrollTop
      lock = false
    }
    const onSvg = () => {
      if (lock) return
      lock = true
      list.scrollTop = svg.scrollTop
      lock = false
    }
    list.addEventListener('scroll', onList, { passive: true })
    svg.addEventListener('scroll', onSvg, { passive: true })
    return () => {
      list.removeEventListener('scroll', onList)
      svg.removeEventListener('scroll', onSvg)
    }
  }, [])

  // drag handlers
  useEffect(() => {
    if (!drag) return

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX
      const deltaDays = Math.round(dx / ppd)
      if (!deltaDays) return

      if (drag.mode === 'move') {
        updateTask(drag.taskId, {
          startDate: addDays(drag.originStart, deltaDays),
          endDate: addDays(drag.originEnd, deltaDays),
        })
      } else if (drag.mode === 'resize-start') {
        const nextStart = addDays(drag.originStart, deltaDays)
        const capped = nextStart.getTime() <= drag.originEnd.getTime() ? nextStart : drag.originEnd
        updateTask(drag.taskId, { startDate: capped })
      } else {
        const nextEnd = addDays(drag.originEnd, deltaDays)
        const capped = nextEnd.getTime() >= drag.originStart.getTime() ? nextEnd : drag.originStart
        updateTask(drag.taskId, { endDate: capped })
      }
    }

    const onUp = () => setDrag(null)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag, ppd, updateTask])

  const xFor = (date: Date) => diffDays(bounds.start, date) * ppd
  const taskY = (idx: number) => headerH + idx * rowH + 8

  const headers = useMemo(() => {
    // build header ticks depending on zoom
    const start = bounds.start
    const end = bounds.end
    const out: { x: number; label: string }[] = []

    const stepDays = zoomLevel === 'week' ? 7 : zoomLevel === 'month' ? 30 : 90
    let cur = dayStart(start)
    let i = 0
    while (cur.getTime() <= end.getTime() && i < 500) {
      const x = xFor(cur)
      let label = ''
      if (zoomLevel === 'week') label = formatShort(cur)
      else if (zoomLevel === 'month')
        label = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' }).format(cur)
      else label = `Q${Math.floor(cur.getMonth() / 3) + 1} ${String(cur.getFullYear()).slice(2)}`
      out.push({ x, label })
      cur = addDays(cur, stepDays)
      i++
    }
    return out
  }, [bounds.end, bounds.start, zoomLevel, ppd])

  const depIndex = useMemo(() => {
    const map = new Map<string, { xEnd: number; y: number }>()
    tasks.forEach((t, i) => {
      map.set(t.id, { xEnd: xFor(toDate(t.endDate)), y: taskY(i) + 8 })
    })
    return map
  }, [tasks, bounds.start, zoomLevel])

  if (!timeline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gantt chart</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="h-[420px] animate-pulse">
          <div className="h-full rounded-[var(--radius-2xl)] bg-slate-100" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Schedule Gantt</CardTitle>
            <CardDescription>Drag tasks to shift dates. Grab ends to resize. Hover for details.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-white p-1">
              {(['week', 'month', 'quarter'] as const).map((z) => (
                <button key={z} className={pillCls(zoomLevel === z)} onClick={() => setZoomLevel(z)} type="button">
                  {z === 'week' ? 'Week' : z === 'month' ? 'Month' : 'Quarter'}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-white p-1">
              <button className={pillCls(showDependencies)} type="button" onClick={toggleDependencies}>
                Dependencies
              </button>
              <button className={pillCls(showBaseline)} type="button" onClick={toggleBaseline}>
                Baseline
              </button>
              <button className={pillCls(showCriticalPath)} type="button" onClick={toggleCriticalPath}>
                Critical path
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(zoomLevel === 'week' ? 'week' : zoomLevel === 'month' ? 'week' : 'month')}
              title="Zoom in"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(zoomLevel === 'quarter' ? 'quarter' : zoomLevel === 'month' ? 'quarter' : 'month')}
              title="Zoom out"
            >
              <Minus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={pillCls(selectedPhaseFilter === 'All')} onClick={() => setPhaseFilter('All')} type="button">
            All
          </button>
          {phases().map((p) => (
            <button key={p} className={pillCls(selectedPhaseFilter === p)} onClick={() => setPhaseFilter(p)} type="button">
              {p}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white">
          <div className="grid grid-cols-[320px_1fr]">
            {/* Sticky task list */}
            <div className="border-r border-[color:var(--color-border)]">
              <div className="sticky top-0 z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-xs font-semibold text-[color:var(--color-text_secondary)]">
                Task list ({tasks.length})
              </div>
              <div ref={listRef} className="max-h-[520px] overflow-y-auto">
                {tasks.length === 0 ? (
                  <div className="p-4 text-sm text-[color:var(--color-text_secondary)]">No tasks for this phase.</div>
                ) : (
                  <div className="divide-y divide-[color:var(--color-border)]">
                    {tasks.map((t) => (
                      <div key={t.id} className="px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{t.name}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[color:var(--color-text_secondary)]">
                              <span className="truncate">{t.assignedCrew}</span>
                              <span className="rounded-full bg-slate-900/5 px-2 py-0.5 font-semibold">{t.status}</span>
                            </div>
                          </div>
                          {showCriticalPath && t.isCriticalPath ? (
                            <span className="rounded-full bg-[color:var(--color-error)]/10 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-error)]">
                              critical
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable SVG timeline */}
            <div ref={svgScrollRef} className="max-h-[520px] overflow-auto">
              <svg
                width={svgW}
                height={svgH}
                className="block transition-[width] duration-200 ease-out"
                style={{ background: 'white' }}
                onMouseLeave={() => setHover(null)}
              >
                {/* header background */}
                <rect x={0} y={0} width={svgW} height={headerH} fill="#F8FAFC" />

                {/* header ticks */}
                {headers.map((h, idx) => (
                  <g key={idx} transform={`translate(${h.x},0)`}>
                    <line x1={0} y1={0} x2={0} y2={svgH} stroke="#E2E8F0" strokeDasharray="4 4" />
                    <text x={6} y={26} fontSize={11} fill="#64748B">
                      {h.label}
                    </text>
                  </g>
                ))}

                {/* today line */}
                <g transform={`translate(${xFor(bounds.today)},0)`}>
                  <line x1={0} y1={0} x2={0} y2={svgH} stroke="#EF4444" strokeWidth={2} opacity={0.7} />
                  <text x={6} y={12} fontSize={10} fill="#EF4444" fontWeight={700}>
                    Today
                  </text>
                </g>

                {/* dependency arrows */}
                {showDependencies
                  ? tasks.flatMap((t, i) => {
                      const y = taskY(i) + 8
                      return t.dependsOn
                        .map((depId) => {
                          const from = depIndex.get(depId)
                          if (!from) return null
                          const toX = xFor(t.startDate)
                          const toY = y
                          const midX = (from.xEnd + toX) / 2
                          const path = `M ${from.xEnd} ${from.y} C ${midX} ${from.y}, ${midX} ${toY}, ${toX} ${toY}`
                          return (
                            <g key={`${depId}->${t.id}`}>
                              <path d={path} fill="none" stroke="#94A3B8" strokeWidth={1.25} opacity={0.55} />
                              <circle cx={toX} cy={toY} r={2.5} fill="#94A3B8" opacity={0.8} />
                            </g>
                          )
                        })
                        .filter(Boolean)
                    })
                  : null}

                {/* rows */}
                {tasks.map((t, i) => {
                  const tStart = toDate(t.startDate)
                  const tEnd = toDate(t.endDate)
                  const x0 = xFor(tStart)
                  const x1 = xFor(tEnd)
                  const w = Math.max(6, x1 - x0)
                  const y = taskY(i)
                  const tone = PHASE_COLORS[t.phase] ?? PHASE_COLORS['Finishing']
                  const baselineX0 = xFor(toDate(t.baselineStart))
                  const baselineX1 = xFor(toDate(t.baselineEnd))
                  const baselineW = Math.max(4, baselineX1 - baselineX0)
                  const isCritical = showCriticalPath && t.isCriticalPath
                  const barFill = isCritical ? 'rgba(239,68,68,0.13)' : tone.bg
                  const barStroke = isCritical ? '#EF4444' : tone.stroke

                  const onDown = (mode: DragMode) => (e: React.PointerEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
                    setDrag({ taskId: t.id, mode, startX: e.clientX, originStart: tStart, originEnd: tEnd })
                  }

                  const onHover = (e: React.MouseEvent) => {
                    const pt = (e.currentTarget as SVGElement).getBoundingClientRect()
                    setHover({
                      x: e.clientX - pt.left + (svgScrollRef.current?.scrollLeft ?? 0),
                      y: e.clientY - pt.top + (svgScrollRef.current?.scrollTop ?? 0),
                      task: t,
                    })
                  }

                  return (
                    <g key={t.id} transform={`translate(0,0)`}>
                      {/* row separator */}
                      <line x1={0} y1={y + 28} x2={svgW} y2={y + 28} stroke="#F1F5F9" />

                      {/* baseline */}
                      {showBaseline ? (
                        <rect
                          x={baselineX0}
                          y={y + 10}
                          width={baselineW}
                          height={6}
                          rx={3}
                          fill="#CBD5E1"
                          opacity={0.7}
                        />
                      ) : null}

                      {/* milestone */}
                      {t.isMilestone ? (
                        <g transform={`translate(${x0},${y + 12})`} onMouseMove={onHover}>
                          <polygon points="0,8 8,0 16,8 8,16" fill={tone.fg} opacity={0.85} />
                        </g>
                      ) : (
                        <g>
                          <rect
                            x={x0}
                            y={y}
                            width={w}
                            height={20}
                            rx={10}
                            fill={barFill}
                            stroke={barStroke}
                            strokeWidth={1.5}
                            onPointerDown={onDown('move')}
                            onMouseMove={onHover}
                            style={{ cursor: 'grab' }}
                          />

                          {/* progress fill */}
                          <rect
                            x={x0}
                            y={y}
                            width={Math.max(0, (w * t.percentComplete) / 100)}
                            height={20}
                            rx={10}
                            fill={tone.fg}
                            opacity={0.18}
                            pointerEvents="none"
                          />

                          {/* resize handles */}
                          <rect
                            x={x0 - 5}
                            y={y - 1}
                            width={10}
                            height={22}
                            rx={6}
                            fill="transparent"
                            onPointerDown={onDown('resize-start')}
                            style={{ cursor: 'ew-resize' }}
                          />
                          <rect
                            x={x0 + w - 5}
                            y={y - 1}
                            width={10}
                            height={22}
                            rx={6}
                            fill="transparent"
                            onPointerDown={onDown('resize-end')}
                            style={{ cursor: 'ew-resize' }}
                          />
                        </g>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        </div>

        {hover ? (
          <div
            className="pointer-events-none absolute left-0 top-0 z-50 hidden md:block"
            style={{ transform: `translate(${leftW + 24 + hover.x}px, ${hover.y + 18}px)` }}
          >
            <div className="max-w-xs rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white px-4 py-3 text-xs shadow-[var(--shadow-card)]">
              <div className="text-sm font-semibold">{hover.task.name}</div>
              <div className="mt-1 text-[color:var(--color-text_secondary)]">
                {hover.task.phase} · {hover.task.assignedCrew}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[color:var(--color-text_secondary)]">
                <div>
                  <div className="text-[11px] font-semibold">Start</div>
                  <div>{formatShort(toDate(hover.task.startDate))}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold">End</div>
                  <div>{formatShort(toDate(hover.task.endDate))}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold">Progress</div>
                  <div>{hover.task.percentComplete}%</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold">Delay</div>
                  <div className={hover.task.delayDays > 0 ? 'text-[color:var(--color-error)] font-semibold' : ''}>
                    {hover.task.delayDays}d
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

