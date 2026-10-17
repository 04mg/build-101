import { useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { register, signIn } from '@/features/agent-demo/api/session'

export function AuthPage({ initialError, onSignedIn }: { initialError?: string; onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [identifier, setIdentifier] = useState(''), [password, setPassword] = useState(''), [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(initialError ?? '')
  const registering = mode === 'register'
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (registering && password !== repeat) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true); setError('')
    try {
      if (registering) await register(identifier, password)
      await signIn(identifier, password); onSignedIn()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo completar la acción.') }
    finally { setBusy(false) }
  }
  function switchMode(next: 'login' | 'register') { setMode(next); setError(''); setRepeat('') }
  return <div className="access-page">
    <div className="access-intro"><span className="brand-wordmark static">cruce</span><h1>Las buenas ideas<br />se cruzan con<br /><em>la realidad.</em></h1><p>Un cofounder para hacer las preguntas difíciles y acompañarte al próximo paso.</p><div className="access-phases"><span>Discover</span><span aria-hidden="true">→</span><span>Explore</span><span aria-hidden="true">→</span><span>Prototype</span></div></div>
    <form className="card login-card editor-form" onSubmit={event => void submit(event)}>
      <div className="auth-tabs" role="tablist"><button type="button" role="tab" aria-selected={!registering} className={!registering ? 'active' : ''} onClick={() => switchMode('login')}>Entrar</button><button type="button" role="tab" aria-selected={registering} className={registering ? 'active' : ''} onClick={() => switchMode('register')}>Crear cuenta</button></div>
      <h2>{registering ? 'Empecemos tu proyecto.' : 'Sigamos con tu proyecto.'}</h2>
      <label>{registering ? 'Email' : 'Email o usuario'}<input type={registering ? 'email' : 'text'} autoComplete={registering ? 'email' : 'username'} required value={identifier} onChange={event => setIdentifier(event.target.value)} disabled={busy} /></label>
      <label>Contraseña<input type="password" autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 8 : undefined} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
      {registering && <label>Repetir contraseña<input type="password" autoComplete="new-password" required minLength={8} value={repeat} onChange={event => setRepeat(event.target.value)} disabled={busy} /></label>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? <LoaderCircle size={15} className="spin" /> : <ArrowRight size={15} />}{busy ? (registering ? 'Creando cuenta…' : 'Entrando…') : (registering ? 'Crear cuenta' : 'Entrar')}</button>
    </form>
  </div>
}
