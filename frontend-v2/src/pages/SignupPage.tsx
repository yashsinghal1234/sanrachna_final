import { Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth, type Role } from '@/auth/AuthContext'
import { backendSignup } from '@/api/backendAuth'
import { ContributorsStack } from '@/components/marketing/ContributorsStack'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export function SignupPage() {
  const { login, setRole } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRoleLocal] = useState<Role>('engineer')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const passwordScore = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || '').trim()
    const emailOrPhone = String(fd.get('id') || '').trim()
    const phone = String(fd.get('phone') || '').trim()
    const password = String(fd.get('password') || '').trim()
    const confirm = String(fd.get('confirm') || '').trim()
    if (!name || !emailOrPhone || !password || password !== confirm) return
    if (!phone) {
      setError('Phone number is required.')
      return
    }

    setLoading(true)
    try {
      const { token, user } = await backendSignup({ name, email: emailOrPhone, password, role, phone })
      login({ token, user })
      if (user.role) setRole(user.role)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[color:var(--color-bg)] lg:grid-cols-2">
      <div className="relative hidden min-h-[540px] overflow-hidden border-r border-[color:var(--color-border)] lg:block">
        <img
          src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80"
          alt="Construction team discussing on-site plans"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,31,0.18)_0%,rgba(8,15,31,0.75)_70%,rgba(8,15,31,0.88)_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-7 text-white">
          <div className="text-sm">
            <div className="font-bold tracking-tight">Sanrachna</div>
            <div className="text-white/85">AI Brain for Construction</div>
          </div>
          <div className="mb-5 mt-auto max-w-md">
            <h1 className="text-3xl font-bold tracking-tight">Create your workspace</h1>
            <p className="mt-2 text-white/85">
              Set up your account and start generating plans, forecasts, and site actions in one place.
            </p>
            <div className="mt-4 rounded-[var(--radius-2xl)] border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm">
              <div className="text-sm font-semibold">From estimate to execution</div>
              <div className="mt-1 text-sm text-white/80">
                Cost planning, Gantt timelines, RFIs, daily logs, and emergency alerts.
              </div>
            </div>
            <ContributorsStack
              variant="light"
              className="mt-6"
              title="Built by practitioners"
              subtitle="Field engineers, PMs, and AI researchers shaping the roadmap."
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[color:var(--color-card)] p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-border)]">
          <div className="text-lg font-bold">Create your account</div>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Fill in your details to create your account and start with the right role access.
          </p>

          {error ? (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 px-3 py-2 text-sm text-[color:var(--color-error)]">
              {error}
            </div>
          ) : null}

          <form className="mt-5 space-y-3.5" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="name">
                Full name
              </label>
              <Input id="name" name="name" className="mt-1.5" placeholder="Full name" required />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="id">
                Email or phone
              </label>
              <Input
                id="id"
                name="id"
                className="mt-1.5"
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="phone">
                Phone number <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="phone"
                name="phone"
                className="mt-1.5"
                placeholder="+91 … (used for directory & alerts)"
                required
                inputMode="tel"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  className="pr-10"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[color:var(--color-text_muted)] hover:bg-slate-50"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="confirm">
                Confirm password
              </label>
              <Input
                id="confirm"
                name="confirm"
                className="mt-1.5"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Password strength</span>
                <span>{password ? strengthLabel : 'Not set'}</span>
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

            <div>
              <div className="text-sm font-medium">Role</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {([
                  { key: 'owner', label: 'Owner' },
                  { key: 'engineer', label: 'Engineer' },
                  { key: 'worker', label: 'Worker' },
                ] as const).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={[
                      'rounded-[var(--radius-xl)] border px-3 py-3 text-left text-sm transition',
                      r.key === role
                        ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary_light)]/20'
                        : 'border-[color:var(--color-border)] bg-white hover:bg-slate-50',
                    ].join(' ')}
                    onClick={() => setRoleLocal(r.key)}
                  >
                    <div className="font-semibold">{r.label}</div>
                    <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                      {r.key === 'owner'
                        ? 'View insights & budgets'
                        : r.key === 'engineer'
                          ? 'Manage project execution'
                          : 'Submit logs & issues'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? (
                'Creating…'
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create account
                </>
              )}
            </Button>

            {confirm && password !== confirm ? (
              <div className="text-xs font-medium text-[color:var(--color-error)]">
                Password and confirm password should match.
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <Link to="/login" className="font-medium text-[color:var(--color-primary_dark)] hover:underline">
                Already have an account?
              </Link>
              <span className="inline-flex items-center gap-2 text-[color:var(--color-text_secondary)]">
                <ShieldCheck className="size-4 text-[color:var(--color-success)]" />
                Demo safe
              </span>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

