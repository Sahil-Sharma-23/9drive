import { useEffect, useRef, useState } from 'react'

/** Keeps closing UI mounted long enough to play its exit animation. */
export function usePresence(open: boolean, exitMs = 160) {
  const [rendered, setRendered] = useState(open)

  useEffect(() => {
    if (open) {
      setRendered(true)
      return undefined
    }
    const timer = window.setTimeout(() => setRendered(false), exitMs)
    return () => window.clearTimeout(timer)
  }, [open, exitMs])

  return { mounted: open || rendered, state: open ? 'open' : 'closed' } as const
}

/** Holds the last value seen while `active`, so content doesn't blank out during an exit animation. */
export function useLatestWhile<T>(value: T, active: boolean) {
  const latest = useRef(value)
  if (active) latest.current = value
  return latest.current
}
