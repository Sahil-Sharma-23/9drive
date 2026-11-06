import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthDivider, AuthHeader, AuthShell } from '@/components/auth/AuthShell'
import { GoogleLogo } from '@/components/auth/GoogleLogo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function continueWithGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ url: string }>('/auth/google/url', { skipAuth: true })
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
      setGoogleLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', skipAuth: true, body: JSON.stringify({ email, password }) })
      setAuthSession(data.accessToken, data.refreshToken, data.user)
      navigate('/all-files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <AuthHeader title="Login" description="Access your 9Drive gateway." />
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
      </form>
      <div className="mt-4 grid gap-3">
        <AuthDivider />
        <Button variant="outline" disabled={googleLoading} onClick={continueWithGoogle}><GoogleLogo />{googleLoading ? 'Redirecting...' : 'Continue with Google'}</Button>
      </div>
      <p className="mt-5 text-center text-sm text-fg-muted">No account? <Link className="font-bold text-accent transition-opacity duration-150 hover:opacity-80" to="/register">Register</Link></p>
    </AuthShell>
  )
}
