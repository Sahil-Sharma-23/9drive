import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'

export function GoogleConnectedPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = params.get('status') ?? 'success'
  const ok = status === 'success'

  useEffect(() => {
    window.opener?.postMessage({ type: 'GOOGLE_CONNECTED', status }, window.location.origin)
    const timer = window.setTimeout(() => {
      if (window.opener) window.close()
      else navigate('/settings')
    }, 800)
    return () => window.clearTimeout(timer)
  }, [navigate, status])

  return (
    <AuthShell className="max-w-sm text-center">
      {ok ? <CheckCircle className="mx-auto h-10 w-10 animate-tick text-success" aria-hidden="true" /> : <XCircle className="mx-auto h-10 w-10 animate-tick text-danger" aria-hidden="true" />}
      <h1 className="mt-4 text-xl font-extrabold tracking-tight text-fg">{ok ? 'Google Drive Connected' : 'Connection Failed'}</h1>
      <p className="mt-2 text-sm text-fg-muted">{ok ? 'This window will close automatically.' : 'Close this window and try again.'}</p>
    </AuthShell>
  )
}
