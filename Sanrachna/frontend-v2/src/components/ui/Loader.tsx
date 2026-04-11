import { cn } from '@/utils/cn'

export function Loader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'size-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900',
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-muted">
      <Loader className="size-8 border-t-phase-structure" />
      <span>Loading workspace…</span>
    </div>
  )
}
