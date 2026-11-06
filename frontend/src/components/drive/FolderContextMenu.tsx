import { Copy, Edit3, Scissors, Trash2, UserPlus } from 'lucide-react'
import { FolderVisual } from '@/components/drive/FolderVisual'
import { MenuDivider, MenuGroup, MenuHeader, MenuItem, MenuPanel } from '@/components/ui/menu'
import type { FolderItem } from '@/data/drive-data'

type Props = {
  x: number
  y: number
  folder: FolderItem | null
  onClose: () => void
  onCut: () => void
  onRename: () => void
  onInvite: () => void
  onCopyLink: () => void
  onDelete: () => void
}

const cutShortcut = navigator.platform.toLowerCase().includes('mac') ? '⌘X' : 'Ctrl+X'

export function FolderContextMenu({ x, y, folder, onClose, onCut, onRename, onInvite, onCopyLink, onDelete }: Props) {
  return (
    <MenuPanel open={Boolean(folder)} x={x} y={y} label="Folder actions" onClose={onClose}>
      {folder ? (
        <>
          <MenuHeader>
            <div className="flex items-center gap-2.5">
              <FolderVisual folder={folder} className="h-7 w-7 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold leading-tight text-fg">{folder.name}</p>
                <p className="text-[10px] font-medium text-fg-muted">Virtual folder</p>
              </div>
            </div>
          </MenuHeader>
          <MenuGroup>
            <MenuItem icon={Copy} label="Copy Link" onClick={onCopyLink} />
            <MenuItem icon={Scissors} label="Cut" onClick={onCut} kbd={cutShortcut} />
            <MenuItem icon={Edit3} label="Rename" onClick={onRename} />
            <MenuItem icon={UserPlus} label="Invite Member" onClick={onInvite} />
            <MenuDivider />
            <MenuItem icon={Trash2} label="Delete Folder" onClick={onDelete} tone="danger" />
          </MenuGroup>
        </>
      ) : null}
    </MenuPanel>
  )
}
