import { type RefObject, useEffect, useRef } from 'react'

/** Calls `onDismiss` on Escape or on a press outside `ref` while `open`. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onDismiss: () => void) {
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss

  useEffect(() => {
    if (!open) return undefined

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) dismiss.current()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss.current()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, ref])
}
