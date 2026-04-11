import { Building2, CalendarDays, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth, type Role } from '@/auth/AuthContext'
import {
  apiGetProject,
  apiPatchProjectSettings,
  messageFromApiError,
  type ProjectDetailDto,
} from '@/api/projectTeamApi'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useActiveProject } from '@/hooks/useActiveProject'
import { useProjectsStore } from '@/store/useProjectsStore'
import { useTeamProjectStore } from '@/store/useTeamProjectStore'

function emptyDraft(): ProjectDetailDto {
  return {
    id: '',
    name: '',
    location: '',
    startDate: '',
    deadline: '',
    status: 'Active',
    scheduleNotes: '',
  }
}

export function ProjectSettingsPage() {
  const { role, token } = useAuth()
  const resolvedRole: Role = role ?? 'engineer'

  const projects = useTeamProjectStore((s) => s.projects)
  const loadProjects = useTeamProjectStore((s) => s.loadProjects)
  const projectsError = useTeamProjectStore((s) => s.projectsError)
  const { projectId: workspaceProjectId } = useActiveProject()

  const allowed = resolvedRole === 'owner' || resolvedRole === 'engineer'
  const canDangerZone = resolvedRole === 'owner'

  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProjectDetailDto>(emptyDraft)
  const [saved, setSaved] = useState<string | null>(null)
  const [demoNote, setDemoNote] = useState<string | null>(null)

  const subtext = useMemo(() => {
    if (!allowed) return 'Only Owner/Engineer can edit project settings.'
    if (resolvedRole === 'engineer') return 'Engineer can update schedule fields. Name and site location are owner-only.'
    return 'Owner has full edit access. All fields below are required when you save.'
  }, [allowed, resolvedRole])

  useEffect(() => {
    if (!allowed || !token) return
    void loadProjects()
  }, [allowed, token, loadProjects])

  useEffect(() => {
    if (!projects.length) {
      setProjectId(null)
      return
    }
    setProjectId((cur) => (cur && projects.some((p) => p.id === cur) ? cur : projects[0]!.id))
  }, [projects])

  useEffect(() => {
    if (!workspaceProjectId || !projects.some((p) => p.id === workspaceProjectId)) return
    setProjectId(workspaceProjectId)
  }, [workspaceProjectId, projects])

  const fetchProject = useCallback(async (id: string) => {
    setLoading(true)
    setLoadError(null)
    try {
      const { project } = await apiGetProject(id)
      setDraft({
        id: project.id,
        name: project.name,
        location: project.location,
        startDate: project.startDate ?? '',
        deadline: project.deadline ?? '',
        status: project.status ?? 'Active',
        scheduleNotes: project.scheduleNotes ?? '',
      })
    } catch (e) {
      setLoadError(messageFromApiError(e))
      setDraft(emptyDraft())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!projectId || !token) return
    void fetchProject(projectId)
  }, [projectId, token, fetchProject])

  const cancel = () => {
    if (projectId) void fetchProject(projectId)
    setEditing(false)
  }

  const save = async () => {
    if (!projectId) return
    const n = draft.name.trim()
    const loc = draft.location.trim()
    const sd = draft.startDate?.trim() ?? ''
    const dl = draft.deadline?.trim() ?? ''
    const st = draft.status?.trim() || 'Active'
    const notes = draft.scheduleNotes?.trim() ?? ''

    if (!sd || !dl || !st || !notes) {
      setSaved(null)
      setLoadError('Start date, deadline, status, and schedule notes are required.')
      return
    }
    if (resolvedRole === 'owner' && (!n || !loc)) {
      setLoadError('Project name and location are required.')
      return
    }

    setSaving(true)
    setLoadError(null)
    try {
      const body =
        resolvedRole === 'owner'
          ? { name: n, location: loc, startDate: sd, deadline: dl, status: st, scheduleNotes: notes }
          : { startDate: sd, deadline: dl, status: st, scheduleNotes: notes }
      const { project } = await apiPatchProjectSettings(projectId, body)
      setDraft({
        id: project.id,
        name: project.name,
        location: project.location,
        startDate: project.startDate ?? '',
        deadline: project.deadline ?? '',
        status: project.status ?? 'Active',
        scheduleNotes: project.scheduleNotes ?? '',
      })
      setDemoNote(null)
      setSaved('Project settings saved.')
      setEditing(false)
      window.setTimeout(() => setSaved(null), 2600)
      await loadProjects()
      await useProjectsStore.getState().fetchProjects()
    } catch (e) {
      setLoadError(messageFromApiError(e))
    } finally {
      setSaving(false)
    }
  }

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-[color:var(--color-primary_dark)]" />
            Project Settings
          </CardTitle>
          <CardDescription>{subtext}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[color:var(--color-text_secondary)]">
          Worker access is limited to execution views. Switch to Engineer/Owner to manage project settings.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-[color:var(--color-primary_dark)]" />
            Project Settings
          </CardTitle>
          <CardDescription>{subtext}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectsError ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3 text-sm text-[color:var(--color-error)]">
              {projectsError}
            </div>
          ) : null}
          {loadError ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-error)]/30 bg-[color:var(--color-error)]/10 p-3 text-sm text-[color:var(--color-error)]">
              {loadError}
            </div>
          ) : null}

          {projects.length > 1 ? (
            <div>
              <label className="text-sm font-medium" htmlFor="projPick">
                Project
              </label>
              <select
                id="projPick"
                className="mt-1.5 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-2 text-sm"
                value={projectId ?? ''}
                disabled={editing}
                onChange={(e) => setProjectId(e.target.value || null)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!projects.length ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 text-sm text-[color:var(--color-text_secondary)]">
              No projects found. Create one under Create Project (owners) or ask an owner to assign you.
            </div>
          ) : loading ? (
            <div className="text-sm text-[color:var(--color-text_muted)]">Loading project…</div>
          ) : (
            <div className="rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="projectName">
                    Project Name {resolvedRole === 'owner' ? <span className="text-[color:var(--color-error)]">*</span> : null}
                  </label>
                  <Input
                    id="projectName"
                    required={resolvedRole === 'owner'}
                    disabled={!editing || resolvedRole !== 'owner'}
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="location">
                    Location {resolvedRole === 'owner' ? <span className="text-[color:var(--color-error)]">*</span> : null}
                  </label>
                  <Input
                    id="location"
                    required={resolvedRole === 'owner'}
                    disabled={!editing || resolvedRole !== 'owner'}
                    value={draft.location}
                    onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="startDate">
                    Start Date <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    disabled={!editing}
                    value={draft.startDate}
                    onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="deadline">
                    Deadline <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input
                    id="deadline"
                    type="date"
                    required
                    disabled={!editing}
                    value={draft.deadline}
                    onChange={(e) => setDraft((p) => ({ ...p, deadline: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium" htmlFor="status">
                    Status <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <select
                    id="status"
                    required
                    disabled={!editing}
                    value={draft.status}
                    onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                    className="mt-1.5 h-10 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium" htmlFor="scheduleNotes">
                    Project schedule notes <span className="text-[color:var(--color-error)]">*</span>
                  </label>
                  <Input
                    id="scheduleNotes"
                    required
                    disabled={!editing}
                    value={draft.scheduleNotes}
                    onChange={(e) => setDraft((p) => ({ ...p, scheduleNotes: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {saved ? (
                <div className="mt-3 rounded-[var(--radius-xl)] border border-[color:var(--color-success)]/40 bg-[color:var(--color-success)]/10 p-3 text-sm font-semibold text-[color:var(--color-success)]">
                  {saved}
                </div>
              ) : null}
              {demoNote ? (
                <div className="mt-3 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 text-sm font-semibold text-[color:var(--color-text)]">
                  {demoNote}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {!editing ? (
              <Button type="button" disabled={!projectId || loading} onClick={() => setEditing(true)}>
                Edit Project
              </Button>
            ) : (
              <>
                <Button type="button" disabled={saving || !projectId} onClick={() => void save()}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" disabled={saving} onClick={cancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-[color:var(--color-warning)]" />
            Danger Zone
          </CardTitle>
          <CardDescription>Archive/Delete are owner-only (demo).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canDangerZone ? (
            <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-sm text-[color:var(--color-text_secondary)]">
              Engineer cannot archive/delete unless explicitly permitted.
            </div>
          ) : (
            <>
              <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <CalendarDays className="size-4 text-[color:var(--color-error)]" />
                  Risk: data retention impact
                </div>
                <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">
                  In production, this would require confirmation + backend audit log.
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => setDemoNote('Project archived (demo).')}>
                  Archive Project
                </Button>
                <Button type="button" variant="danger" onClick={() => setDemoNote('Project deleted (demo).')}>
                  Delete Project
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
