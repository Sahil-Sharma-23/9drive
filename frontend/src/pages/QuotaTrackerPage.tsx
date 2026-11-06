import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle, Cloud, Database, Filter, Gauge, HardDrive, Link2, RefreshCw, Users, Wallet } from 'lucide-react'
import { Alert, type AlertTone } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, LoadFailedState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { IconTile } from '@/components/ui/icon-tile'
import { Progress, type ProgressTone } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes } from '@/lib/api'
import { openGoogleConnectPopup } from '@/lib/google-connect'
import { cn } from '@/lib/utils'

type StorageSummary = { totalBytes: string; usedBytes: string; availableBytes: string }
type ConnectedAccount = { id: string; email: string; displayName?: string | null; provider: string; status: string; storageAccount?: { totalBytes: string | null; usedBytes: string; availableBytes: string | null; lastSyncedAt: string | null } | null }
type RoutingMode = 'most_available' | 'round_robin' | 'priority'
type RoutingPolicy = { mode: RoutingMode; priorityAccountIds: string[]; roundRobinCursor: number }

function providerLabel(provider: string) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function providerIcon(provider: string) {
  return provider === 's3' ? Database : Cloud
}

function storageLimitLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.totalBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.totalBytes)
}

function availableLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.availableBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.availableBytes)
}

function pct(account: ConnectedAccount) {
  const total = Number(account.storageAccount?.totalBytes ?? 0)
  const used = Number(account.storageAccount?.usedBytes ?? 0)
  return total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
}

function usageTone(percent: number): ProgressTone {
  if (percent >= 80) return 'danger'
  if (percent >= 50) return 'warning'
  return 'success'
}

const usageDots: Record<ProgressTone, string> = {
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
}

export function QuotaTrackerPage() {
  const [summary, setSummary] = useState<StorageSummary | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [routingPolicy, setRoutingPolicy] = useState<RoutingPolicy>({ mode: 'most_available', priorityAccountIds: [], roundRobinCursor: 0 })
  const [notice, setNotice] = useState<{ text: string; tone: AlertTone } | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  function showError(error: unknown, fallback: string) {
    setNotice({ text: error instanceof Error ? error.message : fallback, tone: 'danger' })
  }

  async function load() {
    const [summaryData, accountData, policyData] = await Promise.all([
      apiFetch<StorageSummary>('/storage/summary'),
      apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts'),
      apiFetch<{ policy: RoutingPolicy }>('/storage/routing-policy'),
    ])
    setSummary(summaryData)
    setAccounts(accountData.accounts)
    setRoutingPolicy(policyData.policy)
  }

  async function refresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (error) {
      showError(error, 'Failed to refresh quota tracker')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
      .catch((error) => {
        showError(error, 'Failed to load quota tracker')
        setLoadFailed(true)
      })
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = window.setInterval(() => load().catch(() => undefined), 35_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== 'GOOGLE_CONNECTED') return
      const ok = event.data.status === 'success'
      setNotice({ text: ok ? 'Google Drive connected.' : 'Google Drive connection failed.', tone: ok ? 'success' : 'danger' })
      load().catch(() => undefined)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function connectDrive() {
    const popup = openGoogleConnectPopup()
    try {
      const data = await apiFetch<{ url: string }>('/connected-accounts/google/connect-url')
      if (popup) {
        popup.location.href = data.url
      } else {
        window.location.href = data.url
      }
    } catch (error) {
      if (popup) popup.close()
      showError(error, 'Failed to start Google Drive connection')
    }
  }

  async function sync(accountId: string) {
    setSyncingAccountId(accountId)
    try {
      await apiFetch(`/connected-accounts/${accountId}/sync-quota`, { method: 'POST' })
      await load()
    } catch (error) {
      showError(error, 'Failed to sync this account')
    } finally {
      setSyncingAccountId(null)
    }
  }

  async function saveRoutingPolicy(nextPolicy: RoutingPolicy) {
    setRoutingPolicy(nextPolicy)
    const data = await apiFetch<{ policy: RoutingPolicy }>('/storage/routing-policy', { method: 'PATCH', body: JSON.stringify({ mode: nextPolicy.mode, priorityAccountIds: nextPolicy.priorityAccountIds }) })
    setRoutingPolicy(data.policy)
    setNotice({ text: 'Upload routing policy updated.', tone: 'success' })
  }

  function orderedAccounts() {
    const byId = new Map(accounts.map((account) => [account.id, account]))
    const ordered = routingPolicy.priorityAccountIds.map((id) => byId.get(id)).filter((account): account is ConnectedAccount => Boolean(account))
    const orderedIds = new Set(ordered.map((account) => account.id))
    return [...ordered, ...accounts.filter((account) => !orderedIds.has(account.id))]
  }

  function moveAccount(accountId: string, direction: -1 | 1) {
    const ids = orderedAccounts().map((account) => account.id)
    const index = ids.indexOf(accountId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    const nextIds = [...ids]
    const [item] = nextIds.splice(index, 1)
    nextIds.splice(target, 0, item)
    saveRoutingPolicy({ ...routingPolicy, priorityAccountIds: nextIds }).catch((error) => showError(error, 'Failed to update routing policy'))
  }

  return (
    <>
      <PageHeader title="Quota Tracker" description="Track and manage connected provider storage limits." actions={<><Button variant="outline" aria-pressed={autoRefresh} onClick={() => setAutoRefresh(!autoRefresh)}><CheckCircle className={cn('h-4 w-4 transition-colors duration-150', autoRefresh && 'text-success')} />Auto-refresh {autoRefresh ? 'On' : 'Off'}</Button><Button variant="outline" onClick={refresh} disabled={refreshing}><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{refreshing ? 'Refreshing...' : 'Refresh'}</Button><Button onClick={connectDrive}><Link2 className="h-4 w-4" />Connect Drive</Button></>} />
      {notice ? <Alert tone={notice.tone} className="mt-5">{notice.text}</Alert> : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <MetricCard label="Total Storage" value={formatBytes(summary?.totalBytes)} icon={HardDrive} loading={!loaded} />
        <MetricCard label="Used Storage" value={formatBytes(summary?.usedBytes)} icon={Database} tone="warning" loading={!loaded} />
        <MetricCard label="Available" value={formatBytes(summary?.availableBytes)} icon={Wallet} tone="success" loading={!loaded} />
        <MetricCard label="Accounts" value={String(accounts.length)} icon={Users} tone="neutral" loading={!loaded} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled title="Coming soon"><Filter className="h-4 w-4" />All Providers</Button>
        <Button variant="outline" size="sm" disabled title="Coming soon">All Accounts</Button>
        <Button variant="soft" size="sm" disabled title="Coming soon"><Gauge className="h-4 w-4" />Most available</Button>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-fg">Upload Routing</h2>
            <p className="mt-1 text-sm text-fg-muted">Choose how new uploads pick connected storage accounts.</p>
          </div>
          <Field label="Routing mode" className="lg:w-64">
            <Select value={routingPolicy.mode} onChange={(event) => saveRoutingPolicy({ ...routingPolicy, mode: event.target.value as RoutingMode }).catch((error) => showError(error, 'Failed to update routing policy'))}>
              <option value="most_available">Most available</option>
              <option value="round_robin">Round robin</option>
              <option value="priority">Priority order</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 grid gap-3">
          {!loaded ? <Skeleton className="h-16 rounded-xl" /> : null}
          {orderedAccounts().map((account, index) => {
            const name = account.displayName || account.email
            return (
              <div key={account.id} className="flex flex-col gap-3 rounded-xl bg-surface-sunken p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <IconTile icon={providerIcon(account.provider)} size="sm" className="h-10 w-10" />
                  <div className="min-w-0"><p className="truncate font-semibold text-fg">{name}</p><p className="text-sm tabular-nums text-fg-muted">{providerLabel(account.provider)} · {formatBytes(account.storageAccount?.usedBytes)} used · {availableLabel(account)} free</p></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon-sm" aria-label={`Move ${name} up`} onClick={() => moveAccount(account.id, -1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon-sm" aria-label={`Move ${name} down`} onClick={() => moveAccount(account.id, 1)} disabled={index === accounts.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                </div>
              </div>
            )
          })}
          {loaded && !loadFailed && accounts.length === 0 ? <p className="text-sm text-fg-muted">Connect storage accounts to configure routing.</p> : null}
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {loadFailed ? (
          <Card className="col-span-full"><LoadFailedState /></Card>
        ) : loaded && accounts.length === 0 ? (
          <Card className="col-span-full">
            <EmptyState icon={Cloud} title="No connected drives" description="Connect Google Drive or S3-compatible storage to start tracking quota." action={<Button onClick={connectDrive}><Link2 className="h-4 w-4" />Connect Drive</Button>} />
          </Card>
        ) : accounts.map((account) => {
          const percent = pct(account)
          const tone = usageTone(percent)
          return (
            <Card key={account.id} className="overflow-hidden p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <IconTile icon={providerIcon(account.provider)} />
                  <div className="min-w-0"><h2 className="font-extrabold text-fg">{providerLabel(account.provider)}</h2><p className="truncate text-sm text-fg-muted">{account.email}</p></div>
                </div>
                <Button variant="outline" size="icon-sm" aria-label={`Sync ${account.email}`} onClick={() => sync(account.id)} disabled={syncingAccountId === account.id}><RefreshCw className={syncingAccountId === account.id ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></Button>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-fg"><span className={cn('h-2.5 w-2.5 rounded-full', usageDots[tone])} />Storage</span>
                  <span className="font-bold tabular-nums text-fg">{percent}%</span>
                </div>
                <Progress value={percent} tone={tone} label={`${account.email} storage used`} />
                <div className="mt-3 flex items-center justify-between gap-3 text-sm tabular-nums text-fg-muted"><span>{formatBytes(account.storageAccount?.usedBytes)} / {storageLimitLabel(account)}</span><span>Available {availableLabel(account)}</span></div>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
