import { cn } from '@/utils/cn'

export function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  hint?: string
  disabled?: boolean
  onChange: (next: number) => void
}) {
  return (
    <label className={cn('block space-y-2', disabled && 'opacity-60')}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint ? <div className="text-xs text-[color:var(--color-text_secondary)]">{hint}</div> : null}
        </div>
        <div className="rounded-[var(--radius-xl)] border border-[color:var(--color-border)] bg-white px-2 py-1 text-sm font-bold tabular-nums">
          {value}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 outline-none',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--color-primary)] [&::-webkit-slider-thumb]:shadow-sm',
          '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[color:var(--color-primary)]',
        )}
      />
      <div className="flex justify-between text-[11px] font-medium text-[color:var(--color-text_muted)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  )
}

