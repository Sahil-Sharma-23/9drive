import * as React from 'react'
import { cn } from '@/lib/utils'

/** Shared by every text-like control so inputs and selects always match. */
export const controlClasses = 'h-11 w-full rounded-xl border border-control-line bg-control px-3.5 text-sm text-fg outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent-solid focus:ring-3 focus:ring-accent-line disabled:cursor-not-allowed disabled:opacity-60'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />
}
