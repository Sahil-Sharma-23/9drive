import { useEffect, useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState, LoadFailedState } from '@/components/ui/empty-state'
import { DummyModal } from '@/components/drive/DummyModal'
import { FileIcon, fileKindFromMime } from '@/components/drive/FileIcon'
import { FileTableSkeleton } from '@/components/drive/FileTable'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

type TrashFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  provider: string
  deletedAt: string
  connectedAccount: {
    email: string
    provider: string
  }
}

const headCell = 'px-3 py-3 text-xs font-bold text-fg-muted first:pl-5 last:pr-5'
const bodyCell = 'px-3 py-3 first:pl-5 last:pr-5'

export function TrashPage() {
  const [files, setFiles] = useState<TrashFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null)

  async function loadTrash() {
    setLoading(true)
    try {
      const data = await apiFetch<{ files: TrashFile[] }>('/files/trash')
      setFiles(data.files)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load trash')
      setMessageType('error')
      setLoadFailed(true)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  useEffect(() => {
    loadTrash().catch(() => undefined)
  }, [])

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)))
    }
  }

  function removeFromList(ids: string[]) {
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }

  async function handleRestore(ids: string[]) {
    if (ids.length === 0) return
    setLoading(true)
    setMessage('')
    try {
      await apiFetch('/files/batch/restore', {
        method: 'POST',
        body: JSON.stringify({ fileIds: ids })
      })
      removeFromList(ids)
      setMessage(`Successfully restored ${ids.length} file(s).`)
      setMessageType('success')
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to restore files')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  async function confirmPermanentDelete() {
    const ids = pendingDelete
    if (!ids || ids.length === 0) return
    setPendingDelete(null)
    setLoading(true)
    setMessage('')
    try {
      await apiFetch('/files/batch/permanent', {
        method: 'DELETE',
        body: JSON.stringify({ fileIds: ids })
      })
      removeFromList(ids)
      setMessage(`Permanently deleted ${ids.length} file(s).`)
      setMessageType('success')
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to permanently delete files')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  function rowActions(file: TrashFile) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => handleRestore([file.id])} disabled={loading} title="Restore" aria-label={`Restore ${file.name}`}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="danger" size="icon-sm" onClick={() => setPendingDelete([file.id])} disabled={loading} title="Delete Permanently" aria-label={`Delete ${file.name} permanently`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Recycle Bin"
        description="Manage deleted files. Restore them to active folders or delete them permanently."
        actions={
          selectedIds.size > 0 ? (
            <>
              <Button variant="outline" onClick={() => handleRestore(Array.from(selectedIds))} disabled={loading}>
                <RotateCcw className="h-4 w-4" /> Restore Selected ({selectedIds.size})
              </Button>
              <Button variant="danger" onClick={() => setPendingDelete(Array.from(selectedIds))} disabled={loading}>
                <Trash2 className="h-4 w-4" /> Delete Selected ({selectedIds.size})
              </Button>
            </>
          ) : null
        }
      />

      {message ? <Alert tone={messageType === 'success' ? 'success' : 'danger'} className="mt-5">{message}</Alert> : null}

      {!loaded ? <FileTableSkeleton className="mt-6" /> : (
        <Card className="mt-6 overflow-hidden">
          {loadFailed ? (
            <LoadFailedState className="py-12" />
          ) : files.length === 0 ? (
            <EmptyState icon={Trash2} title="Recycle Bin is empty" description="Deleted files will appear here." className="py-12" />
          ) : (
            <>
              {/* Mobile list */}
              <div className="divide-y divide-line sm:hidden">
                <label className="flex items-center justify-between px-4 py-3 text-sm font-bold text-fg">
                  <span>Select all files</span>
                  <Checkbox className="h-5 w-5" checked={selectedIds.size === files.length} onChange={toggleSelectAll} />
                </label>
                {files.map((file) => (
                  <div key={file.id} className={cn('flex items-center gap-3 px-4 py-3 transition-colors duration-150', selectedIds.has(file.id) && 'bg-accent-soft')}>
                    <Checkbox checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} aria-label={`Select ${file.name}`} />
                    <FileIcon kind={fileKindFromMime(file.mimeType)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-fg" title={file.name}>{file.name}</p>
                      <p className="mt-0.5 truncate text-xs tabular-nums text-fg-muted">{formatBytes(file.sizeBytes)} · {formatDate(file.deletedAt)}</p>
                    </div>
                    {rowActions(file)}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className={cn(headCell, 'w-9')}>
                        <Checkbox checked={selectedIds.size === files.length} onChange={toggleSelectAll} aria-label="Select all files" />
                      </th>
                      <th className={headCell}>Name</th>
                      <th className={headCell}>Account</th>
                      <th className={headCell}>Size</th>
                      <th className={headCell}>Deleted At</th>
                      <th className={cn(headCell, 'text-right')}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id} className={cn('border-b border-line transition-colors duration-150 last:border-b-0', selectedIds.has(file.id) ? 'bg-accent-soft' : 'hover:bg-surface-hover')}>
                        <td className={bodyCell}>
                          <Checkbox checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} aria-label={`Select ${file.name}`} />
                        </td>
                        <td className={bodyCell}>
                          <div className="flex items-center gap-2.5">
                            <FileIcon kind={fileKindFromMime(file.mimeType)} />
                            <span className="block max-w-xs truncate font-semibold text-fg xl:max-w-md" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className={cn(bodyCell, 'text-fg-muted')}>{file.connectedAccount.email}</td>
                        <td className={cn(bodyCell, 'whitespace-nowrap font-semibold tabular-nums text-fg')}>{formatBytes(file.sizeBytes)}</td>
                        <td className={cn(bodyCell, 'whitespace-nowrap text-fg-muted')}>{formatDate(file.deletedAt)}</td>
                        <td className={bodyCell}>{rowActions(file)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      <DummyModal
        open={pendingDelete !== null}
        title="Delete permanently?"
        description={`${pendingDelete?.length === 1 ? 'This file' : `These ${pendingDelete?.length ?? 0} files`} will be deleted from your storage provider. This can't be undone.`}
        onClose={() => setPendingDelete(null)}
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmPermanentDelete}><Trash2 className="h-4 w-4" />Delete Permanently</Button>
        </div>
      </DummyModal>
    </>
  )
}
