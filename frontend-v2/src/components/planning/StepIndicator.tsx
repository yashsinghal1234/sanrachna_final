import { Check, Lock } from 'lucide-react'

import { cn } from '@/utils/cn'
import type { PlanningStep } from '@/store/usePlanningStore'

type StepIndicatorProps = {
  currentStep: PlanningStep
  isApproved: boolean
  hasReport: boolean
  reportLoading: boolean
  onStepRequest: (step: PlanningStep) => void
}

const labels: Record<PlanningStep, string> = {
  1: 'Inputs',
  2: 'AI report',
  3: 'Revise',
  4: 'Finalize',
}

export function StepIndicator({
  currentStep,
  isApproved,
  hasReport,
  reportLoading,
  onStepRequest,
}: StepIndicatorProps) {
  const steps: PlanningStep[] = [1, 2, 3, 4]

  const done = (s: PlanningStep) => {
    if (s === 1) return hasReport
    if (s === 2) return currentStep >= 3 || isApproved
    if (s === 3) return isApproved
    return false
  }

  const canClick = (s: PlanningStep) => {
    if (isApproved && s === 1) return false
    if (s === 2) return hasReport || reportLoading
    if (s === 3) return hasReport
    if (s === 4) return isApproved
    return true
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-filter_segment_bg)] p-1 shadow-sm">
      {steps.map((s) => {
        const active = currentStep === s
        const clickable = canClick(s)
        return (
          <button
            key={s}
            type="button"
            disabled={!clickable && !active}
            onClick={() => {
              if (clickable || active) onStepRequest(s)
            }}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-xl)] px-3 py-2 text-[13px] font-semibold transition-colors sm:min-w-[7rem] sm:flex-none',
              active
                ? 'bg-[color:var(--color-card)] text-[color:var(--color-text)] shadow-sm ring-1 ring-[color:var(--color-border)]'
                : 'text-[color:var(--color-text_muted)] hover:bg-[color:var(--color-surface_hover)] hover:text-[color:var(--color-text)]',
              !clickable && !active && 'cursor-not-allowed opacity-50 hover:bg-transparent',
            )}
          >
            {isApproved && s === 1 ? <Lock className="size-3.5" aria-hidden /> : null}
            {done(s) && !(isApproved && s === 1) ? <Check className="size-3.5 text-[color:var(--color-success)]" aria-hidden /> : null}
            <span>{labels[s]}</span>
          </button>
        )
      })}
    </div>
  )
}
