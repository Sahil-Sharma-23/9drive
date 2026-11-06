import type { ReactNode } from 'react'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { ThemeToggle } from '@/components/drive/ThemeToggle'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** The centred card shared by sign-in pages and the Google hand-off screens. */
export function AuthShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center p-5 pt-20 sm:pt-5">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className={cn('w-full max-w-md animate-page-in p-6', className)}>{children}</Card>
    </main>
  )
}

export function AuthHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <BrandLogo className="h-11 w-11 shrink-0" />
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-fg">{title}</h1>
        <p className="text-sm text-fg-muted">{description}</p>
      </div>
    </div>
  )
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-fg-subtle">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
