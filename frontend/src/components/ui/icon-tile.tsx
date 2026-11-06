import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconTileTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<IconTileTone, string> = {
  neutral: 'bg-surface-hover text-fg-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

const sizes = {
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5' },
}

export function IconTile({ icon: Icon, tone = 'accent', size = 'md', className }: { icon: LucideIcon; tone?: IconTileTone; size?: keyof typeof sizes; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', sizes[size].box, tones[tone], className)}>
      <Icon className={sizes[size].icon} aria-hidden="true" />
    </span>
  )
}
