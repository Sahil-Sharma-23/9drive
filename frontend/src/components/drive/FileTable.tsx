import { Check, FolderOpen, MoreVertical, Star } from 'lucide-react'
import { type CSSProperties, type MouseEvent, useState } from 'react'
import { AvatarStack } from '@/components/drive/AvatarStack'
import { FileIcon } from '@/components/drive/FileIcon'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import type { FileItem } from '@/data/drive-data'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

const headCell = 'px-3 py-3 text-xs font-bold text-fg-muted first:pl-5 last:pr-5'
const bodyCell = 'px-3 py-2.5 first:pl-5 last:pr-5'

function rowDragStart(event: React.DragEvent<HTMLElement>, file: FileItem) {
  event.dataTransfer.setData('text/plain', file.id ?? '')
  event.dataTransfer.effectAllowed = 'move'
}

export function FileTable({ files, mode = 'default', selectedFileIds = new Set<string>(), allSelected = false, className, onFileContextMenu, onToggleFile, onToggleAll }: { files: FileItem[]; mode?: 'default' | 'shared' | 'recent' | 'starred' | 'archived'; selectedFileIds?: Set<string>; allSelected?: boolean; className?: string; onFileContextMenu?: (event: MouseEvent<HTMLElement>, file: FileItem) => void; onToggleFile?: (file: FileItem) => void; onToggleAll?: () => void }) {
  const [copyResult, setCopyResult] = useState<{ fileId: string; ok: boolean } | null>(null)

  async function copyLink(event: MouseEvent<HTMLElement>, file: FileItem) {
    event.stopPropagation()
    if (!file.id) return
    try {
      const data = await apiFetch<{ url: string | null }>(`/files/${file.id}/view-url`)
      const url = data.url ?? (await apiFetch<{ url: string }>(`/files/${file.id}/share`, { method: 'POST' })).url
      await navigator.clipboard.writeText(url)
      setCopyResult({ fileId: file.id, ok: true })
    } catch {
      setCopyResult({ fileId: file.id, ok: false })
    }
    window.setTimeout(() => setCopyResult(null), 2000)
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Mobile list */}
      <div className="divide-y divide-line sm:hidden">
        {onToggleAll ? (
          <label className="flex items-center justify-between px-4 py-3 text-sm font-bold text-fg">
            <span>Select all files</span>
            <Checkbox className="h-5 w-5" checked={allSelected} onChange={onToggleAll} />
          </label>
        ) : null}
        {files.map((file, index) => {
          const selected = selectedFileIds.has(file.id ?? '')
          const meta = mode === 'archived' ? file.location : mode === 'recent' ? file.openedDate : mode === 'starred' ? file.starredDate : file.date
          return (
            <article
              key={file.id ?? file.name}
              draggable={Boolean(file.id)}
              style={{ '--i': index } as CSSProperties}
              onDragStart={(event) => rowDragStart(event, file)}
              onClick={() => onToggleFile?.(file)}
              onContextMenu={(event) => onFileContextMenu?.(event, file)}
              className={cn('flex animate-rise stagger items-center gap-3 px-4 py-3 transition-colors duration-150', selected && 'bg-accent-soft')}
            >
              {onToggleFile ? <Checkbox className="h-4 w-4" checked={selected} onChange={() => onToggleFile(file)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${file.name}`} /> : null}
              {mode === 'starred' ? <Star className="h-4 w-4 shrink-0 fill-warning-solid text-warning-solid" aria-hidden="true" /> : <FileIcon kind={file.kind} />}
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="truncate text-sm font-bold leading-snug text-fg" title={file.name}>{file.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  <span>{meta}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{file.size}</span>
                  {file.folderName ? <span className="flex min-w-0 items-center gap-0.5 text-accent"><FolderOpen className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{file.folderName}</span></span> : null}
                </div>
              </div>
              {onFileContextMenu ? <button type="button" className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg" onClick={(event) => { event.stopPropagation(); onFileContextMenu(event, file) }} aria-label={`Open ${file.name} menu`}><MoreVertical className="h-4 w-4" /></button> : null}
            </article>
          )
        })}
      </div>

      {/* Desktop table */}
      {/* relative: keeps the absolutely positioned sr-only header inside this scroll area */}
      <div className="relative hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {onToggleAll ? <th className={cn(headCell, 'w-9')}><Checkbox checked={allSelected} onChange={onToggleAll} aria-label="Select all files" /></th> : null}
              <th className={headCell}>Name</th>
              {mode === 'default' ? <th className={headCell}>Folder</th> : null}
              {mode === 'shared' ? <th className={headCell}>Owner</th> : null}
              {mode === 'recent' ? <th className={headCell}>Last Opened</th> : null}
              {mode === 'starred' ? <th className={headCell}>Starred On</th> : null}
              {mode === 'archived' ? <th className={headCell}>Archived Date</th> : null}
              <th className={headCell}>{mode === 'archived' ? 'Original Location' : 'Last Modified'}</th>
              <th className={headCell}>Size</th>
              <th className={headCell}>Access</th>
              {onFileContextMenu ? <th className={headCell}><span className="sr-only">Actions</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => {
              const selected = selectedFileIds.has(file.id ?? '')
              const copied = copyResult?.fileId === file.id ? copyResult : null
              return (
                <tr
                  key={file.id ?? file.name}
                  draggable={Boolean(file.id)}
                  style={{ '--i': index } as CSSProperties}
                  onDragStart={(event) => rowDragStart(event, file)}
                  onContextMenu={(event) => onFileContextMenu?.(event, file)}
                  onClick={() => onToggleFile?.(file)}
                  className={cn(
                    'group animate-rise stagger border-b border-line transition-colors duration-150 last:border-b-0',
                    file.id && 'cursor-grab active:cursor-grabbing',
                    selected ? 'bg-accent-soft' : 'hover:bg-surface-hover',
                  )}
                >
                  {onToggleFile ? <td className={bodyCell}><Checkbox checked={selected} onChange={() => onToggleFile(file)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${file.name}`} /></td> : null}
                  <td className={cn(bodyCell, 'font-semibold text-fg')}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      {mode === 'starred' ? <Star className="h-4 w-4 shrink-0 fill-warning-solid text-warning-solid" aria-hidden="true" /> : <FileIcon kind={file.kind} />}
                      <span className="max-w-[200px] truncate lg:max-w-[280px]" title={file.name}>{file.name}</span>
                    </span>
                  </td>
                  {mode === 'default' ? (
                    <td className={bodyCell}>
                      {file.folderName ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-accent">
                          <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="max-w-[120px] truncate">{file.folderName}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-fg-subtle">—</span>
                      )}
                    </td>
                  ) : null}
                  {mode === 'shared' ? <td className={cn(bodyCell, 'text-fg-muted')}>{file.owner}</td> : null}
                  {mode === 'recent' ? <td className={cn(bodyCell, 'text-fg-muted')}>{file.openedDate}</td> : null}
                  {mode === 'starred' ? <td className={cn(bodyCell, 'text-fg-muted')}>{file.starredDate}</td> : null}
                  {mode === 'archived' ? <td className={cn(bodyCell, 'text-fg-muted')}>{file.archivedDate}</td> : null}
                  <td className={cn(bodyCell, 'whitespace-nowrap text-fg-muted')}>{mode === 'archived' ? file.location : file.date}</td>
                  <td className={cn(bodyCell, 'whitespace-nowrap tabular-nums text-fg-muted')}>{file.size}</td>
                  <td className={cn(bodyCell, 'text-fg-muted')}><span className="flex items-center gap-2"><AvatarStack count={file.shared} label={file.access} /><span className="max-w-[170px] truncate" title={file.access}>{file.access}</span></span></td>
                  {onFileContextMenu ? (
                    <td className={cn(bodyCell, 'text-right')}>
                      <div className="flex items-center justify-end gap-1.5">
                        <div className={cn('flex gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100', copied && 'opacity-100')}>
                          <button type="button" title="Copy Link" onClick={(event) => copyLink(event, file)} className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'h-7 gap-1 rounded-lg px-2 text-[11px] font-bold', copied?.ok && 'bg-success-soft text-success hover:bg-success-soft', copied && !copied.ok && 'bg-danger-soft text-danger hover:bg-danger-soft')}>
                            {copied?.ok ? <Check className="h-3 w-3 animate-tick" aria-hidden="true" /> : null}
                            {copied ? (copied.ok ? 'Copied' : 'Failed') : 'Copy Link'}
                          </button>
                          <button type="button" title="Move File" onClick={(event) => { event.stopPropagation(); window.dispatchEvent(new CustomEvent('9drive:open-move-modal', { detail: file })) }} className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'h-7 rounded-lg px-2 text-[11px] font-bold')}>
                            Move
                          </button>
                        </div>
                        <button type="button" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-fg" onClick={(event) => { event.stopPropagation(); onFileContextMenu(event, file) }} aria-label={`Open ${file.name} menu`}><MoreVertical className="h-4 w-4" /></button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function FileTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </Card>
  )
}
