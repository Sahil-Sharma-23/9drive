import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SegmentedOption<T extends string> = { value: T; label: ReactNode; ariaLabel?: string }

/** A small single-choice switch. The thumb slides between equal-width segments. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: { options: SegmentedOption<T>[]; value: T; onChange: (value: T) => void; label: string; className?: string }) {
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  return (
    <div role="group" aria-label={label} className={cn('relative inline-grid shrink-0 auto-cols-fr grid-flow-col rounded-xl border border-line bg-surface-sunken p-0.5', className)}>
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-[10px] border border-line bg-surface-raised shadow-sm transition-transform duration-200 ease-soft"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.ariaLabel}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn('relative flex h-8 min-w-9 items-center justify-center rounded-[10px] px-2.5 text-[11px] font-bold tracking-wide transition-colors duration-150', option.value === value ? 'text-fg' : 'text-fg-subtle hover:text-fg')}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
