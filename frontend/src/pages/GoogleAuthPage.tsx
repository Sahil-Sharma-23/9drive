import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '@/components/auth/AuthShell'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }

export function GoogleAuthPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Google sign-in...')
  const [failed, setFailed] = useState(false)
  const token = params.get('token')
  const status = params.get('status')

  useEffect(() => {
    if (status === 'error' || !token) {
      setMessage('Google sign-in failed. Please try again.')
      setFailed(true)
      return
    }

    apiFetch<AuthResponse>('/auth/google/exchange', { method: 'POST', skipAuth: true, body: JSON.stringify({ token }) })
      .then((data) => {
        setAuthSession(data.accessToken, data.refreshToken, data.user)
        navigate('/all-files', { replace: true })
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.')
        setFailed(true)
      })
  }, [navigate, status, token])

  return (
    <AuthShell className="max-w-sm text-center">
      <BrandLogo className="mx-auto h-12 w-12" />
      <h1 className="mt-4 text-xl font-extrabold tracking-tight text-fg">Google Sign-in</h1>
      <p className="mt-2 text-sm text-fg-muted">{message}</p>
      {failed ? <Link className="mt-4 inline-block text-sm font-bold text-accent transition-opacity duration-150 hover:opacity-80" to="/login">Back to login</Link> : null}
    </AuthShell>
  )
}
