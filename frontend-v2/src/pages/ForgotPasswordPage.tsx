import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { backendForgotPassword, backendResetPassword } from '@/api/backendAuth'
import { AuthCarousel, type CarouselItem } from '@/components/AuthCarousel'

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    type: 'video',
    src: "/Untitled design-enhancedcomp.mp4",
    text: <>Securely restore access to your <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Sanrachna</span> workspace</>
  },
  {
    type: 'video',
    src: "/Pinterest (1)-enhancedcompress.mp4",
    text: <>Transform your project visibility from day one.</>
  },
]

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
      ? 'bg-red-500'
      : passwordScore <= 2
        ? 'bg-yellow-500'
        : passwordScore === 3
          ? 'bg-blue-500'
          : 'bg-green-500'

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
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a0a]">
      
      {/* ── LEFT COLUMN: FORM ── */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-[45%] lg:px-8 xl:px-12">
        <div className="mx-auto w-full max-w-[400px]">
          
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-2 text-[13px] font-semibold text-green-600 dark:text-green-500 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#111] dark:text-white">
              {step === 'verify' ? 'Recover your account' : 'Create a new password'}
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              {step === 'verify'
                ? 'Enter your registered name and email to verify your identity before continuing.'
                : 'Set a strong new password to restore access to your workspace securely.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {step === 'verify' ? (
            <form className="space-y-4" onSubmit={handleVerify}>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="size-[18px]" />
                </span>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent pl-12 pr-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Your registered name"
                  required
                />
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="size-[18px]" />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent pl-12 pr-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-black dark:bg-white py-4 text-sm font-medium text-white dark:text-black transition-opacity hover:opacity-90 disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify account'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleReset}>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="size-[18px]" />
                </span>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent pl-12 pr-12 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="New password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="size-[18px]" />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent pl-12 pr-12 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                  placeholder="Confirm password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>

              {/* Password Strength */}
              {newPassword && (
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

              {confirmPassword && newPassword !== confirmPassword && (
                <div className="text-[13px] font-medium text-red-500 pl-4">
                  Passwords do not match.
                </div>
              )}

              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-black dark:bg-white py-4 text-sm font-medium text-white dark:text-black transition-opacity hover:opacity-90 disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          )}

        </div>
      </div>

      <AuthCarousel items={CAROUSEL_ITEMS} />
      
    </div>
  )
}
