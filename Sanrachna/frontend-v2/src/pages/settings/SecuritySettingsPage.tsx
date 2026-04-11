import { Shield, ShieldCheck, UserRoundX } from 'lucide-react'
import { useState } from 'react'

import { messageFromApiError } from '@/api/projectTeamApi'
import { apiChangePassword } from '@/api/securityApi'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

export function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFA, setTwoFA] = useState(false)
  const [logoutAll, setLogoutAll] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit =
    Boolean(currentPassword && newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-[color:var(--color-primary_dark)]" />
            Security
          </CardTitle>
          <CardDescription>
            Your current password must match before you can set a new one. Minimum 6 characters for the new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3 text-sm text-[color:var(--color-error)]">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="currentPassword">
                Current Password <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setError(null)
                }}
                className="mt-1.5"
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="newPassword">
                New Password <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setError(null)
                }}
                className="mt-1.5"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm Password <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError(null)
                }}
                className="mt-1.5"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-[color:var(--color-success)]" />
              Optional security enhancements
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] px-3 py-2 text-sm',
                  'bg-[color:var(--color-card)]',
                )}
              >
                <span>Enable 2FA</span>
                <input type="checkbox" checked={twoFA} onChange={(e) => setTwoFA(e.target.checked)} className="accent-[color:var(--color-primary)]" />
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] px-3 py-2 text-sm',
                  'bg-[color:var(--color-card)]',
                )}
              >
                <span>Logout from all devices</span>
                <input type="checkbox" checked={logoutAll} onChange={(e) => setLogoutAll(e.target.checked)} className="accent-[color:var(--color-primary)]" />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              disabled={!canSubmit || loading}
              className="sm:w-auto"
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  setError('New password and confirmation do not match.')
                  return
                }
                setError(null)
                setSaved(null)
                setLoading(true)
                try {
                  const res = await apiChangePassword({ currentPassword, newPassword })
                  setSaved(res.message || 'Password updated.')
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  window.setTimeout(() => setSaved(null), 4000)
                } catch (e) {
                  setError(messageFromApiError(e))
                } finally {
                  setLoading(false)
                }
              }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </div>

          {saved ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/10 p-3 text-sm font-semibold text-[color:var(--color-success)]">
              {saved}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="text-xs text-[color:var(--color-text_secondary)]">
          <div className="flex items-center gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
            <UserRoundX className="size-4 text-[color:var(--color-warning)]" />
            After a successful change, use your new password the next time you sign in.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
