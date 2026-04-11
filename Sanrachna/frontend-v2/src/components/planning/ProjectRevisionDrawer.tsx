import { History, X } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/Button'
import { useProjectsStore } from '@/store/useProjectsStore'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

type ProjectRevisionDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectRevisionDrawer({ open, onOpenChange }: ProjectRevisionDrawerProps) {
  const project = useProjectsStore((s) => {
    const id = s.currentProjectId
    return id ? s.projects[id] : undefined
  })

  const rows = useMemo(() => {
    if (!project) return []
    const plan = project.planVersions.map((v) => ({
      kind: 'version' as const,
      at: v.createdAt,
      title: v.label,
      detail: 'Approved plan snapshot stored.',
    }))
    const edits = project.editHistory.map((e) => ({
      kind: 'edit' as const,
      at: e.at,
      title: e.summary,
      detail: `${e.actor} · modules: ${e.modulesAffected.slice(0, 3).join(', ')}${e.modulesAffected.length > 3 ? '…' : ''}`,
    }))
    return [...plan, ...edits].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [project])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close history"
        className="fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-card)]',
        )}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="size-5 text-[color:var(--color-text_muted)]" />
            <div>
              <div className="text-sm font-bold text-[color:var(--color-text)]">Project history</div>
              <div className="text-xs text-[color:var(--color-text_muted)]">{project?.name ?? '—'}</div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {rows.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text_secondary)]">
              No revisions yet. Approve a plan to create version snapshots; manual edits will appear here in production.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((r, i) => (
                <li
                  key={`${r.kind}-${i}-${r.at}`}
                  className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-3"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-text_muted)]">
                    {r.kind === 'version' ? 'Plan version' : 'Change log'} · {formatDate(r.at)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{r.title}</div>
                  <div className="mt-1 text-xs text-[color:var(--color-text_secondary)]">{r.detail}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
