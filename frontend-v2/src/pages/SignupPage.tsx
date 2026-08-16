import { Eye, EyeOff, UserPlus, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth, type Role } from '@/auth/AuthContext'
import { backendSignup } from '@/api/backendAuth'
import { AuthCarousel, type CarouselItem } from '@/components/AuthCarousel'

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    type: 'video',
    src: "/Pinterest (2)-enhanced (1)comp.mp4",
    text: <>Collaborate effortlessly across site and office.</>
  },
  {
    type: 'video',
    src: "/Pinterest (1)-enhancedcompress.mp4",
    text: <>Transform your project visibility from day one.</>
  },
  {
    type: 'video',
    src: "/Pinterest-enhancedcomp.mp4",
    text: <>Gain unparalleled insights with real-time analytics.</>
  }
]

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
      ? 'bg-red-500'
      : passwordScore <= 2
        ? 'bg-yellow-500'
        : passwordScore === 3
          ? 'bg-blue-500'
          : 'bg-green-500'

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
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a0a]">
      
      {/* ── LEFT COLUMN: FORM ── */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-[45%] lg:px-8 xl:px-12 h-screen overflow-y-auto">
        <div className="mx-auto w-full max-w-[450px]">
          
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-bold tracking-tight text-[#111] dark:text-white">Create an account</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              Join <span className="font-semibold text-black dark:text-white">Sanrachna</span> to start generating plans, forecasts, and site actions in one place.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <input
                  id="name"
                  name="name"
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  id="id"
                  name="id"
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Email or phone"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  id="phone"
                  name="phone"
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Phone number (+91 ...)"
                  required
                  inputMode="tel"
                />
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent pl-6 pr-12 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>

              <div>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Confirm password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            {/* Password Strength */}
            {password && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span>Strength</span>
                  <span>{strengthLabel}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className={`h-1.5 rounded-full transition-all ${strengthColor}`}
                    style={{ width: `${(passwordScore / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {confirm && password !== confirm && (
              <div className="text-[13px] font-medium text-red-500 pl-4">
                Passwords do not match.
              </div>
            )}

            {/* Role Selection */}
            <div className="pt-2">
              <div className="mb-3 text-[13px] font-semibold text-gray-600 dark:text-gray-400 pl-1">Select your role</div>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  { key: 'owner', label: 'Owner', desc: 'Insights' },
                  { key: 'engineer', label: 'Engineer', desc: 'Execution' },
                  { key: 'worker', label: 'Worker', desc: 'Site Logs' },
                ] as const).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={[
                      'rounded-2xl border p-3 text-left transition-all',
                      r.key === role
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600',
                    ].join(' ')}
                    onClick={() => setRoleLocal(r.key)}
                  >
                    <div className="text-sm font-semibold">{r.label}</div>
                    <div className={`mt-1 text-[11px] ${r.key === role ? 'text-gray-300 dark:text-gray-700' : 'text-gray-500 dark:text-gray-500'}`}>
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-black dark:bg-white py-4 text-sm font-medium text-white dark:text-black transition-opacity hover:opacity-90 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create account
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between text-[13px]">
            <div className="text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-green-600 dark:text-green-500 hover:underline">
                Login
              </Link>
            </div>
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <ShieldCheck className="size-4 text-green-600 dark:text-green-500" />
              Secure
            </span>
          </div>

        </div>
      </div>

      <AuthCarousel items={CAROUSEL_ITEMS} />
      
    </div>
  )
}
