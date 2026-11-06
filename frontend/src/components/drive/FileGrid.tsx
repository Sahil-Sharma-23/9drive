import { MoreVertical } from 'lucide-react'
import type { CSSProperties, MouseEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FileIcon } from '@/components/drive/FileIcon'
import type { FileItem } from '@/data/drive-data'
import { cn } from '@/lib/utils'

export type FileSizeScale = 'xs' | 'sm' | 'md' | 'lg'

const scaleConfig: Record<FileSizeScale, {
  grid: string
  card: string
  checkbox: string
  menuBtn: string
  icon: string
  title: string
  date: string
  tagsShell: string
  tag: string
  mtCard: string
}> = {
  xs: {
    grid: 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2',
    card: 'p-2.5',
    checkbox: 'h-4 w-4',
    menuBtn: '-mr-1.5 -mt-1.5 h-7 w-7',
    icon: 'h-10 w-10 mt-1 rounded-xl',
    title: 'text-[11px] min-h-7',
    date: 'text-[10px] mt-0.5',
    tagsShell: 'mt-1.5 gap-1',
    tag: 'px-1.5 py-0.5 text-[10px]',
    mtCard: 'mt-2',
  },
  sm: {
    grid: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5',
    card: 'p-3',
    checkbox: 'h-4.5 w-4.5',
    menuBtn: '-mr-1.5 -mt-1.5 h-8 w-8',
    icon: 'h-12 w-12 mt-2 rounded-xl',
    title: 'text-xs min-h-8',
    date: 'text-[10px] mt-1',
    tagsShell: 'mt-2 gap-1.5',
    tag: 'px-2 py-0.5 text-[10px]',
    mtCard: 'mt-3',
  },
  md: {
    grid: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5',
    card: 'p-4',
    checkbox: 'h-5 w-5',
    menuBtn: '-mr-2 -mt-2 h-10 w-10',
    icon: 'h-16 w-16 sm:h-20 sm:w-20 mt-4 rounded-2xl',
    title: 'min-h-10 text-sm',
    date: 'mt-2 text-xs',
    tagsShell: 'mt-3 gap-2 text-xs',
    tag: 'px-2.5 py-1',
    mtCard: 'mt-5',
  },
  lg: {
    grid: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6',
    card: 'p-6',
    checkbox: 'h-6 w-6',
    menuBtn: '-mr-3 -mt-3 h-12 w-12',
    icon: 'h-24 w-24 sm:h-32 sm:w-32 mt-6 rounded-3xl',
    title: 'min-h-12 text-base sm:text-lg',
    date: 'mt-2 text-sm',
    tagsShell: 'mt-4 gap-2 text-sm',
    tag: 'px-3 py-1.5',
    mtCard: 'mt-6',
  },
}

export function FileGrid({
  files,
  selectedFileIds = new Set<string>(),
  sizeScale = 'md',
  onFileContextMenu,
  onToggleFile
}: {
  files: FileItem[]
  selectedFileIds?: Set<string>
  sizeScale?: FileSizeScale
  onFileContextMenu?: (event: MouseEvent<HTMLElement>, file: FileItem) => void
  onToggleFile?: (file: FileItem) => void
}) {
  const cfg = scaleConfig[sizeScale]
  return (
    <div className={cn('mt-3 grid', cfg.grid)}>
      {files.map((file, index) => {
        const selected = selectedFileIds.has(file.id ?? '')
        return (
          <Card
            key={file.id ?? file.name}
            interactive
            draggable
            style={{ '--i': index } as CSSProperties}
            onDragStart={(event) => { event.dataTransfer.setData('text/plain', file.id ?? ''); event.dataTransfer.effectAllowed = 'move' }}
            onClick={() => onToggleFile?.(file)}
            onContextMenu={(event) => onFileContextMenu?.(event, file)}
            className={cn(
              'relative animate-rise stagger cursor-grab overflow-hidden active:cursor-grabbing',
              selected && 'border-accent-line bg-accent-soft hover:border-accent-line',
              cfg.card,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Checkbox className={cfg.checkbox} checked={selected} onChange={() => onToggleFile?.(file)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${file.name}`} />
              <button type="button" className={cn('flex shrink-0 items-center justify-center rounded-xl text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg', cfg.menuBtn)} onClick={(event) => { event.stopPropagation(); onFileContextMenu?.(event, file) }} aria-label={`Open ${file.name} menu`}><MoreVertical className="h-4 w-4" /></button>
            </div>

            <div className="flex justify-center">
              <FileIcon kind={file.kind} className={cfg.icon} />
            </div>

            <div className={cn('min-w-0 text-center', cfg.mtCard)}>
              <h3 className={cn('line-clamp-2 break-words font-extrabold text-fg', cfg.title)} title={file.name}>{file.name}</h3>
              <p className={cn('truncate text-fg-muted', cfg.date)}>{file.date}</p>
              <div className={cn('flex flex-wrap justify-center font-semibold text-fg-muted', cfg.tagsShell)}>
                <span className={cn('rounded-full bg-surface-hover tabular-nums', cfg.tag)}>{file.size}</span>
                <span className={cn('max-w-full truncate rounded-full bg-surface-hover', cfg.tag)}>{file.access}</span>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
