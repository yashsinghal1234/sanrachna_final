import { planningReportSchema } from '@/planning/planningSchema'
import type { PlanningFormValues } from '@/planning/planningSchema'
import type { ChatMessage, PlanningReport } from '@/types/planning.types'

function normalizeReport(r: PlanningReport): PlanningReport {
  return {
    ...r,
    optimizations: r.optimizations.map((o) => ({
      ...o,
      savingAmount: o.savingAmount ?? null,
    })),
  }
}

const BASE = typeof import.meta.env.VITE_PLANNING_API_BASE === 'string' ? import.meta.env.VITE_PLANNING_API_BASE : ''

function missingBaseMessage(kind: 'generate' | 'revise') {
  return `Planning API is not configured. Set VITE_PLANNING_API_BASE to your planning service URL (endpoint: /${kind}).`
}

async function parseReportResponse(data: unknown): Promise<PlanningReport> {
  const text =
    typeof data === 'object' && data !== null && 'report' in data
      ? String((data as { report: unknown }).report)
      : typeof data === 'object' && data !== null && 'content' in data
        ? String((data as { content: unknown }).content)
        : JSON.stringify(data)
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid JSON in response')
    json = JSON.parse(match[0]!)
  }
  return normalizeReport(planningReportSchema.parse(json) as PlanningReport)
}

export async function generatePlanningReport(form: PlanningFormValues): Promise<PlanningReport> {
  if (!BASE) {
    throw new Error(missingBaseMessage('generate'))
  }
  const res = await fetch(`${BASE.replace(/\/$/, '')}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })
  if (!res.ok) throw new Error((await res.text()) || 'Report generation failed')
  return parseReportResponse(await res.json())
}

export async function revisePlanningReport(args: {
  form: PlanningFormValues
  report: PlanningReport
  chatHistory: ChatMessage[]
  newMessage: string
}): Promise<PlanningReport> {
  if (!BASE) {
    throw new Error(missingBaseMessage('revise'))
  }
  const res = await fetch(`${BASE.replace(/\/$/, '')}/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error((await res.text()) || 'Revision failed')
  return parseReportResponse(await res.json())
}
