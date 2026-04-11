import { useEffect } from 'react'

import { useAuth } from '@/auth/AuthContext'
import { useProjectsStore } from '@/store/useProjectsStore'

/** Loads workspace list from the API once the user is authenticated. */
export function WorkspaceBootstrap() {
  const { isAuthed, role } = useAuth()
  const fetchProjects = useProjectsStore((s) => s.fetchProjects)

  useEffect(() => {
    if (!isAuthed || !role) return
    void fetchProjects()
  }, [isAuthed, role, fetchProjects])

  return null
}
