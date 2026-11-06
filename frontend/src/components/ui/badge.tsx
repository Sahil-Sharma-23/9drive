import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line bg-surface-sunken text-fg-muted',
  accent: 'border-accent-line bg-accent-soft text-accent',
  success: 'border-success-line bg-success-soft text-success',
  warning: 'border-warning-line bg-warning-soft text-warning',
  danger: 'border-danger-line bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return <span className={cn('inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize', tones[tone], className)}>{children}</span>
}
