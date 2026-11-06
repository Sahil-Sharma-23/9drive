import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthDivider, AuthHeader, AuthShell } from '@/components/auth/AuthShell'
import { GoogleLogo } from '@/components/auth/GoogleLogo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'
import { getStoredTheme } from '@/lib/theme'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      render: (element: HTMLElement, options: { sitekey: string; theme: 'light' | 'dark'; callback: (token: string) => void; 'expired-callback': () => void }) => number
      reset: (widgetId?: number) => void
    }
  }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const recaptchaRef = useRef<HTMLDivElement | null>(null)
  const recaptchaWidgetId = useRef<number | null>(null)

  useEffect(() => {
    if (!recaptchaSiteKey) return
    const scriptId = 'google-recaptcha-script'
    const renderCaptcha = () => {
      if (!recaptchaRef.current || !window.grecaptcha || recaptchaWidgetId.current !== null) return
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: recaptchaSiteKey,
        theme: getStoredTheme(),
        callback: setCaptchaToken,
        'expired-callback': () => setCaptchaToken(''),
      })
    }
    // The script's load event fires before grecaptcha.render exists, so wait for ready().
    const renderWhenReady = () => window.grecaptcha?.ready(renderCaptcha)

    const existing = document.getElementById(scriptId)
    if (existing) {
      if (window.grecaptcha) renderWhenReady()
      else existing.addEventListener('load', renderWhenReady, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = renderWhenReady
    document.body.appendChild(script)
  }, [])

  async function continueWithGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ url: string }>('/auth/google/url', { skipAuth: true })
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google register failed')
      setGoogleLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (recaptchaSiteKey && !captchaToken) {
      setError('Please complete the captcha.')
      setLoading(false)
      return
    }
    try {
      const data = await apiFetch<AuthResponse>('/auth/register', { method: 'POST', skipAuth: true, body: JSON.stringify({ name, email, password, captchaToken }) })
      setAuthSession(data.accessToken, data.refreshToken, data.user)
      navigate('/all-files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed')
      if (recaptchaWidgetId.current !== null) window.grecaptcha?.reset(recaptchaWidgetId.current)
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <AuthHeader title="Register" description="Create your storage gateway account." />
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <Field label="Name"><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Email"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><Input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        {recaptchaSiteKey ? <div className="min-h-[78px] overflow-hidden rounded-xl"><div ref={recaptchaRef} /></div> : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
      </form>
      <div className="mt-4 grid gap-3">
        <AuthDivider />
        <Button variant="outline" className="h-auto min-h-11 whitespace-normal py-2" disabled={googleLoading} onClick={continueWithGoogle}><GoogleLogo />{googleLoading ? 'Redirecting...' : 'Continue with Google and connect Drive'}</Button>
      </div>
      <p className="mt-5 text-center text-sm text-fg-muted">Already registered? <Link className="font-bold text-accent transition-opacity duration-150 hover:opacity-80" to="/login">Login</Link></p>
    </AuthShell>
  )
}
