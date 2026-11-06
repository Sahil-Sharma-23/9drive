import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { controlClasses } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block w-full">
      <select className={cn(controlClasses, 'cursor-pointer appearance-none truncate pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
    </span>
  )
}
