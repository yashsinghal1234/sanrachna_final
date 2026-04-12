/**
 * planningApi.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Callouts to the FastAPI Report Engine (http://localhost:8001).
 *
 * Endpoints used:
 *   POST /generate  ← InputForm.tsx submits PlanningFormValues
 *   POST /revise    ← Step3 revision chat sends { form, report, chatHistory, newMessage }
 *
 * The engine returns PlanningReport JSON directly (no AI wrapping) so we
 * validate with zod and normalise before storing.
 */

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

/** The FastAPI report engine base URL (set VITE_PLANNING_API_BASE in .env). */
const BASE =
  typeof import.meta.env.VITE_PLANNING_API_BASE === 'string'
    ? import.meta.env.VITE_PLANNING_API_BASE.replace(/\/$/, '')
    : ''

function missingBaseMessage(kind: 'generate' | 'revise') {
  return (
    `Planning API is not configured. ` +
    `Set VITE_PLANNING_API_BASE=http://localhost:8001 in frontend-v2/.env ` +
    `and restart Vite. (endpoint: /${kind})`
  )
}

/**
 * Parse the response from the FastAPI engine.
 *
 * The engine returns a plain JSON PlanningReport, but we also handle
 * the legacy AI-wrapper format ({ report: "..." }) just in case.
 */
async function parseReportResponse(res: Response): Promise<PlanningReport> {
  if (!res.ok) {
    let detail = ''
    try {
      const err = (await res.json()) as { detail?: string; error?: string }
      detail = err.detail ?? err.error ?? ''
    } catch {
      detail = await res.text()
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }

  const data: unknown = await res.json()

  // FastAPI returns a PlanningReport object directly — validate with zod
  let json: unknown = data
  if (
    typeof data === 'object' &&
    data !== null &&
    ('report' in data || 'content' in data)
  ) {
    // Legacy AI-wrapper format — unwrap and re-parse
    const wrapped = data as { report?: unknown; content?: unknown }
    const text = String(wrapped.report ?? wrapped.content ?? '')
    try {
      json = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not extract JSON from wrapped response')
      json = JSON.parse(match[0]!)
    }
  }

  return normalizeReport(planningReportSchema.parse(json) as PlanningReport)
}

/**
 * POST /generate — called by InputForm.tsx on form submit.
 * Sends PlanningFormValues, receives PlanningReport.
 */
export async function generatePlanningReport(form: PlanningFormValues): Promise<PlanningReport> {
  if (!BASE) throw new Error(missingBaseMessage('generate'))

  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  })

  return parseReportResponse(res)
}

/**
 * POST /revise — called by Step3 revision chat.
 * Sends { form, report, chatHistory, newMessage }, receives revised PlanningReport.
 */
export async function revisePlanningReport(args: {
  form: PlanningFormValues
  report: PlanningReport
  chatHistory: ChatMessage[]
  newMessage: string
}): Promise<PlanningReport> {
  if (!BASE) throw new Error(missingBaseMessage('revise'))

  const res = await fetch(`${BASE}/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })

  return parseReportResponse(res)
}
