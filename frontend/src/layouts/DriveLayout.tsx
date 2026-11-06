import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Outlet, useOutletContext, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell,
  Braces,
  FileArchive,
  Gauge,
  History,
  LogOut,
  Menu,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
  ShieldCheck,
  HardDrive,
  Info,
  CheckCircle,
  ChevronDown,
  Upload
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { fileKinds } from '@/components/drive/FileIcon'
import { ThemeToggle } from '@/components/drive/ThemeToggle'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress, type ProgressTone } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { apiFetch, formatBytes } from '@/lib/api'
import { useUpload, type UploadProgressStatus } from '@/context/UploadContext'
import { clearAuthSession, getStoredUser, updateStoredUser, type AuthUser } from '@/lib/auth'
import { getGravatarUrl } from '@/lib/gravatar'
import { useDismiss } from '@/lib/use-dismiss'
import { useLatestWhile, usePresence } from '@/lib/use-presence'
import { cn } from '@/lib/utils'

const menu = [
  { label: 'All Files', icon: FileArchive, href: '/all-files' },
  { label: 'Quota Tracker', icon: Gauge, href: '/quota' },
  { label: 'Shared With Me', icon: Share2, href: '/shared' },
  { label: 'Starred', icon: Star, href: '/starred', disabled: true },
  { label: 'Recycle Bin', icon: Trash2, href: '/trash' },
  { label: 'Activity Log', icon: History, href: '/activity' },
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'API Keys', icon: Braces, href: '/api' },
]

// Matches the nav rows below: h-10 plus gap-1. The active pill slides by this step.
const navRowStepRem = 2.75

type StorageSummary = {
  totalBytes: string
  usedBytes: string
  availableBytes: string
  accounts?: { id: string; provider: string; email: string; status: string }[]
}

type StorageBreakdown = {
  photo: string
  video: string
  document: string
}

const popoverMotion = 'origin-top data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in'

function ConnectionRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface-sunken p-2.5 text-xs">
      <span className="font-semibold text-fg">{label}</span>
      <Badge tone={count > 0 ? 'success' : 'warning'}>{count} Connected</Badge>
    </div>
  )
}

function SystemInfoDropdown({ storage, state }: { storage: StorageSummary | null; state: 'open' | 'closed' }) {
  const connected = storage?.accounts?.filter((account) => account.status === 'connected') ?? []
  const activeGoogle = connected.filter((account) => account.provider === 'google_drive')
  const activeS3 = connected.filter((account) => account.provider === 's3')
  const headingClass = 'flex items-center gap-1.5 text-xs font-bold text-fg-muted'

  return (
    <div data-state={state} className={cn('absolute right-0 top-12 z-50 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-pop', popoverMotion)}>
      <div className="border-b border-line bg-surface-sunken px-4 py-3">
        <p className="text-sm font-extrabold text-fg">Workspace Status & Info</p>
        <p className="text-xs text-fg-muted">Overview of your connections & guidelines</p>
      </div>
      <div className="max-h-96 space-y-4 overflow-y-auto p-4">
        <div>
          <h4 className={headingClass}><ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Connection Status</h4>
          <div className="mt-2 space-y-2">
            <ConnectionRow label="Google Drive accounts" count={activeGoogle.length} />
            {activeGoogle.map((account) => (
              <p key={account.id} className="truncate px-2.5 text-[11px] text-fg-muted">{account.email}</p>
            ))}
            <ConnectionRow label="S3 buckets" count={activeS3.length} />
          </div>
        </div>

        <div>
          <h4 className={headingClass}><HardDrive className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Storage Engine</h4>
          <div className="mt-2 space-y-1 rounded-xl border border-line bg-surface-sunken p-2.5 text-xs text-fg-muted">
            <p><b className="font-semibold text-fg">Database:</b> MySQL</p>
            <p><b className="font-semibold text-fg">Upload folder:</b> Google Drive <code>9drive</code></p>
            <p><b className="font-semibold text-fg">Max upload size:</b> 5 GB per stream</p>
          </div>
        </div>

        <div>
          <h4 className={headingClass}><Info className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Usage Tips</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 pl-1 text-[11px] text-fg-muted">
            <li>Folders are mirrored to your first connected Google Drive.</li>
            <li>Files upload straight to your connected storage.</li>
            <li>Use the Sync button to fetch changes made directly on Drive.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate, user, storage, breakdown, onLogout }: { onNavigate?: () => void; user: AuthUser | null; storage: StorageSummary | null; breakdown: StorageBreakdown; onLogout: () => void }) {
  const { pathname } = useLocation()
  const used = Number(storage?.usedBytes ?? 0)
  const total = Number(storage?.totalBytes ?? 0)
  const progress = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const activeIndex = menu.findIndex((item) => !item.disabled && pathname.startsWith(item.href))
  const items = [
    ['Photo', formatBytes(breakdown.photo), fileKinds.image.dot],
    ['Video', formatBytes(breakdown.video), fileKinds.video.dot],
    ['Document', formatBytes(breakdown.document), fileKinds.doc.dot],
    ['Free Storage', formatBytes(storage?.availableBytes), 'bg-fg-subtle'],
  ]

  useEffect(() => {
    setAvatarError(false)
    getGravatarUrl(user?.email, 64).then(setProfileImageUrl).catch(() => setProfileImageUrl(''))
  }, [user?.email])

  return (
    <aside className="flex h-full w-64 flex-col overflow-y-auto border-line bg-sidebar p-4 backdrop-blur-xl lg:border-r">
      <div className="flex items-center gap-2.5 pb-3 pt-1">
        <BrandLogo className="h-8 w-8" />
        <span className="text-xl font-extrabold tracking-tight text-fg">9Drive</span>
      </div>

      <div className="my-3 flex items-center gap-2.5 border-y border-line py-3">
        {!profileImageUrl || avatarError ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-xs font-bold text-white shadow-sm">
            {(user?.name ?? user?.email ?? 'U').trim().charAt(0).toUpperCase()}
          </div>
        ) : (
          <img
            src={profileImageUrl}
            alt=""
            className="h-8 w-8 shrink-0 animate-fade-in rounded-full border border-line object-cover"
            onError={() => setAvatarError(true)}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-none text-fg">{user?.name ?? 'User'}</p>
          <p className="mt-1 truncate text-xs text-fg-muted">{user?.email ?? 'Loading...'}</p>
        </div>
      </div>

      <nav aria-label="Main" className="relative grid gap-1">
        {activeIndex >= 0 ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-10 rounded-xl border border-accent-line bg-accent-soft transition-transform duration-300 ease-soft"
            style={{ transform: `translateY(${activeIndex * navRowStepRem}rem)` }}
          />
        ) : null}
        {menu.map((item) => item.disabled ? (
          <button key={item.label} type="button" disabled title="Coming soon" className="relative inline-flex h-10 cursor-not-allowed items-center gap-2.5 rounded-xl px-3.5 text-[13px] font-bold text-fg-subtle opacity-60">
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </button>
        ) : (
          <NavLink key={item.label} to={item.href} onClick={onNavigate} className={({ isActive }) => cn('group relative inline-flex h-10 items-center gap-2.5 rounded-xl px-3.5 text-[13px] font-bold transition-colors duration-150', isActive ? 'text-accent' : 'text-fg-muted hover:bg-surface-hover hover:text-fg')}>
            <item.icon className="h-4 w-4 transition-transform duration-200 ease-soft group-hover:scale-110" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-line pt-4 text-[13px]">
        <div className="mb-3 space-y-1.5">
          {items.map(([label, value, color]) => (
            <div key={label} className="flex items-center justify-between font-medium text-fg-muted">
              <span className="flex items-center gap-1.5"><span className={cn('h-1.5 w-1.5 rounded-full', color)} />{label}</span>
              <span className="font-semibold tabular-nums text-fg">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-bold text-fg">
          <span className="tabular-nums">{formatBytes(storage?.usedBytes)} used</span>
          <span className="tabular-nums text-fg-subtle">{formatBytes(storage?.totalBytes)}</span>
        </div>
        <Progress value={progress} label="Storage used" className="my-2 h-1.5" />
        <Button variant="ghost" size="sm" className="mt-3 h-10 w-full justify-start px-3 text-[13px] font-bold text-danger hover:bg-danger-soft hover:text-danger" onClick={onLogout}>
          <LogOut className="h-4 w-4" />Log Out
        </Button>
      </div>
    </aside>
  )
}

function uploadTone(status: UploadProgressStatus): ProgressTone {
  if (status === 'done') return 'success'
  return status === 'error' || status === 'partial' ? 'danger' : 'accent'
}

function UploadProgressPanel() {
  const { uploadProgress, setUploadProgress, retryFailedUpload } = useUpload()
  const [collapsed, setCollapsed] = useState(false)
  const { mounted, state } = usePresence(uploadProgress.open, 180)
  const progress = useLatestWhile(uploadProgress, uploadProgress.open)

  if (!mounted) return null

  const failed = progress.status === 'partial' || progress.status === 'error'
  const title = progress.status === 'done' ? 'Upload complete' : progress.status === 'partial' ? 'Upload completed with errors' : progress.status === 'error' ? 'Upload failed' : progress.percent >= 99 ? 'Processing on server' : 'Uploading files'

  return (
    <div data-state={state} className="fixed inset-x-3 bottom-3 z-[70] max-h-[70dvh] overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-pop data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(420px,calc(100vw-2.5rem))]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-fg">
          {progress.status === 'done' ? <CheckCircle key="done" className="h-5 w-5 animate-tick text-success" aria-hidden="true" /> : failed ? <X key="failed" className="h-5 w-5 animate-tick text-danger" aria-hidden="true" /> : <Upload key="uploading" className="h-5 w-5 text-accent" aria-hidden="true" />}
          {title}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={collapsed ? 'Expand upload progress' : 'Collapse upload progress'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><ChevronDown className={cn('h-4 w-4 transition-transform duration-200 ease-soft', collapsed && 'rotate-180')} /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close upload progress" onClick={() => setUploadProgress((current) => ({ ...current, open: false }))}><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-soft', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="truncate font-semibold text-fg">{progress.fileName}</p>
              <span className="tabular-nums text-fg-muted">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} tone={uploadTone(progress.status)} label="Overall upload progress" className="mt-3" />
            {progress.files.length > 0 ? (
              <div className="mt-4 grid max-h-64 gap-3 overflow-y-auto pr-1">
                {progress.files.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="grid gap-1 rounded-xl bg-surface-sunken p-3">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <p className="min-w-0 flex-1 truncate font-semibold text-fg" title={file.name}>{file.name}</p>
                      <span className="shrink-0 text-xs tabular-nums text-fg-muted">{file.percent}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-fg-muted">
                      <span className="tabular-nums">{formatBytes(file.size)}</span>
                      <div className="flex items-center gap-2">
                        {file.status === 'error' ? (
                          <Button size="sm" className="h-6 rounded-lg px-2 text-[11px] font-extrabold shadow-none hover:shadow-none" onClick={() => retryFailedUpload(file.name)}>
                            Retry
                          </Button>
                        ) : null}
                        <span className={cn('font-semibold', file.status === 'error' ? 'text-danger' : file.status === 'done' ? 'text-success' : 'text-accent')}>
                          {file.status === 'error' ? 'Failed' : file.status === 'done' ? 'Done' : file.percent >= 99 ? 'Processing' : 'Uploading'}
                        </span>
                      </div>
                    </div>
                    <Progress value={file.percent} tone={uploadTone(file.status)} label={`${file.name} upload progress`} className="h-1.5" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

type ConnectedAccount = {
  id: string
  email: string
  provider: string
}

export type DriveLayoutContext = {
  setHeaderActions: (actions: ReactNode) => void
}

export function useDriveLayoutActions() {
  return useOutletContext<DriveLayoutContext>()
}

export function DriveLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')
  const [user, setUser] = useState<AuthUser | null>(getStoredUser())
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [breakdown, setBreakdown] = useState<StorageBreakdown>({ photo: '0', video: '0', document: '0' })
  const [infoOpen, setInfoOpen] = useState(false)
  const [headerActions, setHeaderActions] = useState<ReactNode>(null)
  const scrollAreaRef = useRef<HTMLElement>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Advanced search states
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterKind, setFilterKind] = useState(searchParams.get('kind') ?? '')
  const [filterAccountId, setFilterAccountId] = useState(searchParams.get('accountId') ?? '')
  const [filterMinSize, setFilterMinSize] = useState(() => {
    const min = searchParams.get('minSize')
    return min ? String(Math.round(Number(min) / (1024 * 1024))) : ''
  })
  const [filterMaxSize, setFilterMaxSize] = useState(() => {
    const max = searchParams.get('maxSize')
    return max ? String(Math.round(Number(max) / (1024 * 1024))) : ''
  })
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const raw = searchParams.get('startDate')
    return raw ? raw.split('T')[0] : ''
  })
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const raw = searchParams.get('endDate')
    return raw ? raw.split('T')[0] : ''
  })

  const infoPresence = usePresence(infoOpen, 120)
  const filtersPresence = usePresence(filtersOpen, 120)
  const hasActiveFilters = ['kind', 'accountId', 'minSize', 'maxSize', 'startDate', 'endDate'].some((key) => searchParams.has(key))

  useDismiss(infoRef, infoOpen, () => setInfoOpen(false))
  useDismiss(searchRef, filtersOpen, () => setFiltersOpen(false))

  async function loadSidebarStats() {
    await Promise.all([
      apiFetch<StorageSummary>('/storage/summary').then(setStorage),
      apiFetch<StorageBreakdown>('/storage/breakdown').then(setBreakdown),
    ])
  }

  async function loadConnectedAccounts() {
    try {
      const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
      setAccounts(data.accounts)
    } catch (e) {
      console.error('Failed to load accounts for filter dropdown', e)
    }
  }

  useEffect(() => {
    setSearchValue(searchParams.get('q') ?? '')
    setFilterKind(searchParams.get('kind') ?? '')
    setFilterAccountId(searchParams.get('accountId') ?? '')
    setFilterMinSize(() => {
      const min = searchParams.get('minSize')
      return min ? String(Math.round(Number(min) / (1024 * 1024))) : ''
    })
    setFilterMaxSize(() => {
      const max = searchParams.get('maxSize')
      return max ? String(Math.round(Number(max) / (1024 * 1024))) : ''
    })

    const rawStart = searchParams.get('startDate')
    setFilterStartDate(rawStart ? rawStart.split('T')[0] : '')

    const rawEnd = searchParams.get('endDate')
    setFilterEndDate(rawEnd ? rawEnd.split('T')[0] : '')
  }, [searchParams])

  // Pages share one scroll area, so a new route must not inherit the old scroll position.
  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearAuthSession()
    navigate('/login')
  }

  function applyFilters() {
    const nextParams = new URLSearchParams()
    const activeFolderId = searchParams.get('folderId')
    if (activeFolderId && location.pathname === '/all-files') {
      nextParams.set('folderId', activeFolderId)
    }

    const q = searchValue.trim()
    if (q) nextParams.set('q', q)

    if (filterKind) nextParams.set('kind', filterKind)
    if (filterAccountId) nextParams.set('accountId', filterAccountId)

    if (filterMinSize) {
      const bytes = Number(filterMinSize) * 1024 * 1024
      if (!isNaN(bytes)) nextParams.set('minSize', String(bytes))
    }
    if (filterMaxSize) {
      const bytes = Number(filterMaxSize) * 1024 * 1024
      if (!isNaN(bytes)) nextParams.set('maxSize', String(bytes))
    }

    if (filterStartDate) {
      nextParams.set('startDate', new Date(filterStartDate).toISOString())
    }
    if (filterEndDate) {
      // Include the whole end day, not just its first instant.
      nextParams.set('endDate', new Date(`${filterEndDate}T23:59:59.999Z`).toISOString())
    }

    setFiltersOpen(false)
    navigate({ pathname: '/all-files', search: nextParams.toString() })
  }

  function clearFilters() {
    setFilterKind('')
    setFilterAccountId('')
    setFilterMinSize('')
    setFilterMaxSize('')
    setFilterStartDate('')
    setFilterEndDate('')
    setFiltersOpen(false)

    const nextParams = new URLSearchParams()
    const activeFolderId = searchParams.get('folderId')
    if (activeFolderId && location.pathname === '/all-files') {
      nextParams.set('folderId', activeFolderId)
    }
    const q = searchValue.trim()
    if (q) nextParams.set('q', q)

    navigate({ pathname: '/all-files', search: nextParams.toString() })
  }

  function searchFiles(event: FormEvent) {
    event.preventDefault()
    applyFilters()
  }

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((data) => {
        setUser(data.user)
        updateStoredUser(data.user)
      })
      .catch(() => undefined)
    loadSidebarStats().catch(() => undefined)
    loadConnectedAccounts().catch(() => undefined)
    window.addEventListener('9drive:storage-changed', loadSidebarStats)
    return () => window.removeEventListener('9drive:storage-changed', loadSidebarStats)
  }, [])

  const filterFieldClass = 'text-xs font-bold text-fg-muted'
  const filterControlClass = 'h-10 text-sm font-normal'

  return (
    <main className="min-h-screen w-full overflow-x-hidden">
      <div className="flex min-h-screen w-full flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
        <div className="hidden lg:block lg:h-screen lg:shrink-0">
          <Sidebar user={user} storage={storage} breakdown={breakdown} onLogout={logout} />
        </div>
        <div className={cn('fixed inset-0 z-40 bg-scrim transition-opacity duration-200 lg:hidden', sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setSidebarOpen(false)} />
        <div inert={!sidebarOpen} className={cn('fixed inset-y-0 left-0 z-50 transform bg-surface-raised shadow-pop transition-transform duration-300 ease-soft lg:hidden', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
          <div className="absolute right-3 top-3 z-10">
            <Button variant="ghost" size="icon-sm" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Sidebar user={user} storage={storage} breakdown={breakdown} onLogout={logout} onNavigate={() => setSidebarOpen(false)} />
        </div>
        <section ref={scrollAreaRef} className="min-w-0 flex-1 p-4 sm:p-6 lg:h-screen lg:overflow-y-auto lg:p-8">
          <header className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <Button variant="outline" size="icon" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex min-w-0 items-center gap-2">
                <BrandLogo className="h-9 w-9 shrink-0" />
                <span className="truncate text-xl font-extrabold tracking-tight text-fg">9Drive</span>
              </div>
            </div>

            <div ref={searchRef} className="relative order-last w-full min-w-0 lg:order-none lg:w-auto lg:max-w-sm lg:flex-1 xl:max-w-xl">
              <form role="search" onSubmit={searchFiles} className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <Input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Search Documents" aria-label="Search files" className="pl-11 pr-12" />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFiltersOpen(!filtersOpen)} className={cn('absolute right-1 top-1/2 -translate-y-1/2', (filtersOpen || hasActiveFilters) && 'text-accent hover:text-accent')} aria-label="Search filters" aria-expanded={filtersOpen}>
                  <SlidersHorizontal className="h-5 w-5" />
                  {hasActiveFilters ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent-solid" /> : null}
                </Button>
              </form>

              {filtersPresence.mounted ? (
                <div data-state={filtersPresence.state} className={cn('absolute left-0 top-12 z-50 w-full rounded-2xl border border-line bg-surface-raised p-5 shadow-pop lg:w-[max(100%,26rem)]', popoverMotion)}>
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <span className="text-sm font-extrabold text-fg">Advanced Search Filters</span>
                    <button type="button" onClick={clearFilters} className="text-xs font-bold text-accent transition-opacity duration-150 hover:opacity-80">Clear All</button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="File Type" className={filterFieldClass}>
                      <Select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} className={filterControlClass}>
                        <option value="">All Types</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="doc">Document</option>
                        <option value="archive">Archive</option>
                      </Select>
                    </Field>

                    <Field label="Connected Account" className={filterFieldClass}>
                      <Select value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)} className={filterControlClass}>
                        <option value="">All Accounts</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>{acc.email} ({acc.provider})</option>
                        ))}
                      </Select>
                    </Field>

                    <div className="grid gap-1.5 sm:col-span-2">
                      <span className={filterFieldClass}>Size Range (MB)</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} placeholder="Min" aria-label="Minimum size in MB" value={filterMinSize} onChange={(e) => setFilterMinSize(e.target.value)} className={filterControlClass} />
                        <span className="text-xs font-semibold text-fg-subtle">to</span>
                        <Input type="number" min={0} placeholder="Max" aria-label="Maximum size in MB" value={filterMaxSize} onChange={(e) => setFilterMaxSize(e.target.value)} className={filterControlClass} />
                      </div>
                    </div>

                    <div className="grid gap-1.5 sm:col-span-2">
                      <span className={filterFieldClass}>Date Range</span>
                      <div className="flex items-center gap-2">
                        <Input type="date" aria-label="Start date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={cn(filterControlClass, 'px-2.5')} />
                        <span className="text-xs font-semibold text-fg-subtle">to</span>
                        <Input type="date" aria-label="End date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className={cn(filterControlClass, 'px-2.5')} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
                    <Button variant="outline" size="sm" type="button" onClick={() => setFiltersOpen(false)}>Cancel</Button>
                    <Button variant="default" size="sm" type="button" onClick={applyFilters}>Apply Filters</Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Header actions injected by child pages */}
              {headerActions ? <div className="hidden items-center gap-2 xl:flex">{headerActions}</div> : null}
              <ThemeToggle />
              <div ref={infoRef} className="relative">
                <Button variant="outline" size="icon" className="relative" aria-label="System info" aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)}>
                  <Bell className="h-5 w-5" />
                  <span className={cn('absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-solid transition-[opacity,transform] duration-200 ease-soft', infoOpen && 'scale-0 opacity-0')} />
                </Button>
                {infoPresence.mounted ? <SystemInfoDropdown storage={storage} state={infoPresence.state} /> : null}
              </div>
            </div>
          </header>
          <div key={location.pathname} className="animate-page-in">
            <Outlet context={{ setHeaderActions } satisfies DriveLayoutContext} />
          </div>
        </section>
      </div>

      <UploadProgressPanel />
    </main>
  )
}
