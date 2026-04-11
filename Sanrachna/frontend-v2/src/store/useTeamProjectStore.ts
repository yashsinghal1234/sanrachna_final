import { create } from 'zustand'

import {
  apiGetTeam,
  apiListProjects,
  messageFromApiError,
  type ProjectListItem,
} from '@/api/projectTeamApi'

export type TeamMemberRow = {
  id: string
  name: string
  role: 'owner' | 'engineer' | 'worker'
  status: string
}

function normalizeMembers(raw: unknown[]): TeamMemberRow[] {
  return raw.map((m) => {
    const o = m as { id?: string; name?: string; role?: string; status?: string }
    return {
      id: String(o.id ?? ''),
      name: String(o.name ?? ''),
      role: (o.role as TeamMemberRow['role']) ?? 'worker',
      status: String(o.status ?? 'Active'),
    }
  })
}

type TeamProjectState = {
  projects: ProjectListItem[]
  membersByProjectId: Record<string, TeamMemberRow[]>
  projectsError: string | null

  setProjects: (projects: ProjectListItem[]) => void
  setMembers: (projectId: string, members: TeamMemberRow[]) => void
  reset: () => void

  /** Loads project list from API and updates global store (Owner + Engineer views). */
  loadProjects: () => Promise<void>
  /** Loads team for one project and caches it. */
  loadTeam: (projectId: string) => Promise<TeamMemberRow[]>
}

export const useTeamProjectStore = create<TeamProjectState>((set, get) => ({
  projects: [],
  membersByProjectId: {},
  projectsError: null,

  setProjects: (projects) => set({ projects, projectsError: null }),

  setMembers: (projectId, members) =>
    set((s) => ({
      membersByProjectId: { ...s.membersByProjectId, [projectId]: members },
    })),

  reset: () => set({ projects: [], membersByProjectId: {}, projectsError: null }),

  loadProjects: async () => {
    try {
      const { projects } = await apiListProjects()
      set({ projects, projectsError: null })
    } catch (e) {
      set({ projects: [], projectsError: messageFromApiError(e) })
    }
  },

  loadTeam: async (projectId: string) => {
    const { members } = await apiGetTeam(projectId)
    const rows = normalizeMembers(members || [])
    get().setMembers(projectId, rows)
    return rows
  },
}))
