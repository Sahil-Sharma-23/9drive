import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'

const iconTransition = 'absolute h-5 w-5 transition-[transform,opacity] duration-300 ease-soft'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button variant="outline" size="icon" className="relative overflow-hidden" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={toggleTheme}>
      <Moon className={`${iconTransition} rotate-0 scale-100 opacity-100 dark:-rotate-90 dark:scale-50 dark:opacity-0`} />
      <Sun className={`${iconTransition} rotate-90 scale-50 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100`} />
    </Button>
  )
}
