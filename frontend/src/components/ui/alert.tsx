import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<AlertTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'border-accent-line bg-accent-soft', icon: 'text-accent', Icon: Info },
  success: { box: 'border-success-line bg-success-soft', icon: 'text-success', Icon: CheckCircle2 },
  warning: { box: 'border-warning-line bg-warning-soft', icon: 'text-warning', Icon: TriangleAlert },
  danger: { box: 'border-danger-line bg-danger-soft', icon: 'text-danger', Icon: CircleAlert },
}

export function Alert({ tone = 'info', icon, className, children }: { tone?: AlertTone; icon?: LucideIcon; className?: string; children: ReactNode }) {
  const { box, icon: iconClass, Icon: DefaultIcon } = tones[tone]
  const Icon = icon ?? DefaultIcon
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex animate-rise items-start gap-2.5 rounded-xl border p-3 text-sm font-medium text-fg', box, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  )
}
