import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Field({ label, hint, className, children }: { label: ReactNode; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={cn('grid gap-1.5 text-sm font-semibold text-fg', className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-fg-muted">{hint}</span> : null}
    </label>
  )
}
