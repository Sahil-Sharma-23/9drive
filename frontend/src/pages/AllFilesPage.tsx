import { useEffect, useRef, useState, type DragEvent, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Archive, CheckCircle, ClipboardPaste, Download, FileSearch, FolderInput, FolderOpen, FolderPlus, LayoutGrid, List, LoaderCircle, RefreshCw, Star, Trash2, Upload, X } from 'lucide-react'
import { Alert, type AlertTone } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, LoadFailedState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Select } from '@/components/ui/select'
import { DummyModal } from '@/components/drive/DummyModal'
import { EmptyAreaContextMenu } from '@/components/drive/EmptyAreaContextMenu'
import { FileContextMenu } from '@/components/drive/FileContextMenu'
import { FileDetailsDrawer } from '@/components/drive/FileDetailsDrawer'
import { FileGrid } from '@/components/drive/FileGrid'
import { fileKindFromMime } from '@/components/drive/FileIcon'
import { FileTable, FileTableSkeleton } from '@/components/drive/FileTable'
import { FolderContextMenu } from '@/components/drive/FolderContextMenu'
import { FolderGrid, FolderGridSkeleton, type FolderSizeScale } from '@/components/drive/FolderGrid'
import { defaultFolderColor, defaultFolderIconUrl, folderColorOptions, folderIconOptions, normalizeFolderColor } from '@/components/drive/FolderVisual'
import { PageHeader } from '@/components/drive/PageHeader'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { createPlyr, ensurePlyr } from '@/lib/plyr'
import { getPreviewKind, officeViewerUrl } from '@/lib/preview'
import { cn } from '@/lib/utils'
import type { FileItem, FolderItem } from '@/data/drive-data'
import { useUpload } from '@/context/UploadContext'
import { useDriveLayoutActions } from '@/layouts/DriveLayout'

type BackendFile = { id: string; name: string; mimeType: string; sizeBytes: string; createdAt: string; folderId?: string | null; connectedAccount?: { email: string; provider: string }; folder?: { id: string; name: string } | null }
type BackendFolder = { id: string; name: string; color: string; iconUrl?: string | null; parentId?: string | null; providerFolderId?: string | null; updatedAt: string }
type ConnectedAccount = { id: string; provider: string; email: string; displayName?: string | null; status: string }

type FileViewMode = 'list' | 'grid'

const fileViewStorageKey = '9drive:all-files-view-mode'
const folderSizeOptions = (['xs', 'sm', 'md', 'lg'] as FolderSizeScale[]).map((value) => ({ value, label: value.toUpperCase(), ariaLabel: `Folder size ${value}` }))
const fileViewOptions: { value: FileViewMode; label: ReactNode; ariaLabel: string }[] = [
  { value: 'grid', label: <LayoutGrid className="h-4 w-4" />, ariaLabel: 'Show files as grid' },
  { value: 'list', label: <List className="h-4 w-4" />, ariaLabel: 'Show files as list' },
]
const pasteShortcut = navigator.platform.toLowerCase().includes('mac') ? '⌘V' : 'Ctrl+V'

function getStoredFileViewMode(): FileViewMode {
  const stored = localStorage.getItem(fileViewStorageKey)
  return stored === 'grid' || stored === 'list' ? stored : 'list'
}

function providerLabel(provider: string | undefined) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function mapFile(file: BackendFile): FileItem {
  return { id: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes, createdAt: file.createdAt, accountEmail: file.connectedAccount?.email, accountProvider: providerLabel(file.connectedAccount?.provider), date: formatDate(file.createdAt), size: formatBytes(file.sizeBytes), access: file.connectedAccount?.email ?? providerLabel(file.connectedAccount?.provider), kind: fileKindFromMime(file.mimeType), shared: 1, folderId: file.folderId, folderName: file.folder?.name }
}

function mapFolder(folder: BackendFolder): FolderItem {
  return { id: folder.id, name: folder.name, color: folder.color, iconUrl: folder.iconUrl, parentId: folder.parentId, providerFolderId: folder.providerFolderId, updated: `Updated ${formatDate(folder.updatedAt)}` }
}

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

function FolderAppearanceFields({ color, iconUrl, onColorChange, onIconChange }: { color: string; iconUrl: string; onColorChange: (color: string) => void; onIconChange: (iconUrl: string) => void }) {
  const normalizedColor = normalizeFolderColor(color)
  return (
    <div className="grid gap-4">
      <Field label="Folder Color"><Input type="color" value={normalizedColor} onChange={(event) => onColorChange(event.target.value)} className="h-12 cursor-pointer p-1" /></Field>
      <div className="flex flex-wrap gap-2">
        {folderColorOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onColorChange(option)}
            aria-pressed={normalizedColor === option}
            aria-label={`Use ${option} folder color`}
            className={cn('h-8 w-8 rounded-lg border border-line transition-transform duration-150 ease-soft hover:scale-110 active:scale-95', normalizedColor === option && 'ring-2 ring-accent-solid ring-offset-2 ring-offset-surface-raised')}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>
      <div className="grid gap-1.5 text-sm font-semibold text-fg">
        <span>Folder Icon</span>
        <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto p-0.5 sm:grid-cols-8">
          {folderIconOptions.map((option) => (
            <button
              key={option.url}
              type="button"
              onClick={() => onIconChange(option.url)}
              aria-pressed={iconUrl === option.url}
              aria-label={`Use ${option.label} icon`}
              title={option.label}
              className={cn('flex h-11 items-center justify-center rounded-xl border transition-[background-color,border-color,transform] duration-150 ease-soft active:scale-95', iconUrl === option.url ? 'border-accent-solid bg-accent-soft' : 'border-line bg-surface-sunken hover:bg-surface-hover')}
            >
              <option.icon className="h-5 w-5" style={{ color: normalizedColor }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AllFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFolderId = searchParams.get('folderId')
  const searchQuery = searchParams.get('q')?.trim() ?? ''
  const listKey = searchParams.toString()
  const hasFilters = ['kind', 'accountId', 'minSize', 'maxSize', 'startDate', 'endDate'].some((key) => searchParams.has(key))
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [folderRenameOpen, setFolderRenameOpen] = useState(false)
  const [folderDeleteOpen, setFolderDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copiedShareLink, setCopiedShareLink] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [allFolders, setAllFolders] = useState<FolderItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [isUploadDragging, setIsUploadDragging] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderColor, setFolderColor] = useState(defaultFolderColor)
  const [folderIconUrl, setFolderIconUrl] = useState(defaultFolderIconUrl)
  const [renameValue, setRenameValue] = useState('')
  const [folderRenameValue, setFolderRenameValue] = useState('')
  const [folderRenameColor, setFolderRenameColor] = useState(defaultFolderColor)
  const [folderRenameIconUrl, setFolderRenameIconUrl] = useState(defaultFolderIconUrl)
  const [activeFile, setActiveFile] = useState<FileItem | null>(null)
  const [activeFolderForMenu, setActiveFolderForMenu] = useState<FolderItem | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [cutFolder, setCutFolder] = useState<FolderItem | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null }>({ x: 0, y: 0, file: null })
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: FolderItem | null }>({ x: 0, y: 0, folder: null })
  const [emptyContextMenu, setEmptyContextMenu] = useState<{ x: number; y: number; open: boolean }>({ x: 0, y: 0, open: false })
  const [notice, setNotice] = useState<{ text: string; tone: AlertTone } | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const [modalError, setModalError] = useState('')
  const [modalBusy, setModalBusy] = useState(false)
  const modalRun = useRef(0)
  const [gdrivePublicUrl, setGdrivePublicUrl] = useState('')
  const [makingPublic, setMakingPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listReady, setListReady] = useState(false)
  const [listFailed, setListFailed] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>(getStoredFileViewMode)
  const { uploadFiles } = useUpload()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteTargetType, setInviteTargetType] = useState<'file' | 'folder'>('file')
  const [inviteTargetId, setInviteTargetId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviting, setInviting] = useState(false)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const [folderSizeScale, setFolderSizeScale] = useState<FolderSizeScale>(() => {
    const v = localStorage.getItem('9drive:folder-size')
    return (v === 'xs' || v === 'sm' || v === 'md' || v === 'lg') ? v : 'md'
  })
  const { setHeaderActions } = useDriveLayoutActions()
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState('')

  function showNotice(text: string, tone: AlertTone = 'info', autoHide = false) {
    window.clearTimeout(noticeTimer.current)
    setNotice({ text, tone })
    if (autoHide) noticeTimer.current = window.setTimeout(() => setNotice(null), 2500)
  }

  function showError(error: unknown, fallback: string) {
    showNotice(error instanceof Error ? error.message : fallback, 'danger')
  }

  /** Runs a modal's action. A failure shows inside the modal, or on the page if it was dismissed meanwhile. */
  async function runModalAction(action: () => Promise<void>, fallback: string) {
    const run = ++modalRun.current
    setModalError('')
    setModalBusy(true)
    try {
      await action()
    } catch (error) {
      if (run === modalRun.current) setModalError(error instanceof Error ? error.message : fallback)
      else showError(error, fallback)
    } finally {
      if (run === modalRun.current) setModalBusy(false)
    }
  }

  function changeFolderSize(scale: FolderSizeScale) {
    setFolderSizeScale(scale)
    localStorage.setItem('9drive:folder-size', scale)
  }

  async function loadFiles() {
    const params = new URLSearchParams()
    if (activeFolderId) params.set('folderId', activeFolderId)
    if (searchQuery) params.set('q', searchQuery)

    // Add advanced search filters
    const kind = searchParams.get('kind')
    const accountId = searchParams.get('accountId')
    const minSize = searchParams.get('minSize')
    const maxSize = searchParams.get('maxSize')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (kind) params.set('kind', kind)
    if (accountId) params.set('accountId', accountId)
    if (minSize) params.set('minSize', minSize)
    if (maxSize) params.set('maxSize', maxSize)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    const query = params.toString()
    const path = query ? `/files?${query}` : '/files'
    const data = await apiFetch<{ files: BackendFile[] }>(path)
    setFiles(data.files.map(mapFile))
  }

  async function loadFolders() {
    const visiblePath = activeFolderId ? `/folders?parentId=${activeFolderId}` : '/folders'
    const [visibleData, allData] = await Promise.all([
      apiFetch<{ folders: BackendFolder[] }>(visiblePath),
      apiFetch<{ folders: BackendFolder[] }>('/folders?all=1'),
    ])
    setFolders(visibleData.folders.map(mapFolder))
    setAllFolders(allData.folders.map(mapFolder))
  }

  async function loadAll() {
    await Promise.all([loadFiles(), loadFolders()])
  }

  // After a modal closes there is nowhere inline to report a failed reload, so these use the page notice.
  function refreshFiles() {
    loadFiles().catch((error) => showError(error, 'Failed to refresh files'))
  }

  function refreshFolders() {
    loadFolders().catch((error) => showError(error, 'Failed to refresh folders'))
  }

  async function handleDropItem(fileId: string, targetFolderId: string) {
    const fileIds = selectedFileIds.has(fileId) ? Array.from(selectedFileIds) : [fileId]
    setLoading(true)
    setNotice(null)
    try {
      await apiFetch('/files/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds, folderId: targetFolderId })
      })
      showNotice(`Successfully moved ${fileIds.length} item(s).`, 'success', true)
      loadAll().catch(() => undefined)
      setSelectedFileIds(new Set())
    } catch (error) {
      showError(error, 'Failed to move items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let stale = false
    setListLoading(true)
    loadAll()
      .then(() => {
        if (!stale) setListFailed(false)
      })
      .catch((error) => {
        showError(error, 'Failed to load files')
        if (!stale) setListFailed(true)
      })
      .finally(() => {
        if (stale) return
        setListLoading(false)
        setListReady(true)
      })
    setSelectedFileIds(new Set())
    return () => { stale = true }
  }, [listKey])

  useEffect(() => {
    async function loadConnectedAccounts() {
      try {
        const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
        setConnectedAccounts(data.accounts || [])
      } catch (error) {
        console.error('Failed to load connected accounts:', error)
      }
    }
    loadConnectedAccounts()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setContextMenu({ x: 0, y: 0, file: null })
        setFolderContextMenu({ x: 0, y: 0, folder: null })
        setEmptyContextMenu({ x: 0, y: 0, open: false })
      }
      if (!(event.ctrlKey || event.metaKey) || isTyping(event.target)) return
      if (event.key.toLowerCase() === 'x' && activeFolderForMenu) {
        event.preventDefault()
        cutSelectedFolder(activeFolderForMenu)
      }
      if (event.key.toLowerCase() === 'v' && cutFolder) {
        event.preventDefault()
        pasteFolder().catch((error) => showError(error, 'Failed to paste folder'))
      }
    }

    function onOpenMoveShortcut(e: Event) {
      const file = (e as CustomEvent).detail as FileItem
      setActiveFile(file)
      setSelectedFolderId(file.folderId || '')
      setMoveOpen(true)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('9drive:open-move-modal', onOpenMoveShortcut)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('9drive:open-move-modal', onOpenMoveShortcut)
    }
  }, [activeFolderForMenu, cutFolder, activeFolderId])

  useEffect(() => {
    if (!previewOpen || !activeFile?.mimeType?.startsWith('video/') || !previewVideoRef.current) return undefined
    let disposed = false
    let player: { destroy: () => void } | null = null

    ensurePlyr().then(() => {
      if (disposed || !previewVideoRef.current) return
      player = createPlyr(previewVideoRef.current)
    }).catch(() => undefined)

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [previewOpen, activeFile?.mimeType, previewUrl])

  useEffect(() => {
    modalRun.current += 1
    setModalError('')
    setModalBusy(false)
  }, [folderOpen, renameOpen, moveOpen, deleteOpen, folderRenameOpen, folderDeleteOpen, shareOpen])

  function createFolder(event: FormEvent) {
    event.preventDefault()
    void runModalAction(async () => {
      await apiFetch('/folders', { method: 'POST', body: JSON.stringify({ name: folderName, color: folderColor, iconUrl: folderIconUrl, parentId: activeFolderId ?? null }) })
      setFolderName('')
      setFolderColor(defaultFolderColor)
      setFolderIconUrl(defaultFolderIconUrl)
      setFolderOpen(false)
      refreshFolders()
    }, 'Failed to create folder')
  }

  async function uploadFile(event: FormEvent) {
    event.preventDefault()
    if (selectedFiles.length === 0) return
    setLoading(true)
    setNotice(null)

    const uploadingFiles = [...selectedFiles]
    const targetFolderId = activeFolderId || selectedFolderId
    const targetAccountId = selectedTargetAccountId || null

    setSelectedFiles([])
    setSelectedFolderId('')
    setSelectedTargetAccountId('')
    setUploadOpen(false)

    try {
      await uploadFiles(uploadingFiles, targetFolderId, targetAccountId)
    } catch (err) {
      console.error('Upload initiation failed:', err)
    } finally {
      setLoading(false)
    }
  }


  async function syncGoogleDrive() {
    setSyncingDrive(true)
    setNotice(null)
    try {
      const response = await apiFetch<{ results: { created: number; updated: number; deleted: number }[] }>('/files/sync-google', { method: 'POST', body: JSON.stringify({}) })

      let created = 0, updated = 0, deleted = 0
      for (const res of response.results) {
        created += res.created
        updated += res.updated
        deleted += res.deleted
      }
      const accounts = response.results.length

      showNotice(`Google Drive synced. ${created} added, ${updated} updated, ${deleted} removed across ${accounts} account${accounts === 1 ? '' : 's'}.`, 'success')
      await loadAll()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      showError(error, 'Failed to sync Google Drive')
    } finally {
      setSyncingDrive(false)
    }
  }

  function selectUploadFiles(files: FileList | File[] | null | undefined) {
    if (!files) return
    const nextFiles = Array.from(files)
    if (nextFiles.length === 0) return
    setSelectedFiles(nextFiles)
  }

  function removeUploadFile(index: number) {
    setSelectedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
  }

  function handleUploadDrag(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === 'dragenter' || event.type === 'dragover') setIsUploadDragging(true)
    if (event.type === 'dragleave' || event.type === 'drop') setIsUploadDragging(false)
    if (event.type === 'drop') selectUploadFiles(event.dataTransfer.files)
  }



  function openContext(event: MouseEvent<HTMLElement>, file: FileItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFile(file)
    setContextMenu({ x: event.clientX, y: event.clientY, file })
  }

  function toggleFileSelection(file: FileItem) {
    if (!file.id) return
    setSelectedFileIds((current) => {
      const next = new Set(current)
      if (next.has(file.id!)) next.delete(file.id!)
      else next.add(file.id!)
      return next
    })
  }

  function toggleAllVisibleFiles() {
    const visibleIds = files.map((file) => file.id).filter(Boolean) as string[]
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedFileIds.has(id))
    setSelectedFileIds(allSelected ? new Set() : new Set(visibleIds))
  }

  function clearSelection() {
    setSelectedFileIds(new Set())
  }

  function changeFileViewMode(mode: FileViewMode) {
    setFileViewMode(mode)
    localStorage.setItem(fileViewStorageKey, mode)
  }

  function openFolderMenu(event: MouseEvent<HTMLElement>, folder: FolderItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFolderForMenu(folder)
    setFolderContextMenu({ x: event.clientX, y: event.clientY, folder })
  }

  function openFolder(folder: FolderItem) {
    if (!folder.id) return
    setSearchParams(searchQuery ? { folderId: folder.id, q: searchQuery } : { folderId: folder.id })
  }

  function openFolderById(folderId: string) {
    setSearchParams(searchQuery ? { folderId, q: searchQuery } : { folderId })
  }

  function openEmptyContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    setEmptyContextMenu({ x: event.clientX, y: event.clientY, open: true })
  }

  function closeFolder() {
    setSearchParams(searchQuery ? { q: searchQuery } : {})
  }

  async function viewFile() {
    if (!activeFile?.id) return
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(true)
    setPreviewOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
    try {
      const data = await apiFetch<{ path?: string; url: string }>(`/files/${activeFile.id}/preview-token`, { method: 'POST' })
      const previewPath = data.path ?? new URL(data.url).pathname
      setPreviewUrl(`${API_URL}${previewPath}`)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function downloadFile() {
    if (!activeFile?.id) return
    setContextMenu({ x: 0, y: 0, file: null })
    try {
      const response = await fetch(`${API_URL}/files/${activeFile.id}/download`, { headers: { Authorization: `Bearer ${getAccessToken()}` } })
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = activeFile.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      showError(error, 'Download failed')
    }
  }

  async function downloadBatchAsZip() {
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length === 0) return
    setLoading(true)
    setNotice(null)
    try {
      const response = await fetch(`${API_URL}/files/batch-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ fileIds: selectedIds })
      })
      if (!response.ok) throw new Error('Failed to download ZIP file')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '9drive-download.zip'
      link.click()
      URL.revokeObjectURL(url)
      clearSelection()
      showNotice('Batch download complete.', 'success', true)
    } catch (error) {
      showError(error, 'Batch download failed')
    } finally {
      setLoading(false)
    }
  }


  function renameFile(event: FormEvent) {
    event.preventDefault()
    if (!activeFile?.id) return
    void runModalAction(async () => {
      await apiFetch(`/files/${activeFile.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameValue }) })
      setRenameOpen(false)
      refreshFiles()
    }, 'Failed to rename file')
  }

  function moveFile(event: FormEvent) {
    event.preventDefault()
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length === 0 && !activeFile?.id) return
    void runModalAction(async () => {
      if (selectedIds.length > 0) await apiFetch('/files/batch', { method: 'PATCH', body: JSON.stringify({ fileIds: selectedIds, folderId: selectedFolderId || null }) })
      else await apiFetch(`/files/${activeFile?.id}`, { method: 'PATCH', body: JSON.stringify({ folderId: selectedFolderId || null }) })
      setMoveOpen(false)
      setSelectedFolderId('')
      clearSelection()
      refreshFiles()
    }, 'Failed to move files')
  }

  function deleteFile() {
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length === 0 && !activeFile?.id) return
    void runModalAction(async () => {
      if (selectedIds.length > 0) await apiFetch('/files/batch', { method: 'DELETE', body: JSON.stringify({ fileIds: selectedIds }) })
      else await apiFetch(`/files/${activeFile?.id}`, { method: 'DELETE' })
      setDeleteOpen(false)
      clearSelection()
      refreshFiles()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    }, 'Failed to delete files')
  }

  async function shareFile() {
    if (!activeFile?.id) return
    setContextMenu({ x: 0, y: 0, file: null })
    try {
      const data = await apiFetch<{ url: string }>(`/files/${activeFile.id}/share`, { method: 'POST' })
      setShareUrl(data.url)
      setCopiedShareLink(false)
      setGdrivePublicUrl('')
      setMakingPublic(false)
      setShareOpen(true)
    } catch (error) {
      showError(error, 'Failed to create share link')
    }
  }

  async function copyShareLinkDirect() {
    if (!activeFile?.id) return
    try {
      const data = await apiFetch<{ url: string | null }>(`/files/${activeFile.id}/view-url`)
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        showNotice('Google Drive link copied to clipboard!', 'success', true)
      } else {
        const shareData = await apiFetch<{ url: string }>(`/files/${activeFile.id}/share`, { method: 'POST' })
        await navigator.clipboard.writeText(shareData.url)
        showNotice('Share link copied to clipboard!', 'success', true)
      }
    } catch (error) {
      showNotice(`Failed to copy link: ${error instanceof Error ? error.message : error}`, 'danger', true)
    }
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function inviteToFile() {
    if (!activeFile?.id) return
    setInviteTargetType('file')
    setInviteTargetId(activeFile.id)
    setInviteMessage('')
    setInviteOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function inviteToFolder() {
    if (!activeFolderForMenu?.id) return
    setInviteTargetType('folder')
    setInviteTargetId(activeFolderForMenu.id)
    setInviteMessage('')
    setInviteOpen(true)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
  }

  async function copyFolderLink() {
    if (!activeFolderForMenu?.id) return
    let url = `${window.location.origin}/all-files?folderId=${activeFolderForMenu.id}`
    if (activeFolderForMenu.providerFolderId) {
      url = `https://drive.google.com/open?id=${activeFolderForMenu.providerFolderId}`
    }
    setFolderContextMenu({ x: 0, y: 0, folder: null })
    try {
      await navigator.clipboard.writeText(url)
      showNotice('Folder link copied to clipboard!', 'success', true)
    } catch (error) {
      showError(error, 'Failed to copy folder link')
    }
  }

  async function sendInvite(event: FormEvent) {
    event.preventDefault()
    if (!inviteTargetId) return
    setInviting(true)
    setInviteMessage('')
    try {
      await apiFetch('/invites', { method: 'POST', body: JSON.stringify({ email: inviteEmail, role: inviteRole, targetType: inviteTargetType, targetId: inviteTargetId }) })
      setInviteEmail('')
      setInviteRole('viewer')
      setInviteMessage('Invite saved. Member will appear in Shared.')
      window.dispatchEvent(new Event('9drive:invites-changed'))
    } catch (error) {
      setInviteMessage(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopiedShareLink(true)
    window.setTimeout(() => setCopiedShareLink(false), 1600)
  }

  function renameFolder(event: FormEvent) {
    event.preventDefault()
    if (!activeFolderForMenu?.id) return
    void runModalAction(async () => {
      await apiFetch(`/folders/${activeFolderForMenu.id}`, { method: 'PATCH', body: JSON.stringify({ name: folderRenameValue, color: folderRenameColor, iconUrl: folderRenameIconUrl }) })
      setFolderRenameOpen(false)
      refreshFolders()
    }, 'Failed to rename folder')
  }

  function deleteFolder() {
    if (!activeFolderForMenu?.id) return
    void runModalAction(async () => {
      await apiFetch(`/folders/${activeFolderForMenu.id}`, { method: 'DELETE' })
      setFolderDeleteOpen(false)
      refreshFolders()
      refreshFiles()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    }, 'Failed to delete folder')
  }

  function cutSelectedFolder(folder: FolderItem | null) {
    if (!folder?.id) return
    setCutFolder(folder)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
    setNotice(null)
  }

  async function pasteFolder() {
    if (!cutFolder?.id) return
    await apiFetch(`/folders/${cutFolder.id}`, { method: 'PATCH', body: JSON.stringify({ parentId: activeFolderId ?? null }) })
    showNotice(`Folder "${cutFolder.name}" moved.`, 'success', true)
    setCutFolder(null)
    await loadFolders()
  }

  function closePreview() {
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(false)
    setPreviewOpen(false)
  }

  useEffect(() => {
    function handleUploadCompleted() {
      loadAll().catch(() => undefined)
    }
    window.addEventListener('9drive:upload-completed', handleUploadCompleted)
    return () => window.removeEventListener('9drive:upload-completed', handleUploadCompleted)
  }, [listKey])

  const actionButtons = (
    <>
      <Button size="sm" onClick={() => setUploadOpen(true)}>
        <Upload className="h-3.5 w-3.5" />Upload
      </Button>
      <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}>
        <FolderPlus className="h-3.5 w-3.5" />New Folder
      </Button>
      <Button size="sm" variant="outline" disabled={syncingDrive} onClick={syncGoogleDrive}>
        <RefreshCw className={syncingDrive ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        {syncingDrive ? 'Syncing...' : 'Sync'}
      </Button>
    </>
  )
  const sizePicker = <Segmented label="Folder size" options={folderSizeOptions} value={folderSizeScale} onChange={changeFolderSize} />

  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-2">
        {sizePicker}
        <div className="h-6 w-px bg-line" />
        {actionButtons}
      </div>
    )
  }, [syncingDrive, folderSizeScale, listKey])

  // The header outlives this page, so its actions have to be removed on the way out.
  useEffect(() => () => setHeaderActions(null), [])

  const recentFolders = folders.slice(0, 4)
  const moreFolders = folders.slice(4)
  const activeFolder = allFolders.find((folder) => folder.id === activeFolderId)
  const folderBreadcrumbs = (() => {
    if (!activeFolder) return []
    const foldersById = new Map(allFolders.map((folder) => [folder.id, folder]))
    const path: FolderItem[] = []
    const visited = new Set<string>()
    let current: FolderItem | undefined = activeFolder
    while (current?.id && !visited.has(current.id)) {
      path.unshift(current)
      visited.add(current.id)
      current = current.parentId ? foldersById.get(current.parentId) : undefined
    }
    return path
  })()
  const allVisibleSelected = files.length > 0 && files.every((file) => file.id && selectedFileIds.has(file.id))
  const activePreviewKind = getPreviewKind(activeFile?.mimeType)
  const breadcrumbLink = 'text-accent transition-opacity duration-150 hover:opacity-80'
  const sectionHeading = 'mt-6 text-base font-extrabold tracking-tight text-fg'
  const emptyFilesTitle = searchQuery ? `No files found for "${searchQuery}"` : hasFilters ? 'No files match these filters' : activeFolder ? 'No files in this folder yet' : 'No uploaded files yet'
  const emptyFilesDescription = searchQuery || hasFilters ? 'Try a different search or clear your filters.' : activeFolder ? 'Upload a file or drag one onto this folder.' : 'Connect Google Drive in Settings, then upload a file.'
  const modalErrorAlert = modalError ? <Alert tone="danger">{modalError}</Alert> : null

  return (
    <>
      <div onContextMenu={openEmptyContextMenu} className="min-h-[620px] w-full min-w-0">
        <PageHeader title={activeFolder ? <span className="block min-w-0 truncate"><button className={breadcrumbLink} onClick={closeFolder}>All Files</button>{folderBreadcrumbs.map((folder, index) => <span key={folder.id}><span className="text-fg-subtle"> / </span>{index === folderBreadcrumbs.length - 1 ? <span>{folder.name}</span> : <button className={breadcrumbLink} onClick={() => folder.id && openFolderById(folder.id)}>{folder.name}</button>}</span>)}</span> : 'All Files'} />
        {/* Action buttons row: the header slot only has room for these from the xl breakpoint */}
        <div className="mt-4 flex flex-wrap items-center gap-2 xl:hidden">
          {actionButtons}
          {sizePicker}
        </div>
        {notice ? <Alert tone={notice.tone} className="mt-3">{notice.text}</Alert> : null}
        {cutFolder ? <Alert tone="warning" icon={ClipboardPaste} className="mt-3">Cut folder: {cutFolder.name}. Press {pasteShortcut} or right-click an empty area to paste here.</Alert> : null}

        {!listReady ? (
          <>
            <FolderGridSkeleton sizeScale={folderSizeScale} />
            <FileTableSkeleton className="mt-6" />
          </>
        ) : listFailed ? (
          <Card className="mt-4"><LoadFailedState /></Card>
        ) : (
          <div className={cn('transition-opacity duration-200', listLoading && 'opacity-60')}>
            {!activeFolder && (recentFolders.length > 0 ? <FolderGrid items={recentFolders} mobileTwoColumns sizeScale={folderSizeScale} onFolderMenu={openFolderMenu} onFolderOpen={openFolder} onDropItem={handleDropItem} /> : <p className="mt-4 rounded-xl bg-surface-sunken p-4 text-sm text-fg-muted">No folders yet. Click New Folder to organize uploads.</p>)}
            {!activeFolder && moreFolders.length > 0 ? <>
              <h2 className={sectionHeading}>More Folders</h2>
              <FolderGrid items={moreFolders} sizeScale={folderSizeScale} onFolderMenu={openFolderMenu} onFolderOpen={openFolder} onDropItem={handleDropItem} />
            </> : null}
            {activeFolder && folders.length > 0 ? <>
              <h2 className={sectionHeading}>Folders</h2>
              <FolderGrid items={folders} sizeScale={folderSizeScale} onFolderMenu={openFolderMenu} onFolderOpen={openFolder} onDropItem={handleDropItem} />
            </> : null}

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="soft" size="sm" className="hidden disabled:pointer-events-auto disabled:cursor-not-allowed sm:inline-flex" disabled title="Coming soon"><Archive className="h-4 w-4" />Recents</Button>
                <Button variant="soft" size="sm" className="hidden disabled:pointer-events-auto disabled:cursor-not-allowed sm:inline-flex" disabled title="Coming soon"><Star className="h-4 w-4" />Starred</Button>
              </div>
              <Segmented label="File view" options={fileViewOptions} value={fileViewMode} onChange={changeFileViewMode} />
            </div>

            {selectedFileIds.size > 0 ? (
              <div className="mt-3 flex animate-rise flex-col gap-3 rounded-2xl border border-accent-line bg-accent-soft p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-extrabold tabular-nums text-fg">{selectedFileIds.size} selected</span>
                <div className="grid grid-cols-4 gap-2 sm:flex">
                  <Button size="sm" className="w-full" variant="outline" onClick={downloadBatchAsZip}><Download className="h-4 w-4" />ZIP</Button>
                  <Button size="sm" className="w-full" variant="outline" onClick={() => setMoveOpen(true)}><FolderInput className="h-4 w-4" />Move</Button>
                  <Button size="sm" className="w-full" variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />Delete</Button>
                  <Button size="sm" className="w-full" variant="ghost" onClick={clearSelection}>Clear</Button>
                </div>
              </div>
            ) : null}

            {files.length === 0 ? (
              <Card className="mt-3">
                <EmptyState icon={searchQuery || hasFilters ? FileSearch : FolderOpen} title={emptyFilesTitle} description={emptyFilesDescription} />
              </Card>
            ) : fileViewMode === 'grid' ? (
              <FileGrid files={files} selectedFileIds={selectedFileIds} sizeScale={folderSizeScale} onToggleFile={toggleFileSelection} onFileContextMenu={openContext} />
            ) : (
              <FileTable className="mt-3" files={files} selectedFileIds={selectedFileIds} allSelected={allVisibleSelected} onToggleFile={toggleFileSelection} onToggleAll={toggleAllVisibleFiles} onFileContextMenu={openContext} />
            )}
          </div>
        )}
      </div>
      <EmptyAreaContextMenu x={emptyContextMenu.x} y={emptyContextMenu.y} open={emptyContextMenu.open} canPasteFolder={Boolean(cutFolder)} onClose={() => setEmptyContextMenu({ x: 0, y: 0, open: false })} onUpload={() => { setUploadOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onCreateFolder={() => { setFolderOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onPasteFolder={() => { pasteFolder().catch((error) => showError(error, 'Failed to paste folder')); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} />
      <FileContextMenu x={contextMenu.x} y={contextMenu.y} file={contextMenu.file} onClose={() => setContextMenu({ x: 0, y: 0, file: null })} onView={viewFile} onDownload={downloadFile} onRename={() => { setRenameValue(activeFile?.name ?? ''); setRenameOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onMove={() => { setMoveOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onDetails={() => { setDetailOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onShare={shareFile} onCopyLink={copyShareLinkDirect} onInvite={inviteToFile} onDelete={() => { setDeleteOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} />
      <FolderContextMenu x={folderContextMenu.x} y={folderContextMenu.y} folder={folderContextMenu.folder} onClose={() => setFolderContextMenu({ x: 0, y: 0, folder: null })} onCut={() => cutSelectedFolder(activeFolderForMenu)} onRename={() => { setFolderRenameValue(activeFolderForMenu?.name ?? ''); setFolderRenameColor(normalizeFolderColor(activeFolderForMenu?.color)); setFolderRenameIconUrl(activeFolderForMenu?.iconUrl ?? defaultFolderIconUrl); setFolderRenameOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} onInvite={inviteToFolder} onCopyLink={copyFolderLink} onDelete={() => { setFolderDeleteOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} />
      <FileDetailsDrawer open={detailOpen} file={activeFile} onClose={() => setDetailOpen(false)} />

      <DummyModal open={uploadOpen} title="Upload File" description="Stream file directly to selected Google Drive account." onClose={() => setUploadOpen(false)}>
        <form onSubmit={uploadFile} className="grid gap-4">
          <label onDragEnter={handleUploadDrag} onDragOver={handleUploadDrag} onDragLeave={handleUploadDrag} onDrop={handleUploadDrag} className={cn('relative grid cursor-pointer gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-[background-color,border-color,transform] duration-200 ease-soft focus-within:border-accent-solid sm:p-6', isUploadDragging ? 'scale-[1.01] border-accent-solid bg-accent-soft' : 'border-line-strong bg-surface-sunken hover:border-accent-line hover:bg-accent-soft')}>
            <Upload className={cn('mx-auto h-8 w-8 transition-[transform,color] duration-200 ease-soft', isUploadDragging ? '-translate-y-1 text-accent' : 'text-fg-subtle')} aria-hidden="true" />
            <span className="text-sm font-extrabold text-fg">Drop file here or click to browse</span>
            <span className="text-xs text-fg-muted">Metadata is sent before the file so upload can stream directly to Google Drive.</span>
            <input type="file" className="sr-only" multiple onChange={(event) => selectUploadFiles(event.target.files)} required={selectedFiles.length === 0} />
          </label>
          <Field label="Target Storage Account">
            <Select value={selectedTargetAccountId} onChange={(event) => setSelectedTargetAccountId(event.target.value)}>
              <option value="">Automatic (Default)</option>
              {connectedAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email || account.displayName || account.id} ({account.provider === 's3' ? 'S3' : 'Google Drive'})
                </option>
              ))}
            </Select>
          </Field>
          {activeFolder ? <p className="rounded-xl bg-surface-sunken p-3 text-sm text-fg-muted">Uploading to: <b className="font-semibold text-fg">{activeFolder.name}</b></p> : <Field label="Virtual Folder"><Select value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}><option value="">No folder</option>{allFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</Select></Field>}
          {selectedFiles.length > 0 ? (
            <div className="grid max-h-56 animate-rise gap-2 overflow-y-auto rounded-xl bg-surface-sunken p-3 text-sm text-fg-muted">
              <div className="flex items-center justify-between gap-3"><span className="font-bold text-fg">{selectedFiles.length} selected</span><span className="shrink-0 tabular-nums">{formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))}</span></div>
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-fg" title={file.name}>{file.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-fg-muted">{formatBytes(file.size)}</span>
                  <button type="button" className="shrink-0 text-fg-subtle transition-colors duration-150 hover:text-danger" onClick={() => removeUploadFile(index)} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3 sm:flex sm:justify-end"><Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button disabled={loading || selectedFiles.length === 0}>{loading ? 'Uploading...' : `Upload${selectedFiles.length > 1 ? ` ${selectedFiles.length} files` : ''}`}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={folderOpen} title="New Folder" description="Create a virtual folder for organizing files." onClose={() => setFolderOpen(false)}>
        <form onSubmit={createFolder} className="grid gap-4">
          <Field label="Folder Name"><Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Project Assets" required /></Field>
          <FolderAppearanceFields color={folderColor} iconUrl={folderIconUrl} onColorChange={setFolderColor} onIconChange={setFolderIconUrl} />
          {modalErrorAlert}
          <div className="grid gap-3 pt-2 sm:flex sm:justify-end"><Button type="button" variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button><Button disabled={modalBusy}>{modalBusy ? 'Creating...' : 'Create Folder'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={renameOpen} title="Rename File" description={activeFile?.name ?? ''} onClose={() => setRenameOpen(false)}>
        <form onSubmit={renameFile} className="grid gap-4">
          <Field label="File Name"><Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required /></Field>
          {modalErrorAlert}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button><Button disabled={modalBusy}>{modalBusy ? 'Renaming...' : 'Rename'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={moveOpen} title="Move to Folder" description={selectedFileIds.size > 0 ? `Move ${selectedFileIds.size} files` : activeFile?.name ?? ''} onClose={() => setMoveOpen(false)}>
        <form onSubmit={moveFile} className="grid gap-4">
          <Field label="Destination Folder"><Select value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}><option value="">No folder</option>{allFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</Select></Field>
          {modalErrorAlert}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button><Button disabled={modalBusy}>{modalBusy ? 'Moving...' : 'Move'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={deleteOpen} title={selectedFileIds.size > 0 ? 'Delete Files' : 'Delete File'} description={selectedFileIds.size > 0 ? `Move ${selectedFileIds.size} files to the Recycle Bin? You can restore them from there.` : `Move ${activeFile?.name ?? 'this file'} to the Recycle Bin? You can restore it from there.`} onClose={() => setDeleteOpen(false)}>
        <div className="grid gap-4">
          {modalErrorAlert}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" disabled={modalBusy} onClick={deleteFile}><Trash2 className="h-4 w-4" />{modalBusy ? 'Deleting...' : 'Delete'}</Button></div>
        </div>
      </DummyModal>
      <DummyModal open={shareOpen} title="Share Link" description={activeFile?.name ?? ''} onClose={() => setShareOpen(false)}>
        <div className="grid gap-4">
          <Field label="9Drive Public Share Link (No GDrive login required)"><Input value={shareUrl} readOnly /></Field>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
            <Button onClick={copyShareLink}>{copiedShareLink ? <CheckCircle className="h-4 w-4 animate-tick" /> : null}{copiedShareLink ? 'Copied!' : 'Copy Link'}</Button>
          </div>
          {copiedShareLink ? <Alert tone="success">Share link copied to clipboard.</Alert> : null}

          {activeFile?.accountProvider === 'google_drive' && (
            <div className="mt-4 grid gap-3 border-t border-line pt-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-fg">Google Drive Direct Link (Public Access)</p>
                <p className="mb-2 text-xs text-fg-muted">Configure this file to be publicly accessible on Google Drive so external tools can edit/download it.</p>
              </div>
              {gdrivePublicUrl ? (
                <div className="grid gap-2">
                  <Input value={gdrivePublicUrl} readOnly aria-label="Google Drive public link" />
                  <Alert tone="success">Google Drive public link generated and copied to clipboard!</Alert>
                </div>
              ) : (
                <Button
                  variant="outline"
                  disabled={makingPublic}
                  onClick={async () => {
                    if (!activeFile?.id) return
                    setMakingPublic(true)
                    setModalError('')
                    try {
                      const res = await apiFetch<{ url: string }>('/files/' + activeFile.id + '/public-permission', { method: 'POST' })
                      setGdrivePublicUrl(res.url)
                      await navigator.clipboard.writeText(res.url)
                    } catch (error) {
                      setModalError(`Failed to update Google Drive permission: ${error instanceof Error ? error.message : error}`)
                    } finally {
                      setMakingPublic(false)
                    }
                  }}
                  className="w-full border-accent-line bg-accent-soft text-accent hover:bg-accent-soft"
                >
                  {makingPublic ? 'Making Public...' : 'Make Public & Copy GDrive Link'}
                </Button>
              )}
              {modalErrorAlert}
            </div>
          )}
        </div>
      </DummyModal>
      <DummyModal open={folderRenameOpen} title="Rename Folder" description={activeFolderForMenu?.name ?? ''} onClose={() => setFolderRenameOpen(false)}>
        <form onSubmit={renameFolder} className="grid gap-4">
          <Field label="Folder Name"><Input value={folderRenameValue} onChange={(event) => setFolderRenameValue(event.target.value)} required /></Field>
          <FolderAppearanceFields color={folderRenameColor} iconUrl={folderRenameIconUrl} onColorChange={setFolderRenameColor} onIconChange={setFolderRenameIconUrl} />
          {modalErrorAlert}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setFolderRenameOpen(false)}>Cancel</Button><Button disabled={modalBusy}>{modalBusy ? 'Renaming...' : 'Rename'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={folderDeleteOpen} title="Delete Folder" description={`Delete ${activeFolderForMenu?.name ?? 'this folder'} and everything inside it?`} onClose={() => setFolderDeleteOpen(false)}>
        <div className="grid gap-4">
          <Alert tone="warning">Files in this folder that are stored on Google Drive are permanently deleted from Drive. They will be listed in the Recycle Bin, but they can't be recovered.</Alert>
          {modalErrorAlert}
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setFolderDeleteOpen(false)}>Cancel</Button><Button variant="danger" disabled={modalBusy} onClick={deleteFolder}><Trash2 className="h-4 w-4" />{modalBusy ? 'Deleting...' : 'Delete'}</Button></div>
        </div>
      </DummyModal>
      <DummyModal open={inviteOpen} title="Invite Member" description={`Share ${inviteTargetType === 'file' ? (activeFile?.name ?? 'file') : (activeFolderForMenu?.name ?? 'folder')} with a team member.`} onClose={() => setInviteOpen(false)}>
        <form onSubmit={sendInvite} className="grid gap-4">
          <Field label="Email Address"><Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@example.com" required /></Field>
          <Field label="Role"><Select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="viewer">Can view</option><option value="editor">Can edit</option></Select></Field>
          {inviteMessage ? <Alert>{inviteMessage}</Alert> : null}
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button disabled={inviting}>{inviting ? 'Sending...' : 'Send Invite'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={previewOpen} title="File Preview" description={activeFile?.name ?? ''} onClose={closePreview} className="overflow-hidden sm:max-w-[95vw] xl:max-w-[1400px]">
        <div className="flex h-[min(72dvh,calc(100dvh-9rem))] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-sunken sm:h-[min(80vh,calc(100dvh-9rem))]">
          {previewLoading ? <div className="flex items-center gap-2 p-6 text-sm font-semibold text-fg-muted"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Loading preview...</div> : null}
          {previewError ? <div className="p-6 text-center text-sm font-medium text-danger">{previewError}</div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'image' && previewUrl ? <img src={previewUrl} alt={activeFile?.name ?? 'File preview'} className="max-h-full max-w-full animate-fade-in object-contain" onError={() => setPreviewError('Failed to load preview.')} /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'video' && previewUrl ? <div className="shared-video-shell"><video ref={previewVideoRef} controls playsInline preload="metadata" onError={() => setPreviewError('Failed to load preview.')}><source src={previewUrl} type={activeFile?.mimeType} /></video></div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'document' && previewUrl ? <iframe src={previewUrl} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white" /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'office' && previewUrl ? <iframe src={officeViewerUrl(previewUrl)} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white" /> : null}
          {!previewLoading && !previewError && !activePreviewKind ? <div className="p-6 text-center text-sm text-fg-muted">Preview not available for this file type. Use Download instead.</div> : null}
        </div>
      </DummyModal>
    </>
  )
}
