import { type RefObject, useEffect, useRef } from 'react'

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const textFieldSelector = 'input:not([type]):not([readonly]), input[type="text"]:not([readonly]), input[type="email"]:not([readonly]), input[type="password"]:not([readonly])'

/** Dialog behaviour shared by modals and drawers: focus handling, Tab trapping, Escape, and scroll lock. */
export function useModal(panelRef: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return undefined

    const previous = document.activeElement as HTMLElement | null
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'

    const panel = panelRef.current
    const firstField = panel?.querySelector<HTMLElement>(textFieldSelector)
    const target = firstField ?? panel
    target?.focus({ preventScroll: true })

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter((item) => item.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      root.style.overflow = previousOverflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [open, panelRef])
}
