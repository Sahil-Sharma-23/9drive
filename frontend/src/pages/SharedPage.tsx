import { useEffect, useState } from 'react'
import { Clock, FileArchive, Folder, Inbox, Send, Trash2, Users, UserCheck } from 'lucide-react'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, LoadFailedState } from '@/components/ui/empty-state'
import { IconTile } from '@/components/ui/icon-tile'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, formatBytes, formatDate } from '@/lib/api'

type InviteTarget = { id: string; name: string; type: 'file' | 'folder'; mimeType?: string; sizeBytes?: string }
type Invite = {
  id: string
  email: string
  role: string
  status: string
  targetType: 'file' | 'folder'
  targetId: string
  target: InviteTarget | null
  createdAt: string
  acceptedAt: string | null
  user: { id: string; name: string; email: string } | null
}

function ResourceIcon({ type }: { type: 'file' | 'folder' }) {
  return <IconTile icon={type === 'folder' ? Folder : FileArchive} size="sm" />
}

function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'accepted' ? 'success' : 'warning'}>{status}</Badge>
}

export function SharedPage() {
  const [sentInvites, setSentInvites] = useState<Invite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [message, setMessage] = useState('')
  const pendingCount = sentInvites.filter((invite) => invite.status === 'pending').length
  const acceptedCount = sentInvites.filter((invite) => invite.status === 'accepted').length

  async function loadInvites() {
    const data = await apiFetch<{ sent: Invite[]; received: Invite[] }>('/invites')
    setSentInvites(data.sent)
    setReceivedInvites(data.received)
    setLoaded(true)
  }

  useEffect(() => {
    loadInvites().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Failed to load shared resources')
      setLoadFailed(true)
      setLoaded(true)
    })
    window.addEventListener('9drive:invites-changed', loadInvites)
    return () => window.removeEventListener('9drive:invites-changed', loadInvites)
  }, [])

  async function revokeInvite(id: string) {
    setMessage('')
    try {
      await apiFetch(`/invites/${id}`, { method: 'DELETE' })
      await loadInvites()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to revoke this invite')
    }
  }

  return (
    <>
      <PageHeader title="Shared" description="Files and folders shared with members or shared with you." />
      {message ? <Alert tone="danger" className="mt-5">{message}</Alert> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Shared Resources" value={String(sentInvites.length + receivedInvites.length)} icon={Users} loading={!loaded} />
        <MetricCard label="Accepted Members" value={String(acceptedCount)} icon={UserCheck} tone="success" loading={!loaded} />
        <MetricCard label="Pending Invites" value={String(pendingCount)} icon={Clock} tone="warning" loading={!loaded} />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-base font-extrabold tracking-tight text-fg">Shared With You</h2>
        <div className="mt-4 grid gap-3">
          {!loaded ? <Skeleton className="h-16 rounded-xl" /> : loadFailed ? <LoadFailedState className="py-6" /> : receivedInvites.length === 0 ? <EmptyState icon={Inbox} title="Nothing shared with you yet" description="Files and folders that others share with you will appear here." className="py-6" /> : receivedInvites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-3 rounded-xl bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <ResourceIcon type={invite.targetType} />
                <div className="min-w-0"><p className="truncate font-semibold text-fg">{invite.target?.name ?? 'Unavailable resource'}</p><p className="text-sm capitalize tabular-nums text-fg-muted">{invite.targetType} • {invite.role}{invite.target?.sizeBytes ? ` • ${formatBytes(invite.target.sizeBytes)}` : ''}</p></div>
              </div>
              <StatusBadge status={invite.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-base font-extrabold tracking-tight text-fg">Resources You Shared</h2>
        <div className="mt-4 grid gap-3">
          {!loaded ? <Skeleton className="h-16 rounded-xl" /> : loadFailed ? <LoadFailedState className="py-6" /> : sentInvites.length === 0 ? <EmptyState icon={Send} title="Nothing shared yet" description="Right-click a file or folder in All Files and choose Invite Member." className="py-6" /> : sentInvites.map((invite) => (
            <div key={invite.id} className="flex flex-col gap-3 rounded-xl bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <ResourceIcon type={invite.targetType} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{invite.target?.name ?? 'Unavailable resource'}</p>
                  <p className="break-all text-sm text-fg-muted">Shared with {invite.email}</p>
                  <p className="mt-1 text-xs text-fg-muted">Invited {formatDate(invite.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge>{invite.role}</Badge>
                <StatusBadge status={invite.status} />
                <Button variant="danger" size="sm" onClick={() => revokeInvite(invite.id)}><Trash2 className="h-4 w-4" />Revoke</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
