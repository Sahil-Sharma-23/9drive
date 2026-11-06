import { MoreVertical } from 'lucide-react'
import { type CSSProperties, type MouseEvent, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FolderItem } from '@/data/drive-data'
import { FolderVisual } from '@/components/drive/FolderVisual'

export type FolderSizeScale = 'xs' | 'sm' | 'md' | 'lg'

const scaleConfig: Record<FolderSizeScale, {
  grid: string
  card: string
  icon: string
  title: string
  sub: string
}> = {
  xs: {
    grid: 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2',
    card: 'min-h-24 p-2.5',
    icon: 'h-8 w-8',
    title: 'text-[11px] mt-2',
    sub: 'text-[10px] mt-0.5',
  },
  sm: {
    grid: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5',
    card: 'min-h-28 p-3',
    icon: 'h-10 w-10',
    title: 'text-xs mt-2',
    sub: 'text-[10px] mt-0.5',
  },
  md: {
    grid: 'grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5',
    card: 'min-h-36 p-4 sm:min-h-48 sm:p-6',
    icon: 'h-14 w-14 sm:h-20 sm:w-20',
    title: 'text-sm mt-3 sm:mt-5 sm:text-lg',
    sub: 'text-xs mt-1 sm:text-sm',
  },
  lg: {
    grid: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6',
    card: 'min-h-52 p-6 sm:min-h-60 sm:p-8',
    icon: 'h-20 w-20 sm:h-28 sm:w-28',
    title: 'text-base mt-4 sm:mt-6 sm:text-xl',
    sub: 'text-sm mt-1',
  },
}

export function FolderGrid({
  items,
  mobileTwoColumns = false,
  sizeScale = 'md',
  onFolderMenu,
  onFolderOpen,
  onDropItem,
}: {
  items: FolderItem[]
  mobileTwoColumns?: boolean
  sizeScale?: FolderSizeScale
  onFolderMenu?: (event: MouseEvent<HTMLElement>, folder: FolderItem) => void
  onFolderOpen?: (folder: FolderItem) => void
  onDropItem?: (fileId: string, folderId: string) => void
}) {
  const cfg = scaleConfig[sizeScale]
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  return (
    <div className={cn('mt-4 grid', cfg.grid, mobileTwoColumns && sizeScale === 'md' && 'grid-cols-2')}>
      {items.map((folder, index) => (
        <Card
          key={folder.id || folder.name}
          interactive
          style={{ '--i': index } as CSSProperties}
          onContextMenu={(event) => onFolderMenu?.(event, folder)}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
          onDragEnter={() => setDropTargetId(folder.id ?? null)}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTargetId(null) }}
          onDrop={(event) => {
            event.preventDefault()
            setDropTargetId(null)
            const fileId = event.dataTransfer.getData('text/plain')
            if (fileId && folder.id) onDropItem?.(fileId, folder.id)
          }}
          className={cn(
            'group relative flex animate-rise stagger flex-col items-center justify-center',
            dropTargetId === folder.id && 'scale-[1.02] border-accent-solid bg-accent-soft shadow-lift',
            cfg.card,
          )}
        >
          <button type="button" className="absolute inset-0 rounded-2xl" aria-label={`Open folder ${folder.name}`} onClick={() => onFolderOpen?.(folder)} />
          <button
            type="button"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg sm:right-3 sm:top-3"
            onClick={(event) => { event.stopPropagation(); onFolderMenu?.(event, folder) }}
            aria-label={`Open ${folder.name} menu`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <FolderVisual folder={folder} className={cn('transition-transform duration-200 ease-soft group-hover:scale-105', cfg.icon)} />
          <h2 className={cn('line-clamp-2 text-center font-extrabold leading-tight text-fg', cfg.title)}>{folder.name}</h2>
          <p className={cn('line-clamp-1 text-center text-fg-muted', cfg.sub)}>{folder.updated}</p>
        </Card>
      ))}
    </div>
  )
}

export function FolderGridSkeleton({ sizeScale = 'md' }: { sizeScale?: FolderSizeScale }) {
  const cfg = scaleConfig[sizeScale]
  return (
    <div className={cn('mt-4 grid', cfg.grid)}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className={cn('flex flex-col items-center justify-center gap-3', cfg.card)}>
          <Skeleton className={cfg.icon} />
          <Skeleton className="h-4 w-3/5" />
        </Card>
      ))}
    </div>
  )
}
