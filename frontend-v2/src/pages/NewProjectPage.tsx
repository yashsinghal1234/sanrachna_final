import { ArrowRight } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Loader } from '@/components/ui/Loader'

const inputClass =
  'mt-1.5 flex min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60'

export function NewProjectPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    window.setTimeout(() => {
      setLoading(false)
      navigate('/estimation')
    }, 900)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">New project</h1>
        <p className="mt-1 text-sm text-muted">
          Capture scope inputs — in production this posts to{' '}
          <span className="font-mono text-xs">POST /api/generate-plan</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project brief</CardTitle>
          <CardDescription>Plain-language facts the estimation engine uses for RAG retrieval</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="projectType">
                Project type
              </label>
              <select id="projectType" className={inputClass} defaultValue="residential_rcc" required>
                <option value="residential_rcc">RCC frame — residential mid-rise</option>
                <option value="commercial_shell">Commercial shell & core</option>
                <option value="industrial_warehouse">Industrial warehouse</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="location">
                Location
              </label>
              <Input id="location" defaultValue="Pune, Maharashtra" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="area">
                  Built-up area (m²)
                </label>
                <Input id="area" type="number" min={100} defaultValue={4200} required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-800" htmlFor="deadline">
                  Target completion
                </label>
                <Input id="deadline" type="date" defaultValue="2026-11-30" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-800" htmlFor="materials">
                Primary material palette
              </label>
              <select id="materials" className={inputClass} defaultValue="standard_dsr" required>
                <option value="standard_dsr">Standard CPWD / RSMeans basket</option>
                <option value="premium_finishes">Premium finishes upgrade</option>
                <option value="economy_spec">Economy spec (value engineering)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Back
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[160px]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader className="size-4 border-t-white" />
                    Generating…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Generate plan
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
