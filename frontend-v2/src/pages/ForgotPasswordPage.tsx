import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { backendForgotPassword, backendResetPassword } from '@/api/backendAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

const gradient = 'bg-[linear-gradient(135deg,#2FBFAD_0%,#6EDBD0_45%,#3B82F6_100%)]'

type RecoveryStep = 'verify' | 'reset'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<RecoveryStep>('verify')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const passwordScore = useMemo(
    () =>
      [
        newPassword.length >= 8,
        /[A-Z]/.test(newPassword),
        /[0-9]/.test(newPassword),
        /[^A-Za-z0-9]/.test(newPassword),
      ].filter(Boolean).length,
    [newPassword],
  )

  const strengthLabel =
    passwordScore <= 1 ? 'Weak' : passwordScore <= 2 ? 'Fair' : passwordScore === 3 ? 'Good' : 'Strong'
  const strengthColor =
    passwordScore <= 1
      ? 'bg-[color:var(--color-error)]'
      : passwordScore <= 2
        ? 'bg-[color:var(--color-warning)]'
        : passwordScore === 3
          ? 'bg-[color:var(--color-info)]'
          : 'bg-[color:var(--color-success)]'

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const data = await backendForgotPassword({ username: username.trim(), email: email.trim() })
      setUserId(data.userId)
      setStep('reset')
      setSuccess('Identity verified. Create a new password for your account.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await backendResetPassword({ userId, newPassword })
      navigate('/login', {
        replace: true,
        state: { resetSuccess: 'Password updated. You can sign in now.' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[color:var(--color-bg)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-[color:var(--color-border)] lg:block">
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80"
          alt="Construction site with cranes and concrete structure"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,31,0.20)_0%,rgba(8,15,31,0.72)_70%,rgba(8,15,31,0.84)_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-[var(--radius-xl)] ${gradient}`} aria-hidden />
            <div>
              <div className="text-sm font-bold tracking-tight">Sanrachna</div>
              <div className="text-xs text-white/85">Construction Intelligence</div>
            </div>
          </div>

          <div className="mb-8 mt-auto max-w-md">
            <h1 className="text-3xl font-bold tracking-tight">
              {step === 'verify' ? 'Recover your account' : 'Create a new password'}
            </h1>
            <p className="mt-2 text-white/85">
              {step === 'verify'
                ? 'Verify your identity with your registered name and email before continuing.'
                : 'Set a strong new password to restore access to your workspace securely.'}
            </p>
            <div className="mt-6 rounded-[var(--radius-2xl)] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-sm font-semibold">
                {step === 'verify' ? 'Secure account recovery' : 'Password reset protection'}
              </div>
              <div className="mt-1 text-sm text-white/80">
                {step === 'verify'
                  ? 'We check your account details first, then unlock the reset step.'
                  : 'Use 8+ characters with uppercase, number, and symbol for a stronger password.'}
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-white/85">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#86EFAC]" />
                Identity-first recovery flow
              </div>
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-[#93C5FD]" />
                Password reset happens only after verification
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md p-5 sm:p-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--color-text_secondary)] transition hover:text-[color:var(--color-text)]"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>

          <div className="mt-4 text-lg font-bold">{step === 'verify' ? 'Forgot Password' : 'Reset Password'}</div>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            {step === 'verify'
              ? 'Enter your registered name and email to verify your identity.'
              : 'Choose a new password for your Sanrachna account.'}
          </p>

          {error ? (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 px-3 py-2 text-sm text-[color:var(--color-error)]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 px-3 py-2 text-sm text-[color:var(--color-success)]">
              {success}
            </div>
          ) : null}

          {step === 'verify' ? (
            <form className="mt-6 space-y-4" onSubmit={handleVerify}>
              <div>
                <label className="text-sm font-medium" htmlFor="username">
                  Username
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                    <User className="size-4" />
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    placeholder="Your registered name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                    <Mail className="size-4" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify account'}
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleReset}>
              <div>
                <label className="text-sm font-medium" htmlFor="newPassword">
                  New password
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                    <Lock className="size-4" />
                  </span>
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[color:var(--color-text_muted)] hover:bg-[color:var(--color-surface_hover)]"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                    <Lock className="size-4" />
                  </span>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[color:var(--color-text_muted)] hover:bg-[color:var(--color-surface_hover)]"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Password strength</span>
                  <span>{newPassword ? strengthLabel : 'Not set'}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full transition-all ${strengthColor}`}
                    style={{ width: `${(passwordScore / 4) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-[color:var(--color-text_secondary)]">
                  Use 8+ characters with uppercase, number, and symbol.
                </div>
              </div>

              {confirmPassword && newPassword !== confirmPassword ? (
                <div className="text-xs font-medium text-[color:var(--color-error)]">
                  Password and confirm password should match.
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
