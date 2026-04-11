import type { FormEvent } from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { apiCreateProject, messageFromApiError } from '@/api/projectTeamApi'
import { useTeamProjectStore } from '@/store/useTeamProjectStore'

type Props = {
  onCreated: (projectId: string) => void | Promise<void>
  onToast: (msg: string) => void
  disabled?: boolean
}

export function CreateProjectFormCard({ onCreated, onToast, disabled }: Props) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const loadProjects = useTeamProjectStore((s) => s.loadProjects)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Project name and site location are required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="space-y-3"
          onSubmit={async (e: FormEvent) => {
            e.preventDefault()
            const n = name.trim()
            const l = location.trim()
            if (!n || !l) {
              onToast('Enter project name and location.')
              return
            }
            setSubmitting(true)
            try {
              const { project } = await apiCreateProject({ name: n, location: l })
              setName('')
              setLocation('')
              await loadProjects()
              await onCreated(String(project.id))
              onToast('Project created.')
            } catch (err) {
              onToast(messageFromApiError(err))
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="cpName">
                Project name <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="cpName"
                name="name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunrise Residency"
                disabled={disabled || submitting}
                required
                minLength={1}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cpLoc">
                Location <span className="text-[color:var(--color-error)]">*</span>
              </label>
              <Input
                id="cpLoc"
                name="location"
                className="mt-1.5"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City / region"
                disabled={disabled || submitting}
                required
                minLength={1}
                autoComplete="off"
              />
            </div>
          </div>
          <Button type="submit" disabled={disabled || submitting}>
            {submitting ? 'Creating…' : 'Create project'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
