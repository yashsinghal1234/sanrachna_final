import { CheckCircle2, Eye, EyeOff, Lock, Phone } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { backendSignin } from '@/api/backendAuth'
import { ContributorsStack } from '@/components/marketing/ContributorsStack'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

const gradient =
  'bg-[linear-gradient(135deg,#2FBFAD_0%,#6EDBD0_45%,#3B82F6_100%)]'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(() => {
    const state = location.state as { resetSuccess?: string } | null
    return state?.resetSuccess ?? null
  })

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const emailOrPhone = String(fd.get('id') || '').trim()
    const password = String(fd.get('password') || '').trim()
    if (!emailOrPhone || !password) return

    setLoading(true)
    try {
      const { token, user } = await backendSignin({ email: emailOrPhone, password })
      login({ token, user })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signin failed.')
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
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-white/85">
              Continue planning with grounded AI estimates, smart timelines, and site visibility.
            </p>
            <div className="mt-6 rounded-[var(--radius-2xl)] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <div className="text-sm font-semibold">Live project intelligence</div>
              <div className="mt-1 text-sm text-white/80">
                Cost, time, risk, and execution signals in one dashboard for every role.
              </div>
            </div>
            <ContributorsStack
              variant="light"
              className="mt-8"
              title="People behind the build"
              subtitle="Design, engineering, and customer success — hover each circle for a name."
            />
            <div className="mt-8 space-y-3 text-sm text-white/85">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[color:var(--color-primary_light)]" />
                RAG-Grounded Estimation
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#93C5FD]" />
                Auto Gantt + Delay Forecasting
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#86EFAC]" />
                Daily Logs + Emergency Alerts
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[color:var(--color-card)] p-7 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-border)]">
          <div className="text-xl font-semibold tracking-tight">Sign in</div>
          <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
            Sign in with the email you registered.
          </p>

          {success ? (
            <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-xl)] border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 px-3 py-2 text-sm text-[color:var(--color-success)]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 px-3 py-2 text-sm text-[color:var(--color-error)]">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium" htmlFor="id">
                Email or phone
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                  <Phone className="size-4" />
                </span>
                <Input id="id" name="id" className="pl-9" placeholder="you@company.com" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text_muted)]">
                  <Lock className="size-4" />
                </span>
                <Input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[color:var(--color-text_muted)] hover:bg-[color:var(--color-surface_hover)]"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-sm font-medium text-[color:var(--color-primary_dark)] hover:underline">
                Forgot password?
              </Link>
              <Link to="/signup" className="text-sm font-medium text-[color:var(--color-primary_dark)] hover:underline">
                Create account
              </Link>
            </div>

            <Button type="submit" className="w-full rounded-[var(--radius-xl)]" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

