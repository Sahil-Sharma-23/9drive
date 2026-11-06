import { Copy, Download, Edit3, Eye, FolderInput, Info, Link2, Trash2, UserPlus } from 'lucide-react'
import { FileIcon } from '@/components/drive/FileIcon'
import { MenuDivider, MenuGroup, MenuHeader, MenuItem, MenuPanel } from '@/components/ui/menu'
import type { FileItem } from '@/data/drive-data'

type Props = {
  x: number
  y: number
  file: FileItem | null
  onClose: () => void
  onView: () => void
  onDownload: () => void
  onRename: () => void
  onMove: () => void
  onDetails: () => void
  onShare: () => void
  onCopyLink: () => void
  onInvite: () => void
  onDelete: () => void
}

export function FileContextMenu({ x, y, file, onClose, onView, onDownload, onRename, onMove, onDetails, onShare, onCopyLink, onInvite, onDelete }: Props) {
  return (
    <MenuPanel open={Boolean(file)} x={x} y={y} label="File actions" onClose={onClose}>
      {file ? (
        <>
          <MenuHeader>
            <div className="flex items-start gap-2.5">
              <FileIcon kind={file.kind} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-tight text-fg">{file.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="rounded-md bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-fg-muted">{file.size}</span>
                  {file.folderName ? (
                    <span className="flex min-w-0 items-center gap-0.5 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      <FolderInput className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{file.folderName}</span>
                    </span>
                  ) : (
                    <span className="rounded-md bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">All Files</span>
                  )}
                </div>
              </div>
            </div>
          </MenuHeader>
          <MenuGroup>
            <MenuItem icon={Eye} label="Preview" onClick={onView} />
            <MenuItem icon={Download} label="Download" onClick={onDownload} />
            <MenuItem icon={Edit3} label="Rename" onClick={onRename} />
            <MenuItem icon={FolderInput} label="Move to Folder" onClick={onMove} />
            <MenuItem icon={Info} label="Details" onClick={onDetails} />
            <MenuDivider />
            <MenuItem icon={Link2} label="Share Link" onClick={onShare} />
            <MenuItem icon={Copy} label="Copy Link" onClick={onCopyLink} />
            <MenuItem icon={UserPlus} label="Invite Member" onClick={onInvite} />
            <MenuDivider />
            <MenuItem icon={Trash2} label="Delete" onClick={onDelete} tone="danger" />
          </MenuGroup>
        </>
      ) : null}
    </MenuPanel>
  )
}
