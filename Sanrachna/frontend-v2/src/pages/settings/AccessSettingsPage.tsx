import { CheckCircle2, Lock, Shield, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

type FeatureRow = {
  feature: string
  owner: boolean
  engineer: boolean | 'assigned_only'
  worker: boolean
  hint?: string
}

const defaultMatrix: FeatureRow[] = [
  { feature: 'Cost Forecast', owner: true, engineer: true, worker: false, hint: 'Owner & Engineer can see forecasting; Worker cannot.' },
  { feature: 'Timeline', owner: true, engineer: true, worker: false, hint: 'Worker only sees assigned timeline tasks.' },
  { feature: 'Documents', owner: true, engineer: true, worker: true, hint: 'Engineer sees project documents; Worker sees relevant docs.' },
  { feature: 'AI Copilot', owner: true, engineer: true, worker: false, hint: 'Worker copilot access can be limited to safety/context.' },
  { feature: 'Emergency', owner: true, engineer: true, worker: true, hint: 'Emergency is always enabled.' },
]

function statusMark(on: boolean | 'assigned_only') {
  if (!on) return <span className="text-sm text-[color:var(--color-text_muted)]">—</span>
  if (on === 'assigned_only') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--color-warning)]">◎ Assigned</span>
  }
  return <CheckCircle2 className="size-4 text-[color:var(--color-success)]" />
}

export function AccessSettingsPage() {
  const { role } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'

  const mode = useMemo(() => {
    if (resolvedRole === 'owner') return 'owner'
    if (resolvedRole === 'engineer') return 'engineer'
    return 'worker'
  }, [resolvedRole])

  const [toast, setToast] = useState<string | null>(null)

  if (mode === 'worker') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-[color:var(--color-warning)]" />
            Roles & Access
          </CardTitle>
          <CardDescription>Worker tier cannot change permissions.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[color:var(--color-text_secondary)]">
          Ask your supervisor or owner for access changes.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm font-semibold">
          {toast}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-[color:var(--color-primary_dark)]" />
            Roles & Access Settings
          </CardTitle>
          <CardDescription>
            {mode === 'owner'
              ? 'Customize permissions per tier (demo).'
              : 'Read-only access matrix (engineer tier).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-xs text-[color:var(--color-text_secondary)]">
              <ShieldAlert className="size-4 text-[color:var(--color-warning)]" />
              Owner-only actions are enabled in this MVP.
            </div>
            {mode === 'owner' ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setToast('Customize permissions (demo).')
                    window.setTimeout(() => setToast(null), 2600)
                  }}
                >
                  Customize Permissions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setToast('Reset to defaults (demo).')
                    window.setTimeout(() => setToast(null), 2600)
                  }}
                >
                  Reset Defaults
                </Button>
              </div>
            ) : (
              <div className="text-sm text-[color:var(--color-text_secondary)]">
                Engineers can view only.
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[color:var(--color-bg)] text-xs font-semibold text-[color:var(--color-text_secondary)]">
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Engineer</th>
                  <th className="px-4 py-3">Worker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {defaultMatrix.map((f) => (
                  <tr key={f.feature}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{f.feature}</div>
                      {f.hint ? <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{f.hint}</div> : null}
                    </td>
                    <td className="px-4 py-3">{statusMark(f.owner)}</td>
                    <td className="px-4 py-3">
                      {f.engineer === 'assigned_only' ? statusMark('assigned_only') : statusMark(f.engineer)}
                    </td>
                    <td className="px-4 py-3">{statusMark(f.worker)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-[color:var(--color-text_secondary)]">
            These permissions are demo values. Backend integration would enforce access checks server-side.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

