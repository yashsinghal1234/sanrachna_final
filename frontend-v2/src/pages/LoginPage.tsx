import { Eye, EyeOff, Building2, HardHat, FileCheck2, Calculator } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/auth/AuthContext'
import { backendSignin } from '@/api/backendAuth'

// Simple Inline SVGs for Social Login
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.6v-3h2.4V9.6c0-2.38 1.41-3.7 3.58-3.7.94 0 1.78.07 2.02.1v2.34l-1.39.01c-1.09 0-1.3.52-1.3 1.28V12h2.58l-.34 3h-2.24v6.8C18.56 20.87 22 16.84 22 12z" />
  </svg>
)

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
    <div className="flex min-h-screen bg-white dark:bg-[#0a0a0a]">
      
      {/* ── LEFT COLUMN: FORM ── */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-[45%] lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[400px]">
          
          <div className="mb-10 text-center">
            <h1 className="text-5xl font-bold tracking-tight text-[#111] dark:text-white">Welcome back!</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
              Simplify your construction workflow and boost site productivity with <span className="font-semibold text-black dark:text-white">Sanrachna</span>. Get started for free.
            </p>
          </div>

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <input
                id="id"
                name="id"
                className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-6 py-3.5 text-sm text-black dark:text-white outline-none transition-colors focus:border-black dark:focus:border-white"
                placeholder="Username or Email"
                required
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
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>

            <div className="flex justify-end pt-1 pb-1">
              <Link to="/forgot-password" className="text-[13px] font-medium text-black dark:text-white hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-black dark:bg-white py-4 text-sm font-medium text-white dark:text-black transition-opacity hover:opacity-90 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Social Logins */}
          <div className="mt-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative bg-white dark:bg-[#0a0a0a] px-4 text-[13px] text-gray-500 dark:text-gray-400">
                or continue with
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-6">
              <button type="button" className="flex size-[50px] items-center justify-center rounded-full bg-transparent border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                <GoogleIcon />
              </button>
              <button type="button" className="flex size-[50px] items-center justify-center rounded-full bg-transparent border border-gray-200 dark:border-gray-800 text-black dark:text-white transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                <AppleIcon />
              </button>
              <button type="button" className="flex size-[50px] items-center justify-center rounded-full bg-transparent border border-gray-200 dark:border-gray-800 text-[#1877F2] transition-all duration-300 hover:shadow-[0_0_20px_#1877F280] dark:hover:shadow-[0_0_20px_#1877F280]">
                <FacebookIcon />
              </button>
            </div>
          </div>

          <div className="mt-12 text-center text-[13px] text-gray-500 dark:text-gray-400">
            Not a member?{' '}
            <Link to="/signup" className="font-semibold text-green-600 dark:text-green-500 hover:underline">
              Register now
            </Link>
          </div>

        </div>
      </div>

      {/* ── RIGHT COLUMN: ILLUSTRATION ── */}
      <div className="hidden flex-1 p-6 lg:block">
        <div className="relative h-full w-full overflow-hidden rounded-[3rem] bg-black">
          <img 
            src="/city_night.png" 
            alt="City Night Architecture" 
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-700 hover:opacity-100"
          />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
          
          {/* Overlay Text */}
          <div className="absolute bottom-12 left-0 right-0 px-10 text-center">
            <h2 className="mx-auto max-w-[360px] text-[22px] font-medium leading-relaxed text-white">
              Make your construction management easier and organized with <span className="font-bold">Sanrachna</span>
            </h2>
            
            {/* Carousel Dots */}
            <div className="mt-8 flex justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white/40"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-white/40"></div>
              <div className="h-1.5 w-5 rounded-full bg-white"></div>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  )
}
