import {
  Archive,
  BookOpen,
  Box,
  Briefcase,
  Calendar,
  ChartColumn,
  Clock,
  Cloud,
  CloudDownload,
  CloudUpload,
  Code,
  Database,
  FileArchive,
  FileCode,
  FileImage,
  FileMusic,
  FilePlay,
  FileText,
  Files,
  Film,
  Folder,
  FolderOpen,
  Folders,
  GraduationCap,
  HardDrive,
  Headphones,
  Heart,
  Image,
  Images,
  Lock,
  Music,
  Notebook,
  Package,
  Receipt,
  Rocket,
  Server,
  Share2,
  Shield,
  Sparkles,
  Star,
  Terminal,
  UserCheck,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FolderItem } from '@/data/drive-data'

const legacyColorMap: Record<string, string> = {
  'text-blue-500': '#3b82f6',
  'text-lime-500': '#84cc16',
  'text-cyan-400': '#22d3ee',
  'text-yellow-400': '#facc15',
  'text-orange-500': '#f97316',
}

// Folders store these URLs as stable icon IDs (the API validates the prefix). Icons render
// locally from lucide-react, so folders never depend on an external image service.
const iconId = (name: string) => `https://api.iconify.design/lucide:${name}.svg`

export const defaultFolderColor = '#3b82f6'
export const defaultFolderIconUrl = iconId('folder')

export const folderIconOptions: { label: string; url: string; icon: LucideIcon }[] = [
  { label: 'Folder', url: defaultFolderIconUrl, icon: Folder },
  { label: 'Folder Open', url: iconId('folder-open'), icon: FolderOpen },
  { label: 'Folders', url: iconId('folders'), icon: Folders },
  { label: 'Files', url: iconId('files'), icon: Files },
  { label: 'File Text', url: iconId('file-text'), icon: FileText },
  { label: 'File Image', url: iconId('file-image'), icon: FileImage },
  { label: 'File Video', url: iconId('file-video'), icon: FilePlay },
  { label: 'File Music', url: iconId('file-music'), icon: FileMusic },
  { label: 'File Code', url: iconId('file-code'), icon: FileCode },
  { label: 'File Archive', url: iconId('file-archive'), icon: FileArchive },
  { label: 'Briefcase', url: iconId('briefcase'), icon: Briefcase },
  { label: 'Archive', url: iconId('archive'), icon: Archive },
  { label: 'Cloud', url: iconId('cloud'), icon: Cloud },
  { label: 'Cloud Upload', url: iconId('cloud-upload'), icon: CloudUpload },
  { label: 'Cloud Download', url: iconId('cloud-download'), icon: CloudDownload },
  { label: 'Hard Drive', url: iconId('hard-drive'), icon: HardDrive },
  { label: 'Database', url: iconId('database'), icon: Database },
  { label: 'Server', url: iconId('server'), icon: Server },
  { label: 'Image', url: iconId('image'), icon: Image },
  { label: 'Images', url: iconId('images'), icon: Images },
  { label: 'Video', url: iconId('video'), icon: Video },
  { label: 'Film', url: iconId('film'), icon: Film },
  { label: 'Music', url: iconId('music'), icon: Music },
  { label: 'Headphones', url: iconId('headphones'), icon: Headphones },
  { label: 'Code', url: iconId('code'), icon: Code },
  { label: 'Terminal', url: iconId('terminal'), icon: Terminal },
  { label: 'Package', url: iconId('package'), icon: Package },
  { label: 'Box', url: iconId('box'), icon: Box },
  { label: 'Book Open', url: iconId('book-open'), icon: BookOpen },
  { label: 'Notebook', url: iconId('notebook'), icon: Notebook },
  { label: 'Graduation Cap', url: iconId('graduation-cap'), icon: GraduationCap },
  { label: 'Receipt', url: iconId('receipt'), icon: Receipt },
  { label: 'Wallet', url: iconId('wallet'), icon: Wallet },
  { label: 'Chart', url: iconId('chart-column'), icon: ChartColumn },
  { label: 'Calendar', url: iconId('calendar'), icon: Calendar },
  { label: 'Clock', url: iconId('clock'), icon: Clock },
  { label: 'Users', url: iconId('users'), icon: Users },
  { label: 'User Check', url: iconId('user-check'), icon: UserCheck },
  { label: 'Share', url: iconId('share-2'), icon: Share2 },
  { label: 'Lock', url: iconId('lock'), icon: Lock },
  { label: 'Shield', url: iconId('shield'), icon: Shield },
  { label: 'Star', url: iconId('star'), icon: Star },
  { label: 'Heart', url: iconId('heart'), icon: Heart },
  { label: 'Rocket', url: iconId('rocket'), icon: Rocket },
  { label: 'Sparkles', url: iconId('sparkles'), icon: Sparkles },
]

const iconsById = new Map(folderIconOptions.map((option) => [option.url, option.icon]))

export const folderColorOptions = ['#3b82f6', '#84cc16', '#22d3ee', '#facc15', '#f97316', '#ef4444', '#a855f7', '#14b8a6']

export function normalizeFolderColor(color?: string | null) {
  if (color?.startsWith('#')) return color
  return legacyColorMap[color ?? ''] ?? defaultFolderColor
}

export function FolderVisual({ folder, className, iconClassName }: { folder: Pick<FolderItem, 'color' | 'iconUrl'>; className?: string; iconClassName?: string }) {
  const Icon = iconsById.get(folder.iconUrl?.split('?')[0] ?? '') ?? Folder
  return (
    <span className={cn('inline-flex items-center justify-center', className)} style={{ color: normalizeFolderColor(folder.color) }}>
      <Icon className={cn('h-full w-full', iconClassName)} strokeWidth={1.5} fill="currentColor" fillOpacity={0.14} aria-hidden="true" />
    </span>
  )
}
