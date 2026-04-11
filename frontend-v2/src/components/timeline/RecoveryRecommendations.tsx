import { Sparkles, Wand2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTimelineStore } from '@/store/useTimelineStore'
import { cn } from '@/utils/cn'

function savingTone(days: number) {
  if (days >= 8) return 'bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]'
  if (days >= 5) return 'bg-[color:var(--color-warning)]/12 text-[color:var(--color-warning)]'
  return 'bg-[color:var(--color-info)]/10 text-[color:var(--color-info)]'
}

export function RecoveryRecommendations({ onToast }: { onToast: (msg: string) => void }) {
  const { timeline, applyRecoveryAction } = useTimelineStore()

  if (!timeline) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Recovery recommendations</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="h-[220px]">
          <div className="h-full rounded-[var(--radius-2xl)] bg-slate-100" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-[color:var(--color-primary_dark)]" />
          AI recovery suggestions
        </CardTitle>
        <CardDescription>Quick actions to recover time and reduce risk.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {timeline.recoveryActions.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
            No recommendations available.
          </div>
        ) : (
          timeline.recoveryActions.map((a) => (
            <div
              key={a.id}
              className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{a.suggestion}</div>
                  <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{a.impact}</div>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-1 text-xs font-semibold', savingTone(a.savingDays))}>
                  Save {a.savingDays}d
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    applyRecoveryAction(a.id)
                    onToast('Applied suggestion (demo effect).')
                  }}
                >
                  <Wand2 className="size-4" />
                  Apply Suggestion
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

