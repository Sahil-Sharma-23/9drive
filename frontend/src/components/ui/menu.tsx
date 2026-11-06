import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { useLatestWhile, usePresence } from '@/lib/use-presence'
import { cn } from '@/lib/utils'

const viewportMargin = 12

/** A context menu: anchored to the pointer on desktop, a bottom sheet on phones. */
export function MenuPanel({ open, x, y, width = 224, label, onClose, children }: { open: boolean; x: number; y: number; width?: number; label: string; onClose: () => void; children: ReactNode }) {
  const { mounted, state } = usePresence(open, 180)
  const panelRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<CSSProperties>()
  const content = useLatestWhile(children, open)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    if (window.innerWidth < 640) {
      setPlacement(undefined)
      return
    }
    const left = Math.max(viewportMargin, Math.min(x, window.innerWidth - width - viewportMargin))
    const top = Math.max(viewportMargin, Math.min(y, window.innerHeight - panel.offsetHeight - viewportMargin))
    setPlacement({ left, top, transformOrigin: `${x > left ? 'right' : 'left'} ${y > top ? 'bottom' : 'top'}` })
  }, [open, x, y, width])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })
    return () => {
      const active = document.activeElement
      if (!active || active === document.body || panelRef.current?.contains(active)) previous?.focus?.({ preventScroll: true })
    }
  }, [open])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.stopPropagation()
      onClose()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    const current = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  if (!mounted) return null

  return createPortal(
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        data-state={state}
        className="fixed inset-0 z-40 cursor-default max-sm:bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        onClick={open ? onClose : undefined}
        onContextMenu={(event) => {
          event.preventDefault()
          if (open) onClose()
        }}
      />
      <div
        ref={panelRef}
        role="menu"
        aria-label={label}
        inert={!open}
        data-state={state}
        style={window.innerWidth < 640 ? undefined : { width, ...placement }}
        onKeyDown={onKeyDown}
        className="fixed z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-line bg-surface-raised shadow-pop max-sm:inset-x-3 max-sm:bottom-3 data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in sm:data-[state=closed]:animate-pop-out sm:data-[state=open]:animate-pop-in"
      >
        {content}
      </div>
    </>,
    document.body,
  )
}

export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="border-b border-line bg-surface-sunken px-3.5 py-3">{children}</div>
}

export function MenuGroup({ children }: { children: ReactNode }) {
  return <div className="p-1.5">{children}</div>
}

export function MenuDivider() {
  return <div role="separator" className="my-1 h-px bg-line" />
}

type MenuItemTone = 'default' | 'accent' | 'danger'

const itemTones: Record<MenuItemTone, { item: string; icon: string }> = {
  default: { item: 'text-fg hover:bg-surface-hover focus-visible:bg-surface-hover', icon: 'bg-surface-hover text-fg-muted group-hover:text-fg' },
  accent: { item: 'text-accent hover:bg-accent-soft focus-visible:bg-accent-soft', icon: 'bg-accent-soft text-accent' },
  danger: { item: 'text-danger hover:bg-danger-soft focus-visible:bg-danger-soft', icon: 'bg-danger-soft text-danger' },
}

export function MenuItem({ icon: Icon, label, onClick, tone = 'default', kbd }: { icon: LucideIcon; label: string; onClick: () => void; tone?: MenuItemTone; kbd?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn('group flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-semibold outline-none transition-colors duration-100', itemTones[tone].item)}
    >
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-100', itemTones[tone].icon)}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      {kbd ? <kbd className="hidden rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 font-sans text-[10px] font-medium text-fg-muted sm:inline">{kbd}</kbd> : null}
    </button>
  )
}
