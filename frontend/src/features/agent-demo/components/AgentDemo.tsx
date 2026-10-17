import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { agentHeaders, getSession, readableError, signIn, signOut } from '../api/session'

function AgentChat() {
  const [input, setInput] = useState('Estoy construyendo un SaaS y todavía no hablé con clientes. ¿Qué debería validar primero?')
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/agents/chat',
    headers: agentHeaders,
    prepareSendMessagesRequest: ({ messages }) => ({ body: { messages: messages.slice(-1) } }),
  }), [])
  const { messages, sendMessage, status, error, stop, clearError } = useChat({ transport })
  const busy = status === 'submitted' || status === 'streaming'

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!input.trim() || busy) return
    clearError()
    const text = input.trim()
    setInput('')
    void sendMessage({ text })
  }

  return (
    <section>
      <h2>Agente</h2>
      <div className="messages" role="log" aria-label="Conversación" aria-live="polite">
        {messages.map(message => (
          <div key={message.id} className="message">
            <strong>{message.role === 'user' ? 'Tú' : 'Asistente'}</strong>
            <p>{message.parts.map(part => part.type === 'text' ? part.text : '').join('')}</p>
          </div>
        ))}
      </div>
      {status === 'submitted' && <p className="muted">Esperando al agente…</p>}
      {status === 'streaming' && <p className="muted">Recibiendo respuesta…</p>}
      {error && <p role="alert" className="error">{readableError(error)}</p>}
      <form onSubmit={submit}>
        <label>Tu pregunta
          <textarea value={input} onChange={event => setInput(event.target.value)} maxLength={4000} rows={4} disabled={busy} />
        </label>
        <div className="actions">
          {busy ? <button type="button" onClick={() => void stop()}>Detener</button>
            : <button type="submit" disabled={!input.trim()}>Enviar</button>}
        </div>
      </form>
    </section>
  )
}

function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(identifier, password)
      setPassword('')
      onSignedIn()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.')
    } finally { setBusy(false) }
  }

  return (
    <section>
      <h2>Iniciar sesión</h2>
      <form onSubmit={event => void submit(event)}>
        <label>Email o usuario
          <input name="username" autoComplete="username" value={identifier} onChange={event => setIdentifier(event.target.value)} required disabled={busy} />
        </label>
        <label>Contraseña
          <input name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <div><button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button></div>
      </form>
      <p className="muted">Usa una cuenta verificada de TrailBase. El registro por email requiere configurar SMTP.</p>
    </section>
  )
}

function finishLogin() {
  if (window.location.pathname !== '/login') return
  const destination = new URLSearchParams(window.location.search).get('redirect_uri')
  // Admin redirects stay local; never navigate to an arbitrary supplied origin.
  window.location.replace(destination?.startsWith('/_/admin') || destination === '/_/' ? '/_/admin/' : '/')
}

export function AgentDemo() {
  const [session, setSession] = useState<'loading' | 'signed-in' | 'signed-out'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getSession().then(result => {
      if (!active) return
      setSession(result.auth_token ? 'signed-in' : 'signed-out')
      if (result.auth_token) finishLogin()
    }).catch((cause: unknown) => {
      if (active) {
        setSession('signed-out')
        setError(cause instanceof Error ? cause.message : 'No se pudo comprobar la sesión.')
      }
    })
    return () => { active = false }
  }, [])

  async function logout() {
    try {
      await signOut()
      setError('')
      setSession('signed-out')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.')
    }
  }

  return (
    <>
      {error && <p role="alert" className="error">{error}</p>}
      {session === 'loading' ? <p>Comprobando sesión…</p>
        : session === 'signed-in' ? <><AgentChat /><button type="button" onClick={() => void logout()}>Cerrar sesión</button></>
          : <Login onSignedIn={() => { setError(''); setSession('signed-in'); finishLogin() }} />}
    </>
  )
}
