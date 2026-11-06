import { useEffect, useState, useRef, type FormEvent } from 'react'
import { Bell, Cloud, Database, Globe, HardDrive, Link2, RefreshCw, Trash2 } from 'lucide-react'
import { Alert, type AlertTone } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DummyModal } from '@/components/drive/DummyModal'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes, API_URL } from '@/lib/api'
import { openGoogleConnectPopup } from '@/lib/google-connect'
import { getGravatarUrl } from '@/lib/gravatar'
import { getStoredUser, getAccessToken, clearAuthSession } from '@/lib/auth'

type ConnectedAccount = { id: string; provider: string; email: string; displayName?: string | null; status: string; storageAccount?: { totalBytes: string | null; usedBytes: string; availableBytes: string | null; lastSyncedAt: string | null } | null }

function providerLabel(provider: string) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function storageLimitLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.totalBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.totalBytes)
}

function availableLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.availableBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.availableBytes)
}

function SectionHeading({ icon: Icon, children }: { icon: typeof Cloud; children: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
      <h2 className="text-base font-extrabold tracking-tight text-fg">{children}</h2>
    </div>
  )
}

function StorageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-2">
      <p className="font-extrabold tabular-nums text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] text-fg-muted">{label}</p>
    </div>
  )
}

function InfoCard({ icon, title, children }: { icon: typeof Cloud; title: string; children: string }) {
  return (
    <Card className="p-4">
      <IconTile icon={icon} size="sm" />
      <h2 className="mt-2 text-sm font-bold text-fg">{title}</h2>
      <p className="mt-1 text-xs text-fg-muted">{children}</p>
    </Card>
  )
}

export function SettingsPage() {
  const user = getStoredUser()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [accountsFailed, setAccountsFailed] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: AlertTone } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [s3Open, setS3Open] = useState(false)
  const [connectingS3, setConnectingS3] = useState(false)
  const [s3Error, setS3Error] = useState('')
  const [s3Form, setS3Form] = useState({ name: '', bucket: '', region: 'us-east-1', endpoint: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false, quotaBytes: '' })
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null)
  const [accountToDisconnect, setAccountToDisconnect] = useState<ConnectedAccount | null>(null)
  const [disconnectError, setDisconnectError] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [updatingSystem, setUpdatingSystem] = useState(false)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [updateModalTitle, setUpdateModalTitle] = useState('')
  const [confirmCloseUpdate, setConfirmCloseUpdate] = useState(false)

  // Google OAuth Config states
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleRedirectUri, setGoogleRedirectUri] = useState('')
  const [defaultRedirectUri, setDefaultRedirectUri] = useState('')
  const [hasSecret, setHasSecret] = useState(false)
  const [savingGoogleConfig, setSavingGoogleConfig] = useState(false)
  const [showGoogleHelp, setShowGoogleHelp] = useState(false)

  // Live log polling states
  const [isPollingLog, setIsPollingLog] = useState(false)
  const [updateLog, setUpdateLog] = useState('')
  const [updateFinished, setUpdateFinished] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null)
  const [reconnectCount, setReconnectCount] = useState(0)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Backup & Restore states
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [backupError, setBackupError] = useState('')
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState('')
  const [restoreSuccess, setRestoreSuccess] = useState(false)

  function showError(error: unknown, fallback: string) {
    setNotice({ text: error instanceof Error ? error.message : fallback, tone: 'danger' })
  }

  async function downloadBackup() {
    setDownloadingBackup(true)
    setBackupError('')
    try {
      const token = getAccessToken()
      const response = await fetch(`${API_URL}/system/backup`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(data?.message ?? 'Failed to retrieve database backup.')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '9drive-backup.db'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setBackupError(`Failed to download backup: ${err instanceof Error ? err.message : err}`)
    } finally {
      setDownloadingBackup(false)
    }
  }

  function handleRestoreFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setRestoreFile(e.target.files[0])
    } else {
      setRestoreFile(null)
    }
  }

  async function restoreBackup() {
    if (!restoreFile) return
    setRestoreConfirmOpen(false)
    setRestoringBackup(true)
    setRestoreMessage('')
    setRestoreSuccess(false)

    try {
      const token = getAccessToken()
      const formData = new FormData()
      formData.append('file', restoreFile)

      const response = await fetch(`${API_URL}/system/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to restore database.')
      }

      setRestoreSuccess(true)
      setRestoreMessage(data.message || 'Database restored successfully! Logging you out and reloading...')

      setTimeout(() => {
        clearAuthSession()
        window.location.href = '/login'
      }, 4000)

    } catch (err) {
      setRestoreSuccess(false)
      setRestoreMessage(err instanceof Error ? err.message : 'Failed to restore database.')
    } finally {
      setRestoringBackup(false)
    }
  }

  useEffect(() => {
    if (!isPollingLog) return

    let active = true

    async function fetchLog() {
      try {
        const data = await apiFetch<{ log: string }>('/system/update-log')
        if (!active) return

        setUpdateLog(data.log)
        setReconnectCount(0)

        if (data.log.includes('=== System Update Completed:')) {
          setUpdateFinished(true)
          setUpdateSuccess(true)
          setIsPollingLog(false)
          setUpdateModalTitle('System Updated')
        }
      } catch {
        if (!active) return
        setReconnectCount((prev) => prev + 1)
      }
    }

    fetchLog()
    const intervalId = setInterval(fetchLog, 2000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [isPollingLog])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [updateLog])

  async function runSystemUpdate() {
    setUpdatingSystem(true)
    setNotice(null)
    setUpdateLog('Initiating system update in the background...\n')
    setUpdateFinished(false)
    setUpdateSuccess(null)
    setReconnectCount(0)
    setConfirmCloseUpdate(false)
    setUpdateModalTitle('System Updating')
    setUpdateModalOpen(true)

    try {
      await apiFetch<{ message: string }>('/system/update', { method: 'POST' })
      setIsPollingLog(true)
    } catch (error) {
      setUpdateModalTitle('System Update Failed')
      const errMsg = error instanceof Error ? error.message : 'System update failed to initiate.'
      setUpdateLog((prev) => prev + `\nError: ${errMsg}`)
      setUpdateFinished(true)
      setUpdateSuccess(false)
    } finally {
      setUpdatingSystem(false)
    }
  }

  function closeUpdateModal() {
    setUpdateModalOpen(false)
    setIsPollingLog(false)
    setConfirmCloseUpdate(false)
    if (updateFinished && updateSuccess) {
      window.location.reload()
    }
  }

  function requestCloseUpdateModal() {
    if (updateFinished) closeUpdateModal()
    else setConfirmCloseUpdate(true)
  }

  async function saveGoogleConfig(event: FormEvent) {
    event.preventDefault()
    setSavingGoogleConfig(true)
    setNotice(null)
    try {
      const res = await apiFetch<{ message: string }>('/system/google-config', {
        method: 'POST',
        body: JSON.stringify({
          clientId: googleClientId,
          clientSecret: googleClientSecret || undefined,
          redirectUri: googleRedirectUri || defaultRedirectUri,
        }),
      })
      setNotice({ text: res.message || 'Google OAuth credentials saved.', tone: 'success' })
      setHasSecret(true)
      setGoogleClientSecret('')
    } catch (error) {
      showError(error, 'Failed to save Google OAuth configuration')
    } finally {
      setSavingGoogleConfig(false)
    }
  }

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null

  async function load() {
    const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
    setAccounts(data.accounts)
    setAccountsLoaded(true)

    try {
      const configData = await apiFetch<{ exists: boolean; clientId: string; redirectUri: string; hasSecret: boolean; defaultRedirectUri: string }>('/system/google-config')
      if (configData.exists) {
        setGoogleClientId(configData.clientId || '')
        setGoogleRedirectUri(configData.redirectUri || '')
        setHasSecret(configData.hasSecret || false)
      }
      setDefaultRedirectUri(configData.defaultRedirectUri || '')
    } catch (e) {
      console.error('Failed to load global Google config', e)
    }
  }

  useEffect(() => {
    load().catch((error) => {
      showError(error, 'Failed to load settings')
      setAccountsFailed(true)
      setAccountsLoaded(true)
    })
  }, [])

  useEffect(() => {
    setAvatarError(false)
    getGravatarUrl(user?.email, 96).then(setProfileImageUrl).catch(() => setProfileImageUrl(''))
  }, [user?.email])

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId('')
      return
    }
    if (!accounts.some((account) => account.id === selectedAccountId)) setSelectedAccountId(accounts[0].id)
  }, [accounts, selectedAccountId])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== 'GOOGLE_CONNECTED') return
      const ok = event.data.status === 'success'
      setNotice({ text: ok ? 'Google Drive connected.' : 'Google Drive connection failed.', tone: ok ? 'success' : 'danger' })
      load().then(() => {
        window.dispatchEvent(new Event('9drive:storage-changed'))
      }).catch(() => undefined)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function connectDrive() {
    setConnecting(true)
    setNotice(null)
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
    } finally {
      setConnecting(false)
    }
  }

  async function sync(accountId: string) {
    setSyncingAccountId(accountId)
    try {
      await apiFetch(`/connected-accounts/${accountId}/sync-quota`, { method: 'POST' })
      await load()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      showError(error, 'Failed to sync this account')
    } finally {
      setSyncingAccountId(null)
    }
  }

  async function disconnect() {
    if (!accountToDisconnect) return
    setDisconnectingAccountId(accountToDisconnect.id)
    setNotice(null)
    setDisconnectError('')
    try {
      await apiFetch(`/connected-accounts/${accountToDisconnect.id}`, { method: 'DELETE' })
      setAccountToDisconnect(null)
      setNotice({ text: 'Storage account disconnected.', tone: 'success' })
      await load()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      setDisconnectError(error instanceof Error ? error.message : 'Failed to disconnect this storage account')
    } finally {
      setDisconnectingAccountId(null)
    }
  }

  function openS3Modal() {
    setS3Error('')
    setS3Open(true)
  }

  async function connectS3(event: FormEvent) {
    event.preventDefault()
    setConnectingS3(true)
    setNotice(null)
    setS3Error('')
    try {
      await apiFetch('/connected-accounts/s3', { method: 'POST', body: JSON.stringify({ ...s3Form, endpoint: s3Form.endpoint || undefined, quotaBytes: s3Form.quotaBytes || null }) })
      setS3Open(false)
      setS3Form({ name: '', bucket: '', region: 'us-east-1', endpoint: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false, quotaBytes: '' })
      setNotice({ text: 'S3 storage connected.', tone: 'success' })
      await load()
      window.dispatchEvent(new Event('9drive:storage-changed'))
    } catch (error) {
      setS3Error(error instanceof Error ? error.message : 'Failed to connect S3 storage')
    } finally {
      setConnectingS3(false)
    }
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage account and connected storage." actions={<><Button variant="outline" size="sm" onClick={openS3Modal}><Database className="h-4 w-4" />Connect S3</Button><Button size="sm" onClick={connectDrive} disabled={connecting}><Link2 className="h-4 w-4" />{connecting ? 'Connecting...' : 'Connect Drive'}</Button></>} />
      {notice ? <Alert tone={notice.tone} className="mt-5">{notice.text}</Alert> : null}
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid min-w-0 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3.5">
              {!profileImageUrl || avatarError ? (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-gradient text-lg font-bold text-white shadow-sm sm:h-14 sm:w-14">
                  {(user?.name ?? user?.email ?? 'U').trim().charAt(0).toUpperCase()}
                </div>
              ) : (
                <img
                  src={profileImageUrl}
                  alt=""
                  className="h-12 w-12 animate-fade-in rounded-xl border border-line object-cover sm:h-14 sm:w-14"
                  onError={() => setAvatarError(true)}
                />
              )}
              <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold text-fg">{user?.name ?? 'User'}</h2><p className="mt-0.5 truncate text-xs text-fg-muted">{user?.email ?? '-'}</p></div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionHeading icon={Cloud}>Google Drive</SectionHeading>
                <p className="mt-1 text-[13px] text-fg-muted">Connect one or more Google Drive accounts. 9Drive will route uploads to account with enough space.</p>
              </div>
              <Button className="w-full shrink-0 sm:w-36" size="sm" onClick={connectDrive} disabled={connecting}><Link2 className="h-4 w-4" />{connecting ? 'Opening...' : 'Connect Drive'}</Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionHeading icon={Database}>S3 Compatible</SectionHeading>
                <p className="mt-1 text-[13px] text-fg-muted">Connect AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, or custom endpoint storage.</p>
              </div>
              <Button className="w-full shrink-0 sm:w-36" size="sm" variant="outline" onClick={openS3Modal}><Database className="h-4 w-4" />Connect S3</Button>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-base font-extrabold tracking-tight text-fg">Connected Storage Accounts</h2>
            <div className="mt-3.5 grid gap-3">
              {!accountsLoaded ? <Skeleton className="h-24 rounded-xl" /> : accountsFailed ? <p className="text-sm text-fg-muted">Couldn't load your storage accounts. Refresh the page to try again.</p> : accounts.length === 0 ? <p className="text-sm text-fg-muted">No connected storage account yet.</p> : <>
                <Field label="Choose Account" className="text-xs font-bold text-fg-muted">
                  <Select className="h-10 font-normal" value={selectedAccount?.id ?? ''} onChange={(event) => setSelectedAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{providerLabel(account.provider)} - {account.displayName || account.email} ({account.status})</option>)}</Select>
                </Field>
                {selectedAccount ? <div className="rounded-xl border border-line bg-surface-sunken p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="break-all text-sm font-semibold text-fg">{selectedAccount.displayName || selectedAccount.email}</p><p className="mt-0.5 text-xs text-fg-muted">{providerLabel(selectedAccount.provider)} · {selectedAccount.status}</p></div>
                    <div className="grid grid-cols-2 gap-2 sm:flex"><Button className="w-full" size="sm" variant="outline" onClick={() => sync(selectedAccount.id)} disabled={syncingAccountId === selectedAccount.id}><RefreshCw className={syncingAccountId === selectedAccount.id ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync'}</Button><Button className="w-full" size="sm" variant="danger" onClick={() => { setDisconnectError(''); setAccountToDisconnect(selectedAccount) }}><Trash2 className="h-4 w-4" />Disconnect</Button></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <StorageStat label="Used" value={formatBytes(selectedAccount.storageAccount?.usedBytes)} />
                    <StorageStat label="Total" value={storageLimitLabel(selectedAccount)} />
                    <StorageStat label="Free" value={availableLabel(selectedAccount)} />
                  </div>
                </div> : null}
              </>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
              <SectionHeading icon={Cloud}>Google OAuth Credentials</SectionHeading>
              <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs font-semibold" type="button" aria-expanded={showGoogleHelp} onClick={() => setShowGoogleHelp(!showGoogleHelp)}>
                {showGoogleHelp ? 'Hide Guide' : 'Setup Guide'}
              </Button>
            </div>

            {showGoogleHelp ? (
              <div className="mb-4 animate-rise rounded-xl border border-line bg-surface-sunken p-3.5 text-[13px] leading-relaxed text-fg-muted">
                <p className="mb-1.5 font-bold text-fg">How to setup Google credentials:</p>
                <ol className="list-decimal space-y-1.5 pl-4">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">Google Cloud Console</a>.</li>
                  <li>Enable the <strong className="text-fg">Google Drive API</strong> in your project.</li>
                  <li>Go to <strong className="text-fg">APIs & Services &gt; Credentials</strong>, click <strong className="text-fg">Create Credentials &gt; OAuth client ID</strong>.</li>
                  <li>Set application type to <strong className="text-fg">Web application</strong>.</li>
                  <li>Add this exact URL under <strong className="text-fg">Authorized redirect URIs</strong>:
                    <div className="mt-1 flex select-all items-center gap-1.5 overflow-x-auto rounded-lg border border-line bg-surface-raised p-1.5 font-mono text-[11px] text-fg">
                      {googleRedirectUri || defaultRedirectUri}
                    </div>
                  </li>
                  <li>Copy the generated <strong className="text-fg">Client ID</strong> and <strong className="text-fg">Client Secret</strong> into the form below and save.</li>
                </ol>
              </div>
            ) : null}

            <form onSubmit={saveGoogleConfig} className="grid gap-3.5">
              <Field label="Client ID">
                <Input className="h-10 font-normal" placeholder="Enter Google Client ID" value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} required />
              </Field>

              <Field label={<>Client Secret {hasSecret ? <span className="font-normal text-success">(Already Configured)</span> : null}</>}>
                <Input className="h-10 font-normal" type="password" placeholder={hasSecret ? '••••••••••••••••••••••••' : 'Enter Google Client Secret'} value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)} required={!hasSecret} />
              </Field>

              <Field label="Redirect URI (Optional)">
                <Input className="h-10 font-normal" placeholder={defaultRedirectUri} value={googleRedirectUri} onChange={(e) => setGoogleRedirectUri(e.target.value)} />
              </Field>

              <div className="mt-1 flex justify-end">
                <Button type="submit" disabled={savingGoogleConfig} size="sm">
                  {savingGoogleConfig ? 'Saving...' : 'Save Credentials'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionHeading icon={RefreshCw}>System Update</SectionHeading>
                <p className="mt-1 text-[13px] text-fg-muted">Pull the latest code from GitHub. Dev servers will automatically restart.</p>
              </div>
              <Button className="w-full shrink-0 sm:w-36" variant="outline" size="sm" onClick={runSystemUpdate} disabled={updatingSystem}>
                <RefreshCw className={updatingSystem ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                {updatingSystem ? 'Updating...' : 'Update Code'}
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <SectionHeading icon={Database}>Backup & Restore Database</SectionHeading>
                <span className="hidden text-xs font-semibold text-fg-muted sm:inline">SQLite Local Database</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col justify-between rounded-xl border border-line bg-surface-sunken p-4">
                  <div className="flex items-start gap-3">
                    <IconTile icon={HardDrive} tone="success" size="sm" className="h-10 w-10" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-fg">Download Database Backup</h3>
                      <p className="mt-1 text-xs leading-normal text-fg-muted">Save a copy of your active database containing accounts, virtual folders, file metadata, and configurations.</p>
                    </div>
                  </div>
                  <Button className="mt-4 w-full" onClick={downloadBackup} disabled={downloadingBackup}>
                    <HardDrive className="h-4 w-4" />
                    {downloadingBackup ? 'Downloading...' : 'Download Backup'}
                  </Button>
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-line bg-surface-sunken p-4">
                  <div className="flex items-start gap-3">
                    <IconTile icon={RefreshCw} tone="warning" size="sm" className="h-10 w-10" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-fg">Restore Database Backup</h3>
                      <p className="mt-1 text-xs leading-normal text-fg-muted">Upload a previously downloaded 9Drive backup file to replace the active database.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <Input
                      type="file"
                      accept=".db"
                      aria-label="Backup file"
                      onChange={handleRestoreFileChange}
                      className="h-auto cursor-pointer p-1.5 text-xs text-fg-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-fg"
                    />
                    <Button variant="danger" className="w-full" onClick={() => setRestoreConfirmOpen(true)} disabled={!restoreFile || restoringBackup}>
                      <RefreshCw className={restoringBackup ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                      {restoringBackup ? 'Restoring & Restarting...' : 'Restore Backup'}
                    </Button>
                  </div>
                </div>
              </div>

              {backupError ? <Alert tone="danger">{backupError}</Alert> : null}
              {restoreMessage ? <Alert tone={restoreSuccess ? 'success' : 'danger'}>{restoreMessage}</Alert> : null}
            </div>
          </Card>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <InfoCard icon={HardDrive} title="Storage">{`Connected accounts: ${accounts.length}`}</InfoCard>
          <InfoCard icon={Bell} title="Notifications">Email and app alerts are active.</InfoCard>
          <InfoCard icon={Globe} title="Region">Workspace region: local gateway.</InfoCard>
        </div>
      </div>

      <DummyModal open={s3Open} title="Connect S3 Storage" description="Use any S3-compatible provider with custom endpoint support." onClose={() => setS3Open(false)}>
        <form className="grid gap-4" onSubmit={connectS3}>
          <Field label="Display name"><Input value={s3Form.name} onChange={(event) => setS3Form({ ...s3Form, name: event.target.value })} required /></Field>
          <Field label="Bucket"><Input value={s3Form.bucket} onChange={(event) => setS3Form({ ...s3Form, bucket: event.target.value })} required /></Field>
          <Field label="Region"><Input value={s3Form.region} onChange={(event) => setS3Form({ ...s3Form, region: event.target.value })} required /></Field>
          <Field label="Endpoint URL (optional)"><Input value={s3Form.endpoint} onChange={(event) => setS3Form({ ...s3Form, endpoint: event.target.value })} /></Field>
          <Field label="Access key ID"><Input autoComplete="off" value={s3Form.accessKeyId} onChange={(event) => setS3Form({ ...s3Form, accessKeyId: event.target.value })} required /></Field>
          <Field label="Secret access key"><Input type="password" autoComplete="new-password" value={s3Form.secretAccessKey} onChange={(event) => setS3Form({ ...s3Form, secretAccessKey: event.target.value })} required /></Field>
          <Field label="Quota bytes (optional)"><Input inputMode="numeric" value={s3Form.quotaBytes} onChange={(event) => setS3Form({ ...s3Form, quotaBytes: event.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-fg"><Checkbox checked={s3Form.forcePathStyle} onChange={(event) => setS3Form({ ...s3Form, forcePathStyle: event.target.checked })} />Force path style</label>
          {s3Error ? <Alert tone="danger">{s3Error}</Alert> : null}
          <div className="grid gap-3 sm:flex sm:justify-end"><Button variant="outline" type="button" onClick={() => setS3Open(false)} disabled={connectingS3}>Cancel</Button><Button type="submit" disabled={connectingS3}>{connectingS3 ? 'Connecting...' : 'Connect S3'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={Boolean(accountToDisconnect)} title="Disconnect storage?" description="This will remove this storage account from 9Drive. Existing file records for this account may no longer be usable." onClose={() => setAccountToDisconnect(null)}>
        <div className="grid gap-4">
          <div className="rounded-xl bg-surface-sunken p-4 text-sm text-fg-muted">
            <p className="font-semibold text-fg">{accountToDisconnect?.email}</p>
            <p className="mt-1 tabular-nums">Used storage: {formatBytes(accountToDisconnect?.storageAccount?.usedBytes)}</p>
          </div>
          {disconnectError ? <Alert tone="danger">{disconnectError}</Alert> : null}
          <div className="grid gap-3 sm:flex sm:justify-end">
            <Button variant="outline" onClick={() => setAccountToDisconnect(null)} disabled={Boolean(disconnectingAccountId)}>Cancel</Button>
            <Button variant="danger" onClick={disconnect} disabled={Boolean(disconnectingAccountId)}><Trash2 className="h-4 w-4" />{disconnectingAccountId ? 'Disconnecting...' : 'Disconnect'}</Button>
          </div>
        </div>
      </DummyModal>
      <DummyModal open={restoreConfirmOpen} title="Restore this backup?" description="This overwrites your current configurations, connected accounts, virtual folders, and user accounts. The server will restart." onClose={() => setRestoreConfirmOpen(false)}>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRestoreConfirmOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={restoreBackup}>Restore Backup</Button>
        </div>
      </DummyModal>

      <DummyModal
        open={updateModalOpen}
        title={updateModalTitle}
        description={
          updateFinished
            ? (updateSuccess ? 'System updated successfully' : 'Update failed')
            : 'Live installation logs'
        }
        className="sm:max-w-2xl"
        onClose={requestCloseUpdateModal}
      >
        <div className="grid gap-4">
          <div
            ref={logContainerRef}
            tabIndex={0}
            aria-label="Update log"
            className="relative h-80 select-text overflow-y-auto rounded-xl border border-line bg-code p-4 font-mono text-xs leading-relaxed text-code-fg"
          >
            <pre className="whitespace-pre-wrap">{updateLog}</pre>
            {!updateFinished ? (
              <div className="mt-3 flex items-center gap-2 text-accent">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>
                  {reconnectCount > 0
                    ? `Rebooting server and reconnecting... (attempt ${reconnectCount})`
                    : 'Installing updates...'}
                </span>
              </div>
            ) : null}
          </div>
          {confirmCloseUpdate ? <Alert tone="warning">The update keeps running in the background if you close this log viewer.</Alert> : null}
          <div className="flex justify-end gap-2">
            {confirmCloseUpdate ? <Button variant="outline" onClick={() => setConfirmCloseUpdate(false)}>Keep Watching</Button> : null}
            <Button variant="outline" onClick={confirmCloseUpdate ? closeUpdateModal : requestCloseUpdateModal}>
              {confirmCloseUpdate ? 'Close Anyway' : 'Close'}
            </Button>
            {updateFinished && updateSuccess ? (
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            ) : null}
          </div>
        </div>
      </DummyModal>
    </>
  )
}
