import { useState, type FormEvent, type ReactNode } from 'react'
import { Activity, AlertCircle, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useApi } from './ApiProvider'
import './auth-gate.css'

export function AuthGate({ children }: { children: ReactNode }) {
  const { authState, authError } = useApi()
  if (authState === 'checking') {
    return <main className="auth-gate"><div className="auth-card auth-loading"><LoaderCircle className="auth-spin" size={24} /><span>Connecting to MentorAMP…</span></div></main>
  }
  if (authState === 'authenticated') return <>{children}</>
  return <AuthPanel unavailable={authState === 'unavailable'} error={authError} />
}

function AuthPanel({ unavailable, error }: { unavailable: boolean; error: string | null }) {
  const { baseUrl, request, signIn } = useApi()
  const [mode, setMode] = useState<'sign-in' | 'bootstrap'>('sign-in')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'bootstrap') {
        await request('/v1/auth/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ email, full_name: fullName, password }),
        })
      }
      await signIn(email, password)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }
  return <main className="auth-gate">
    <section className="auth-card">
      <div className="auth-brand"><span><Activity size={22} /></span><b>Mentor<span>AMP</span></b></div>
      <span className="auth-kicker">SECURE ACTUARIAL WORKSPACE</span>
      <h1>{mode === 'bootstrap' ? 'Set up the first administrator' : 'Sign in to MentorAMP'}</h1>
      <p>{mode === 'bootstrap' ? 'Create the initial administrator for this new database. This is available only until the first user is created.' : 'Use your backend account to access live models, inputs, projection runs, and reports.'}</p>
      {(unavailable || message) && <div className="auth-alert"><AlertCircle size={17} /><span>{message || error || `Could not reach the backend at ${baseUrl}.`}</span></div>}
      <form onSubmit={submit}>
        {mode === 'bootstrap' && <label>Full name<input autoComplete="name" required value={fullName} onChange={event => setFullName(event.target.value)} /></label>}
        <label>Email<input autoComplete="username" type="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label>Password<input autoComplete={mode === 'bootstrap' ? 'new-password' : 'current-password'} type="password" minLength={mode === 'bootstrap' ? 12 : undefined} required value={password} onChange={event => setPassword(event.target.value)} /></label>
        <button className="auth-submit" disabled={busy || unavailable} type="submit">{busy ? <><LoaderCircle className="auth-spin" size={17} />{mode === 'bootstrap' ? 'Creating account…' : 'Signing in…'}</> : <><ShieldCheck size={17} />{mode === 'bootstrap' ? 'Create administrator' : 'Sign in'}</>}</button>
      </form>
      {!unavailable && <button className="auth-mode-toggle" onClick={() => { setMode(mode === 'sign-in' ? 'bootstrap' : 'sign-in'); setMessage('') }} type="button">{mode === 'bootstrap' ? 'Already have an account? Sign in' : 'New database? Create the first administrator'}</button>}
      <small className="auth-endpoint">API: {baseUrl}</small>
    </section>
  </main>
}
