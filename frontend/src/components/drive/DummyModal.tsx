import { type ReactNode, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useModal } from '@/lib/use-modal'
import { useLatestWhile, usePresence } from '@/lib/use-presence'
import { cn } from '@/lib/utils'

export function DummyModal({ open, title, description, children, onClose, className }: { open: boolean; title: string; description: string; children: ReactNode; onClose: () => void; className?: string }) {
  const { mounted, state } = usePresence(open, 180)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const content = useLatestWhile({ title, description, children }, open)
  useModal(panelRef, open, onClose)

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss"
        data-state={state}
        className="absolute inset-0 cursor-default bg-scrim backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        onClick={open ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        inert={!open}
        data-state={state}
        className={cn(
          'relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface-raised p-5 shadow-pop outline-none sm:max-w-md sm:rounded-2xl',
          'data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in sm:data-[state=closed]:animate-pop-out sm:data-[state=open]:animate-pop-in',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-fg">{content.title}</h2>
            {content.description ? <p className="mt-1 break-words text-sm text-fg-muted">{content.description}</p> : null}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close modal" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-5">{content.children}</div>
      </div>
    </div>,
    document.body,
  )
}
