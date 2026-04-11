import { Bell, Mail, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useAuth, type Role } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

type ToggleKey =
  | 'email'
  | 'app'
  | 'sms'
  | 'budget'
  | 'delay'
  | 'rfi'
  | 'emergency'
  | 'compliance'
  | 'assignedRfis'
  | 'taskDelays'
  | 'dailyLogMissing'
  | 'materialDelays'
  | 'taskAssignments'
  | 'shiftReminders'
  | 'dailyLogReminder'
  | 'safetyNotices'

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm">
      <span className="font-semibold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[color:var(--color-primary)]" />
    </label>
  )
}

export function NotificationSettingsPage() {
  const { role } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'

  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    email: true,
    app: true,
    sms: false,

    budget: true,
    delay: true,
    rfi: true,
    emergency: true,
    compliance: true,

    assignedRfis: true,
    taskDelays: true,
    dailyLogMissing: true,
    materialDelays: true,

    taskAssignments: true,
    shiftReminders: true,
    dailyLogReminder: true,
    safetyNotices: true,
  })

  const [saved, setSaved] = useState(false)

  const roleToggles = useMemo(() => {
    if (resolvedRole === 'owner') {
      return [
        { key: 'budget', label: 'Budget alerts' },
        { key: 'delay', label: 'Delay alerts' },
        { key: 'rfi', label: 'RFI escalations' },
        { key: 'emergency', label: 'Emergency alerts' },
        { key: 'compliance', label: 'Permit/Compliance alerts' },
      ] as const
    }
    if (resolvedRole === 'engineer') {
      return [
        { key: 'assignedRfis', label: 'Assigned RFIs' },
        { key: 'taskDelays', label: 'Task delays' },
        { key: 'dailyLogMissing', label: 'Daily log missing' },
        { key: 'materialDelays', label: 'Material delays' },
        { key: 'emergency', label: 'Emergency alerts' },
      ] as const
    }
    return [
      { key: 'taskAssignments', label: 'Task assignments' },
      { key: 'shiftReminders', label: 'Shift reminders' },
      { key: 'dailyLogReminder', label: 'Daily log reminder' },
      { key: 'safetyNotices', label: 'Safety notices' },
      { key: 'emergency', label: 'Emergency alerts' },
    ] as const
  }, [resolvedRole])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-[color:var(--color-primary_dark)]" />
            Notification Settings
          </CardTitle>
          <CardDescription>Channel toggles + role-based alert types (demo UI).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="text-sm font-bold">General toggles</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
              <ToggleRow label="Email Notifications" checked={toggles.email} onChange={(v) => setToggles((p) => ({ ...p, email: v }))} />
              <ToggleRow label="App Notifications" checked={toggles.app} onChange={(v) => setToggles((p) => ({ ...p, app: v }))} />
              <ToggleRow label="SMS Notifications" checked={toggles.sms} onChange={(v) => setToggles((p) => ({ ...p, sms: v }))} />
            </div>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-white p-4">
            <div className="text-sm font-bold">Alert type toggles ({resolvedRole.toUpperCase()})</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {roleToggles.map((t) => (
                <ToggleRow
                  key={t.key}
                  label={t.label}
                  checked={toggles[t.key]}
                  onChange={(v) => setToggles((p) => ({ ...p, [t.key]: v }))}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setSaved(true)
                window.setTimeout(() => setSaved(false), 2600)
              }}
            >
              Save Changes
            </Button>
          </div>

          {saved ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/10 p-3 text-sm font-semibold text-[color:var(--color-success)]">
              Notification preferences saved (demo).
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-xs text-[color:var(--color-text_secondary)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2">
              <Mail className="size-4 text-[color:var(--color-info)]" />
              Channels are visual only in this MVP.
            </div>
            <div className="inline-flex items-center gap-2">
              <Phone className="size-4 text-[color:var(--color-warning)]" />
              SMS is disabled by default.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

