import { useActiveProject } from '@/hooks/useActiveProject'

/** Compact banner when navigating from AI Planning Studio with `?project=`. */
export function ProjectContextBanner() {
  const { project, masterPlan } = useActiveProject()
  if (!project) return null

  return (
    <div className="mb-4 rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-4 py-3 text-sm shadow-[var(--shadow-soft)]">
      <span className="text-[color:var(--color-text_secondary)]">Active project </span>
      <span className="font-semibold text-[color:var(--color-text)]">{project.name}</span>
      {masterPlan ? (
        <>
          <span className="text-[color:var(--color-text_secondary)]"> · Plan </span>
          <span className="font-medium text-[color:var(--color-primary_dark)]">{project.currentVersionLabel}</span>
        </>
      ) : (
        <span className="text-[color:var(--color-text_muted)]"> · No approved master plan yet</span>
      )}
    </div>
  )
}
