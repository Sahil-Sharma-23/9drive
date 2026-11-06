import type { ReactNode } from 'react'
import { CloudOff, type LucideIcon } from 'lucide-react'
import { IconTile } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, description, action, className }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex animate-rise flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <IconTile icon={icon} tone="neutral" />
      <p className="mt-3 text-base font-bold text-fg">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/** Shown instead of an empty state when a list failed to load, so the page never claims it's empty. */
export function LoadFailedState({ className }: { className?: string }) {
  return <EmptyState icon={CloudOff} title="Couldn't load this" description="Check your connection, then refresh the page." className={className} />
}
