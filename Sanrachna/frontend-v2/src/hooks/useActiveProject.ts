import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useProjectsStore } from '@/store/useProjectsStore'

/**
 * Resolves the active project id from the URL (`?project=`) first, then the workspace selector.
 */
export function useActiveProject() {
  const [searchParams] = useSearchParams()
  const fromUrl = searchParams.get('project')
  const currentFromStore = useProjectsStore((s) => s.currentProjectId)
  const projects = useProjectsStore((s) => s.projects)

  const projectId = fromUrl && projects[fromUrl] && !projects[fromUrl]!.archived ? fromUrl : currentFromStore

  const project = useMemo(() => (projectId ? projects[projectId] : undefined), [projectId, projects])

  return { projectId, project, masterPlan: project?.masterPlan ?? null }
}
