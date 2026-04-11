import { Archive, ChevronDown, Copy, FolderPlus } from 'lucide-react'
import { useState } from 'react'

import { isBackendConfigured } from '@/api/http'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useProjectsStore } from '@/store/useProjectsStore'
import { cn } from '@/utils/cn'

export function ProjectSelectorBar({ className }: { className?: string }) {
  const backend = isBackendConfigured()
  const projects = useProjectsStore((s) => s.projects)
  const currentProjectId = useProjectsStore((s) => s.currentProjectId)
  const setCurrentProjectId = useProjectsStore((s) => s.setCurrentProjectId)
  const createProject = useProjectsStore((s) => s.createProject)
  const duplicateProject = useProjectsStore((s) => s.duplicateProject)
  const archiveProject = useProjectsStore((s) => s.archiveProject)

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [dupOpen, setDupOpen] = useState(false)
  const [archOpen, setArchOpen] = useState(false)

  const list = Object.values(projects).filter((p) => !p.archived)
  const current = currentProjectId ? projects[currentProjectId] : undefined

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-2xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
          {backend ? 'Workspace project' : 'Current project'}
        </span>
        <div className="relative min-w-[200px] max-w-md flex-1">
          <select
            className="h-10 w-full appearance-none rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 pr-9 text-sm font-semibold text-[color:var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]/35"
            value={currentProjectId ?? ''}
            onChange={(e) => setCurrentProjectId(e.target.value || null)}
            aria-label="Select project"
          >
            {list.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-text_muted)]" />
        </div>
        {backend ? (
          <p className="w-full text-xs text-[color:var(--color-text_secondary)]">
            Projects are loaded from your account. Create or manage sites under Create Project / Team Management; planning
            data saves to the database for the selected project.
          </p>
        ) : null}
      </div>

      {backend ? null : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(true)}>
            <FolderPlus className="size-4" />
            New project
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!currentProjectId}
            onClick={() => setDupOpen(true)}
          >
            <Copy className="size-4" />
            Duplicate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!currentProjectId}
            onClick={() => setArchOpen(true)}
          >
            <Archive className="size-4" />
            Archive
          </Button>
        </div>
      )}

      {!backend ? (
        <>
      <Modal
        open={newOpen}
        onOpenChange={setNewOpen}
        title="New project"
        description="Creates an empty planning workspace. You can run AI Planning Studio per project."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const name = newName.trim() || 'New project'
                void createProject(name)
                  .then(() => {
                    setNewName('')
                    setNewOpen(false)
                  })
                  .catch(() => {
                    // Surface error in a later toast; workspace list will show backend issues
                  })
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-[color:var(--color-text_secondary)]">
          Project name
          <input
            className="mt-1.5 w-full rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Riverside Tower B"
          />
        </label>
      </Modal>

      <Modal
        open={dupOpen}
        onOpenChange={setDupOpen}
        title="Duplicate project?"
        description={`Copy "${current?.name ?? ''}" including saved plans and history into a new workspace.`}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setDupOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (currentProjectId) duplicateProject(currentProjectId)
                setDupOpen(false)
              }}
            >
              Duplicate
            </Button>
          </>
        }
      />

      <Modal
        open={archOpen}
        onOpenChange={setArchOpen}
        title="Archive project?"
        description="Archived projects are hidden from the selector. You can restore later in a full build."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setArchOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (currentProjectId) archiveProject(currentProjectId)
                setArchOpen(false)
              }}
            >
              Archive
            </Button>
          </>
        }
      />
        </>
      ) : null}
    </div>
  )
}
