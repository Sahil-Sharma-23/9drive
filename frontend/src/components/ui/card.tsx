import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lifts on hover. Only for cards that respond to a click. */
  interactive?: boolean
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-card',
        interactive && 'transition-[transform,box-shadow,border-color,background-color] duration-200 ease-soft hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift',
        className,
      )}
      {...props}
    />
  )
}
