import { Building2, Shield } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { AddTeamMembersPanel } from '@/components/team/AddTeamMembersPanel'
import { CreateProjectFormCard } from '@/components/team/CreateProjectFormCard'
import { TeamMembersTable } from '@/components/team/TeamMembersTable'
import { useTeamProjectStore } from '@/store/useTeamProjectStore'

export function CreateProjectPage() {
  const { role, token } = useAuth()
  const projects = useTeamProjectStore((s) => s.projects)
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
    if (role !== 'owner' || !token) return
    void loadProjects()
  }, [role, token, loadProjects])

  useEffect(() => {
    if (!projects.length) {
      setProjectId(null)
      return
    }
    setProjectId((cur) => (cur && projects.some((p) => p.id === cur) ? cur : projects[0]!.id))
  }, [projects])

  useEffect(() => {
    if (!projectId || role !== 'owner') return
    void loadTeam(projectId)
  }, [projectId, loadTeam, role])

  const members = projectId ? membersByProjectId[projectId] ?? [] : []

  const refreshTeam = useCallback(async () => {
    if (!projectId) return
    await loadTeam(projectId)
    await loadProjects()
  }, [projectId, loadTeam, loadProjects])

  if (role !== 'owner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-[color:var(--color-warning)]" />
            Create project
          </CardTitle>
          <CardDescription>Only Owner accounts can create projects.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[color:var(--color-text_secondary)]">
          Engineers manage workers under Profile & Settings → Team Management. Workers use My Tasks only.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm font-semibold text-[color:var(--color-text)]">
          {toast}
        </div>
      ) : null}

      <div>
        <h1 className="text-xl font-bold tracking-tight text-[color:var(--color-text)]">Create project</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
          Owners create the workspace, then assign engineers to the selected project.
        </p>
      </div>

      <CreateProjectFormCard
        disabled={!token}
        onToast={showToast}
        onCreated={async (id) => {
          setProjectId(id)
          await loadTeam(id)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-[color:var(--color-primary_dark)]" />
            Add engineers
          </CardTitle>
          <CardDescription>Search by username (display name) and add engineers to the selected project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddTeamMembersPanel
            targetAddRole="engineer"
            projectChoices={projects}
            projectId={projectId}
            onProjectIdChange={setProjectId}
            memberIdsOnProject={members.map((m) => m.id)}
            disabled={!token}
            onToast={showToast}
            onAdded={refreshTeam}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>Name, role, status, and actions for the selected project.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMembersTable
            viewer="owner"
            projectId={projectId}
            members={members}
            onToast={showToast}
            onRefresh={refreshTeam}
          />
        </CardContent>
      </Card>
    </div>
  )
}
