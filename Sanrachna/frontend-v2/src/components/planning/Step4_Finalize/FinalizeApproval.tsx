import { useNavigate } from 'react-router-dom'

import { moduleHref, PROJECT_MODULE_CARDS } from '@/planning/projectModules'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useProjectsStore } from '@/store/useProjectsStore'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

export function FinalizeApproval() {
  const navigate = useNavigate()
  const project = useProjectsStore((s) => {
    const id = s.currentProjectId
    return id ? s.projects[id] : undefined
  })

  const projectId = project?.id

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--color-text)]">Plan approved</h2>
        <p className="mt-1 text-sm text-[color:var(--color-text_secondary)]">
          Downstream modules are synced with the approved master plan. Open any module to work with data populated for{' '}
          <span className="font-medium text-[color:var(--color-text)]">{project?.name ?? 'this project'}</span>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECT_MODULE_CARDS.map((def, i) => {
          const sync = projectId ? project?.moduleSync[def.key] : undefined
          const version = sync?.versionLabel ?? project?.currentVersionLabel ?? '—'
          const lastSynced = sync?.lastSyncedAt ? formatRelativeTime(sync.lastSyncedAt) : '—'
          const tasks = sync?.taskCount ?? '—'
          const status = sync?.status ?? 'Pending'

          return (
            <Card
              key={def.key}
              className={cn(
                'planning-stagger-in flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-soft)]',
              )}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{def.title}</CardTitle>
                <CardDescription>{def.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex flex-1 flex-col gap-3 pt-0">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[color:var(--color-text_muted)]">Version</dt>
                    <dd className="font-semibold text-[color:var(--color-text)]">{version}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text_muted)]">Last synced</dt>
                    <dd className="font-semibold text-[color:var(--color-text)]">{lastSynced}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text_muted)]">Tasks</dt>
                    <dd className="font-semibold text-[color:var(--color-text)]">{tasks}</dd>
                  </div>
                  <div>
                    <dt className="text-[color:var(--color-text_muted)]">Status</dt>
                    <dd className="font-semibold text-[color:var(--color-text)]">{status}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!projectId}
                  onClick={() => projectId && navigate(moduleHref(projectId, def))}
                >
                  {def.buttonLabel}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/app')}>
        Go to project dashboard →
      </Button>
    </div>
  )
}
