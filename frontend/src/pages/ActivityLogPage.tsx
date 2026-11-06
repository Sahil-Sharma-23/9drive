import { useEffect, useState } from 'react'
import {
  History,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Folder,
  FileText,
  Download,
  Move,
  type LucideIcon
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState, LoadFailedState } from '@/components/ui/empty-state'
import { IconTile, type IconTileTone } from '@/components/ui/icon-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes, formatDate } from '@/lib/api'

type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: string | Record<string, unknown> | null
  createdAt: string
}

function actionStyle(action: string): { tone: IconTileTone; icon: LucideIcon } {
  const act = action.toUpperCase()
  if (act.includes('CREATE') || act.includes('UPLOAD')) return { tone: 'success', icon: Plus }
  if (act.includes('DELETE') || act.includes('PERMANENT') || act.includes('TRASH')) return { tone: 'danger', icon: Trash2 }
  if (act.includes('RESTORE') || act.includes('SYNC')) return { tone: 'warning', icon: RefreshCw }
  if (act.includes('MOVE')) return { tone: 'accent', icon: Move }
  if (act.includes('DOWNLOAD')) return { tone: 'accent', icon: Download }
  return { tone: 'neutral', icon: History }
}

function actionLabel(action: string) {
  const words = action.replace(/_/g, ' ').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function metadataSummary(metadata: AuditLog['metadata']) {
  if (!metadata) return null
  let parsed: unknown = metadata
  if (typeof metadata === 'string') {
    try {
      parsed = JSON.parse(metadata)
    } catch {
      return metadata
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return String(parsed)

  const details = parsed as Record<string, unknown>
  const parts: string[] = []
  if (details.name) parts.push(`Name: ${details.name}`)
  if (details.fileName) parts.push(`File: ${details.fileName}`)
  if (details.folderName) parts.push(`Folder: ${details.folderName}`)
  if (details.count !== undefined) parts.push(`Count: ${details.count}`)
  const size = details.sizeBytes ?? details.size
  if (size !== undefined) parts.push(`Size: ${formatBytes(Number(size))}`)
  return parts.length > 0 ? parts.join(' | ') : JSON.stringify(details)
}

export function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ logs: AuditLog[] }>('/audit-logs')
      setLogs(data.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs().catch(() => undefined)
  }, [])

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="View audit trails and file activities in your 9Drive workspace."
      />

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-5 py-4">
          <History className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          <h2 className="text-base font-extrabold tracking-tight text-fg">Recent Activity Trail</h2>
        </div>

        <div className="divide-y divide-line">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
              </div>
            ))
          ) : error ? (
            <LoadFailedState className="py-14" />
          ) : logs.length === 0 ? (
            <EmptyState icon={History} title="No activity yet" description="Actions you perform on your folders and files will appear here." className="py-14" />
          ) : (
            logs.map((log) => {
              const { tone, icon } = actionStyle(log.action)
              const EntityIcon = log.entityType === 'folder' ? Folder : FileText
              const summary = metadataSummary(log.metadata)

              return (
                <div key={log.id} className="flex flex-col justify-between gap-3 p-5 transition-colors duration-150 hover:bg-surface-hover sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <IconTile icon={icon} tone={tone} size="sm" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="normal-case">{actionLabel(log.action)}</Badge>
                        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                          <EntityIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {log.entityType}
                        </span>
                      </div>
                      {summary ? <p className="mt-2 break-words text-xs font-medium text-fg-muted">{summary}</p> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end text-xs text-fg-muted sm:self-center">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </>
  )
}
