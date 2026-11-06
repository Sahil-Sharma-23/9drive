import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, Database, Folder, HardDrive, Mail, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes, formatDate } from '@/lib/api'
import { useModal } from '@/lib/use-modal'
import { usePresence } from '@/lib/use-presence'
import type { FileItem } from '@/data/drive-data'

function DetailRow({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-sunken p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-fg-muted">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-fg">{value}</p>
      </div>
    </div>
  )
}

export function FileDetailsDrawer({ open, file, onClose }: { open: boolean; file: FileItem | null; onClose: () => void }) {
  const { mounted, state } = usePresence(open, 180)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModal(panelRef, open, onClose)

  if (!mounted) return null

  return createPortal(
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Dismiss"
        data-state={state}
        className="fixed inset-0 z-40 cursor-default bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
        onClick={open ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        inert={!open}
        data-state={state}
        className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-line bg-surface-raised shadow-pop outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-fg">File Details</h2>
            <p className="mt-1 truncate text-sm text-fg-muted">{file?.name ?? 'No file selected'}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close file details"><X className="h-5 w-5" /></Button>
        </div>
        {file ? (
          <div className="grid gap-3 overflow-y-auto p-5">
            <DetailRow icon={Tag} label="Name" value={file.name} />
            <DetailRow icon={Database} label="Size" value={file.sizeBytes ? formatBytes(file.sizeBytes) : file.size} />
            <DetailRow icon={CalendarClock} label="Uploaded At" value={file.createdAt ? formatDate(file.createdAt) : file.date} />
            <DetailRow icon={Mail} label="Storage Account" value={file.accountEmail ?? file.access} />
            <DetailRow icon={HardDrive} label="Provider" value={file.accountProvider ?? 'Google Drive'} />
            <DetailRow icon={Folder} label="Virtual Folder" value={file.folderName ?? 'No folder'} />
            <DetailRow icon={Tag} label="MIME Type" value={file.mimeType ?? 'Unknown'} />
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  )
}
