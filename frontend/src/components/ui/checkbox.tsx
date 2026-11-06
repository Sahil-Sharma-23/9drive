import * as React from 'react'
import { cn } from '@/lib/utils'

export function Checkbox({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input type="checkbox" className={cn('checkbox', className)} {...props} />
}
