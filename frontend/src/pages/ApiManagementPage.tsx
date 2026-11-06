import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle, Clipboard, KeyRound, ShieldCheck, Trash2, UploadCloud } from 'lucide-react'
import { Alert, type AlertTone } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, LoadFailedState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DummyModal } from '@/components/drive/DummyModal'
import { MetricCard } from '@/components/drive/MetricCard'
import { PageHeader } from '@/components/drive/PageHeader'
import { API_URL, apiFetch, formatDate } from '@/lib/api'

type ApiKey = { id: string; name: string; keyPrefix: string; scopes: string[]; status: string; lastUsedAt: string | null; expiresAt: string | null; revokedAt: string | null; createdAt: string }

const curlExample = `curl -X POST "${API_URL}/api/v1/uploads" \\
  -H "Authorization: Bearer 9d_live_xxx" \\
  -F 'filesMeta=[{"fieldName":"file-0","fileName":"hello.txt","mimeType":"text/plain","sizeBytes":"12"}]' \\
  -F "file-0=@hello.txt;type=text/plain"`

const jsExample = `const form = new FormData()
form.append('filesMeta', JSON.stringify([
  { fieldName: 'file-0', fileName: file.name, mimeType: file.type, sizeBytes: String(file.size) },
]))
form.append('file-0', file)

await fetch('${API_URL}/api/v1/uploads', {
  method: 'POST',
  headers: { Authorization: 'Bearer 9d_live_xxx' },
  body: form,
})`

const inlineCode = 'block min-w-0 max-w-full overflow-x-auto rounded-xl bg-surface-hover p-3 text-xs text-fg sm:text-sm'

function CodeExample({ title, code, onCopy }: { title: string; code: string; onCopy: () => void }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-bold text-fg">{title}</p>
        <Button variant="outline" size="sm" onClick={onCopy}><Clipboard className="h-4 w-4" />Copy</Button>
      </div>
      <pre tabIndex={0} aria-label={`${title} example`} className="max-h-72 max-w-full overflow-auto rounded-xl border border-line bg-code p-3 text-xs leading-relaxed text-code-fg">{code}</pre>
    </div>
  )
}

function KeyDetail({ label, children }: { label: string; children: string }) {
  return <p className="min-w-0 break-words"><span className="font-semibold text-fg">{label}:</span> {children}</p>
}

export function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [secret, setSecret] = useState('')
  const [notice, setNotice] = useState<{ text: string; tone: AlertTone } | null>(null)
  const [createError, setCreateError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    const data = await apiFetch<{ apiKeys: ApiKey[] }>('/api-keys')
    setApiKeys(data.apiKeys)
    setLoaded(true)
  }

  useEffect(() => {
    load().catch((error) => {
      setNotice({ text: error instanceof Error ? error.message : 'Failed to load API keys', tone: 'danger' })
      setLoadFailed(true)
      setLoaded(true)
    })
  }, [])

  function openCreateModal() {
    setCreateError('')
    setCreateOpen(true)
  }

  async function createKey(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setNotice(null)
    setCreateError('')
    try {
      const data = await apiFetch<{ apiKey: ApiKey; secret: string }>('/api-keys', { method: 'POST', body: JSON.stringify({ name: keyName }) })
      setSecret(data.secret)
      setKeyName('')
      setCreateOpen(false)
      await load()
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create API key')
    } finally {
      setLoading(false)
    }
  }

  async function revokeKey(id: string) {
    try {
      await apiFetch(`/api-keys/${id}`, { method: 'DELETE' })
      await load()
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Failed to revoke this key', tone: 'danger' })
    }
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value)
      .then(() => setNotice({ text: 'Copied to clipboard.', tone: 'success' }))
      .catch(() => setNotice({ text: 'Failed to copy.', tone: 'danger' }))
  }

  const activeKeys = apiKeys.filter((apiKey) => apiKey.status === 'active').length
  const usedKeys = apiKeys.filter((apiKey) => apiKey.lastUsedAt).length

  return (
    <>
      <PageHeader title="API Management" description="Create API keys, copy examples, and upload files from external apps." actions={<Button className="w-full sm:w-auto" onClick={openCreateModal}><KeyRound className="h-4 w-4" />Create API Key</Button>} />
      {notice ? <Alert tone={notice.tone} className="mt-5">{notice.text}</Alert> : null}
      {secret ? (
        <Card className="mt-5 min-w-0 animate-rise overflow-hidden border-accent-line bg-accent-soft p-4 sm:p-5">
          <div className="grid min-w-0 gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <IconTile icon={ShieldCheck} size="sm" className="h-10 w-10" />
              <div className="min-w-0"><p className="font-extrabold text-fg">Copy your API key now</p><p className="mt-1 text-sm text-fg-muted">This secret is shown once. Store it securely before closing this page.</p></div>
            </div>
            <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
              <code className="block min-w-0 max-w-full overflow-x-auto rounded-xl border border-line bg-surface-raised p-3 text-xs font-semibold text-fg sm:text-sm">{secret}</code>
              <Button className="w-full lg:w-auto" type="button" onClick={() => copy(secret)}><Clipboard className="h-4 w-4" />Copy key</Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Active keys" value={String(activeKeys)} icon={KeyRound} loading={!loaded} />
        <MetricCard label="Used keys" value={String(usedKeys)} icon={CheckCircle} tone="success" loading={!loaded} />
        <MetricCard label="Upload endpoint" value="1" icon={UploadCloud} />
      </div>

      <div className="mt-6 grid gap-6">
        <Card className="min-w-0 p-4 sm:p-5">
          <div><h2 className="text-base font-extrabold tracking-tight text-fg">API Keys</h2><p className="mt-1 text-sm text-fg-muted">Keys can only upload files. Raw secrets are never stored.</p></div>
          <div className="mt-4 grid gap-3">
            {!loaded ? <Skeleton className="h-24 rounded-xl" /> : loadFailed ? <LoadFailedState className="py-8" /> : apiKeys.length === 0 ? (
              <EmptyState icon={KeyRound} title="No API keys yet" description="Create one key, copy it once, then use the docs below." className="rounded-xl border border-dashed border-line-strong py-8" action={<Button className="w-full sm:w-auto" onClick={openCreateModal}>Create API Key</Button>} />
            ) : apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="grid min-w-0 gap-4 rounded-xl bg-surface-sunken p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words font-semibold text-fg">{apiKey.name}</p>
                    <Badge tone={apiKey.status === 'active' ? 'success' : 'neutral'}>{apiKey.status}</Badge>
                  </div>
                  <div className="mt-2 grid min-w-0 gap-1 text-sm text-fg-muted sm:grid-cols-2">
                    <KeyDetail label="Prefix">{`${apiKey.keyPrefix}...`}</KeyDetail>
                    <KeyDetail label="Created">{formatDate(apiKey.createdAt)}</KeyDetail>
                    <KeyDetail label="Last used">{apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}</KeyDetail>
                    <KeyDetail label="Scope">{apiKey.scopes.join(', ')}</KeyDetail>
                  </div>
                </div>
                <Button className="w-full lg:w-auto" variant="danger" size="sm" onClick={() => revokeKey(apiKey.id)} disabled={apiKey.status === 'revoked'}><Trash2 className="h-4 w-4" />Revoke</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 p-4 sm:p-5">
          <div><h2 className="text-base font-extrabold tracking-tight text-fg">Upload API Docs</h2><p className="mt-1 text-sm text-fg-muted">Multipart upload uses the same storage routing as dashboard uploads.</p></div>
          <div className="mt-4 grid gap-4 text-sm text-fg-muted">
            <div className="min-w-0"><div className="mb-2 flex items-center justify-between gap-3"><p className="font-bold text-fg">Endpoint</p><Button variant="outline" size="sm" onClick={() => copy(`${API_URL}/api/v1/uploads`)}><Clipboard className="h-4 w-4" />Copy</Button></div><code className={inlineCode}>POST {API_URL}/api/v1/uploads</code></div>
            <div className="min-w-0"><p className="font-bold text-fg">Auth Header</p><code className={`mt-2 ${inlineCode}`}>Authorization: Bearer 9d_live_xxx</code></div>
            <CodeExample title="cURL" code={curlExample} onCopy={() => copy(curlExample)} />
            <CodeExample title="JavaScript" code={jsExample} onCopy={() => copy(jsExample)} />
          </div>
        </Card>
      </div>

      <DummyModal open={createOpen} title="Create API Key" description="API keys can upload files using the public API." onClose={() => setCreateOpen(false)}>
        <form className="grid gap-4" onSubmit={createKey}>
          <Field label="Key name"><Input placeholder="Marketing site uploader" value={keyName} onChange={(event) => setKeyName(event.target.value)} required /></Field>
          {createError ? <Alert tone="danger">{createError}</Alert> : null}
          <div className="grid gap-3 sm:flex sm:justify-end"><Button variant="outline" type="button" onClick={() => setCreateOpen(false)} disabled={loading}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Key'}</Button></div>
        </form>
      </DummyModal>
    </>
  )
}
