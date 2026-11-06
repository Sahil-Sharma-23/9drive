import { ClipboardPaste, FolderPlus, Upload } from 'lucide-react'
import { MenuDivider, MenuGroup, MenuItem, MenuPanel } from '@/components/ui/menu'

type Props = {
  x: number
  y: number
  open: boolean
  canPasteFolder?: boolean
  onClose: () => void
  onUpload: () => void
  onCreateFolder: () => void
  onPasteFolder?: () => void
}

export function EmptyAreaContextMenu({ x, y, open, canPasteFolder = false, onClose, onUpload, onCreateFolder, onPasteFolder }: Props) {
  return (
    <MenuPanel open={open} x={x} y={y} width={208} label="Add to this folder" onClose={onClose}>
      <MenuGroup>
        <MenuItem icon={Upload} label="Upload File" onClick={onUpload} tone="accent" />
        <MenuItem icon={FolderPlus} label="New Folder" onClick={onCreateFolder} />
        {canPasteFolder && onPasteFolder ? (
          <>
            <MenuDivider />
            <MenuItem icon={ClipboardPaste} label="Paste Folder Here" onClick={onPasteFolder} />
          </>
        ) : null}
      </MenuGroup>
    </MenuPanel>
  )
}
