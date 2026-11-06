import { File, FileImage, FilePlay, FileText, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/data/drive-data'

/** The one place file kinds get their icon and colour. */
export const fileKinds: Record<FileItem['kind'], { icon: LucideIcon; tile: string; dot: string }> = {
  image: { icon: FileImage, tile: 'bg-kind-image/15 text-kind-image', dot: 'bg-kind-image' },
  video: { icon: FilePlay, tile: 'bg-kind-video/15 text-kind-video', dot: 'bg-kind-video' },
  pdf: { icon: FileText, tile: 'bg-kind-pdf/15 text-kind-pdf', dot: 'bg-kind-pdf' },
  doc: { icon: File, tile: 'bg-kind-doc/15 text-kind-doc', dot: 'bg-kind-doc' },
}

export function fileKindFromMime(mimeType: string): FileItem['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'doc'
}

export function FileIcon({ kind, className }: { kind: FileItem['kind']; className?: string }) {
  const { icon: Icon, tile } = fileKinds[kind]
  return (
    <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tile, className)}>
      <Icon className="h-[56%] w-[56%]" aria-hidden="true" />
    </span>
  )
}
