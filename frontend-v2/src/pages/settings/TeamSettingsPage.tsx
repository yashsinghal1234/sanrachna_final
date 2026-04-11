import { ExternalLink, Lock, Shield } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth, type Role } from '@/auth/AuthContext'
import { cn } from '@/utils/cn'
import { buttonVariants } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AddTeamMembersPanel } from '@/components/team/AddTeamMembersPanel'
import { TeamMembersTable } from '@/components/team/TeamMembersTable'
import { useTeamProjectStore } from '@/store/useTeamProjectStore'

export function TeamSettingsPage() {
  const { role, token } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'
  const mode = useMemo(() => {
    if (resolvedRole === 'owner') return 'owner'
    if (resolvedRole === 'engineer') return 'engineer'
    return 'worker'
  }, [resolvedRole])

  const projects = useTeamProjectStore((s) => s.projects)
  const projectsError = useTeamProjectStore((s) => s.projectsError)
  const loadProjects = useTeamProjectStore((s) => s.loadProjects)
  const loadTeam = useTeamProjectStore((s) => s.loadTeam)
  const membersByProjectId = useTeamProjectStore((s) => s.membersByProjectId)

  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((s: string) => {
    setToast(s)
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'worker' || !token) return
    void loadProjects()
  }, [mode, token, loadProjects])

  useEffect(() => {
    if (!projects.length) {
      setProjectId(null)
      return
    }
    setProjectId((cur) => (cur && projects.some((p) => p.id === cur) ? cur : projects[0]!.id))
  }, [projects])

  useEffect(() => {
    if (!projectId || mode === 'worker') return
    void loadTeam(projectId)
  }, [projectId, loadTeam, mode])

  const members = projectId ? membersByProjectId[projectId] ?? [] : []

  const refreshTeam = useCallback(async () => {
    if (!projectId) return
    await loadTeam(projectId)
    await loadProjects()
  }, [projectId, loadTeam, loadProjects])

  if (mode === 'worker') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-[color:var(--color-warning)]" />
            Team Management
          </CardTitle>
          <CardDescription>Workers do not have team management access.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[color:var(--color-text_secondary)]">
          Use My Tasks for assignments. Contact your engineer or owner for access changes.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm font-semibold text-[color:var(--color-text)]">
          {toast}
        </div>
      ) : null}

      {projectsError ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3 text-sm text-[color:var(--color-error)]">
          {projectsError}
        </div>
      ) : null}

      {mode === 'owner' ? (
        <Card className="border-[color:var(--color-primary_light)]/40 bg-[color:var(--color-primary_light)]/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Project creation</CardTitle>
            <CardDescription>
              Create new sites and assign engineers from the dedicated workspace (recommended).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Link
              to="/app/create-project"
              className={cn(buttonVariants({ variant: 'secondary', size: 'md' }))}
            >
              Open Create Project
              <ExternalLink className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-[color:var(--color-primary_dark)]" />
            {mode === 'owner' ? 'Team Management' : 'Your project team'}
          </CardTitle>
          <CardDescription>
            {mode === 'owner'
              ? 'Manage engineers on your projects. Project creation lives under Create Project.'
              : 'View members for projects you are assigned to, and add workers by username.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!projects.length && mode === 'engineer' ? (
            <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
              <div className="text-sm font-semibold">No project assigned</div>
              <div className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
                Ask an owner to create a project and add you as an engineer.
              </div>
            </div>
          ) : null}

          {projects.length ? (
            <>
              {mode === 'engineer' ? (
                <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm text-[color:var(--color-text_secondary)]">
                  <span className="font-semibold text-[color:var(--color-text)]">Assigned projects</span> — select a
                  project to load its roster. Changes sync for everyone on the project.
                </div>
              ) : null}

              <AddTeamMembersPanel
                targetAddRole={mode === 'owner' ? 'engineer' : 'worker'}
                projectChoices={projects}
                projectId={projectId}
                onProjectIdChange={setProjectId}
                memberIdsOnProject={members.map((m) => m.id)}
                disabled={!token}
                onToast={showToast}
                onAdded={refreshTeam}
              />

              <div>
                <div className="mb-2 text-sm font-semibold text-[color:var(--color-text)]">Team roster</div>
                <TeamMembersTable
                  viewer={mode === 'owner' ? 'owner' : 'engineer'}
                  projectId={projectId}
                  members={members}
                  onToast={showToast}
                  onRefresh={refreshTeam}
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
