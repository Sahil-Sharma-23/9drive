import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<ProgressTone, string> = {
  accent: 'bg-accent-gradient',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
}

export function Progress({ value, tone = 'accent', label, className }: { value: number; tone?: ProgressTone; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} className={cn('h-2 overflow-hidden rounded-full bg-surface-hover', className)}>
      <div className={cn('progress-fill', tones[tone])} style={{ '--value': clamped } as CSSProperties} />
    </div>
  )
}
