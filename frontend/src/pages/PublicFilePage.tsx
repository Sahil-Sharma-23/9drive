import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink, FileArchive, FileText, ImageIcon, LoaderCircle, Play, Table2, type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { IconTile } from '@/components/ui/icon-tile'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { createPlyr, ensurePlyr } from '@/lib/plyr'
import { getPreviewKind, isSpreadsheetMimeType, officeViewerUrl } from '@/lib/preview'
import { cn } from '@/lib/utils'

type PublicFile = { name: string; mimeType: string; sizeBytes: string; createdAt: string }

function previewIcon(file: PublicFile, kind: ReturnType<typeof getPreviewKind>): LucideIcon {
  if (kind === 'image') return ImageIcon
  if (kind === 'video') return Play
  if (isSpreadsheetMimeType(file.mimeType)) return Table2
  if (kind === 'document' || kind === 'office') return FileText
  return FileArchive
}

function UnsupportedPreview({ file, downloadUrl }: { file: PublicFile; downloadUrl: string }) {
  return (
    <EmptyState
      icon={FileArchive}
      title="Preview not available"
      description={`${file.name} cannot be previewed in browser. Download file to open it locally.`}
      className="h-full min-h-[360px]"
      action={<a href={downloadUrl} download className={buttonVariants()}><Download className="h-4 w-4" />Download</a>}
    />
  )
}

export function PublicFilePage({ embed = false }: { embed?: boolean }) {
  const { token } = useParams()
  const [file, setFile] = useState<PublicFile | null>(null)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previewUrl = `${API_URL}/public/files/${token}/preview`
  const downloadUrl = `${API_URL}/public/files/${token}/download`
  const kind = getPreviewKind(file?.mimeType)

  useEffect(() => {
    setFailed(false)
    apiFetch<{ file: PublicFile }>(`/public/files/${token}`, { skipAuth: true })
      .then((data) => setFile(data.file))
      .catch(() => {
        setFile(null)
        setFailed(true)
      })
  }, [token])

  useEffect(() => {
    document.title = file ? `${file.name} | 9Drive` : 'Shared file | 9Drive'
    return () => {
      document.title = '9Drive'
    }
  }, [file])

  useEffect(() => {
    if (kind !== 'video' || !videoRef.current) return undefined
    let disposed = false
    let player: { destroy: () => void } | null = null

    ensurePlyr().then(() => {
      if (disposed || !videoRef.current) return
      player = createPlyr(videoRef.current)
    }).catch(() => undefined)

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [kind, previewUrl])

  if (failed) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Card className="w-full max-w-md animate-page-in">
          <EmptyState icon={FileArchive} title="Shared file not found" description="Link may be expired, disabled, or deleted." />
        </Card>
      </main>
    )
  }

  if (!file) {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-2 text-sm font-semibold text-fg-muted">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading shared file...
      </main>
    )
  }

  const preview = (
    <div className="flex h-full w-full animate-fade-in items-center justify-center">
      {kind === 'image' ? <img src={previewUrl} alt={file.name} className="max-h-full max-w-full object-contain" /> : null}
      {kind === 'video' ? <div className="shared-video-shell"><video ref={videoRef} controls playsInline preload="metadata"><source src={previewUrl} type={file.mimeType} /></video></div> : null}
      {kind === 'document' ? <iframe src={previewUrl} title={file.name} className="h-full w-full border-0 bg-white" /> : null}
      {kind === 'office' ? <iframe src={officeViewerUrl(previewUrl)} title={file.name} className="h-full w-full border-0 bg-white" /> : null}
      {!kind ? <UnsupportedPreview file={file} downloadUrl={downloadUrl} /> : null}
    </div>
  )

  if (embed) {
    return <main className={cn('h-dvh overflow-hidden', kind === 'image' || kind === 'video' ? 'bg-black' : 'bg-surface-raised')}>{preview}</main>
  }

  return (
    <main className="min-h-dvh overflow-hidden">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface-raised/90 px-4 shadow-card backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={previewIcon(file, kind)} tone="neutral" size="sm" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-fg sm:text-base">{file.name}</h1>
            <p className="truncate text-xs tabular-nums text-fg-muted">{formatBytes(file.sizeBytes)} • Uploaded {formatDate(file.createdAt)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href={`/public/files/${token}/embed`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden sm:inline-flex')}><ExternalLink className="h-4 w-4" />Embed</a>
          <a href={downloadUrl} download className={buttonVariants({ variant: 'outline' })}><Download className="h-4 w-4" />Download</a>
        </div>
      </header>

      <section className="flex h-dvh items-center justify-center px-3 pb-6 pt-20 sm:px-6">
        <Card className="relative h-full w-full animate-page-in overflow-hidden">{preview}</Card>
      </section>
    </main>
  )
}
