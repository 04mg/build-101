import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowLeft, ArrowUp, GitMerge, Info, LoaderCircle, Users } from 'lucide-react'
import { matchLabels, readChat, sendChat, type ChatMessage, type NetworkRequest } from './network'

const hypothesisStatus = {
  validated: { label: 'Validada', chip: 'cr-chip--validada' }, rejected: { label: 'No validada', chip: 'cr-chip--refutada' },
  testing: { label: 'En validación', chip: 'cr-chip--en-validacion' }, open: { label: 'Supuesto', chip: 'cr-chip--supuesto' },
} as const

// Direct chat with a founder whose contact request was accepted. It opens
// with the AI-written reason for contact and polls while it is on screen.
export function NetworkChat({ request, onBack, onRead, onOpenNote }: {
  request: NetworkRequest; onBack: () => void; onRead: () => void; onOpenNote: (projectId: number, noteId: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  const [draft, setDraft] = useState(''), [pending, setPending] = useState(''), [error, setError] = useState('')
  const [details, setDetails] = useState(false)
  const thread = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null), inFlight = useRef(false), onReadRef = useRef(onRead)
  useEffect(() => { onReadRef.current = onRead })
  const contact = request.contact
  const partner = matchLabels[request.type].partner

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const { messages: next } = await readChat(request.id, AbortSignal.timeout(15000))
      setMessages(current => current && sameMessages(current, next) ? current : next)
    } catch (cause) { setError(current => current || message(cause)) }
    finally { inFlight.current = false }
  }, [request.id])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(load).then(() => { if (active) onReadRef.current() })
    const tick = () => { if (document.visibilityState !== 'hidden') void load() }
    const timer = window.setInterval(tick, 4000)
    window.addEventListener('focus', tick)
    input.current?.focus()
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', tick) }
  }, [load])

  const count = (messages?.length ?? 0) + (pending ? 1 : 0)
  useLayoutEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }) }, [count])

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const body = draft.trim()
    if (!body || pending) return
    setPending(body); setDraft(''); setError('')
    try {
      setMessages((await sendChat(request.id, body)).messages)
      onReadRef.current()
    } catch (cause) { setDraft(body); setError(message(cause)) }
    finally { setPending(''); input.current?.focus() }
  }

  return <div className="dm">
    <header className="dm-head">
      <button className="icon-button" aria-label="Volver a Personas" title="Volver" onClick={onBack}><ArrowLeft size={17} /></button>
      <span className={`cr-avatar ${partner ? 'cr-avatar--partner' : 'cr-avatar--red'}`} style={{ '--avatar-size': '36px' } as CSSProperties} aria-hidden="true">{partner ? <GitMerge size={16} /> : <Users size={16} />}</span>
      <div className="dm-title"><h1>{contact?.projectName ?? 'Conexión'}</h1><p>{matchLabels[request.type].label}</p></div>
      <button className={`icon-button ${details ? 'selected' : ''}`} aria-label="Ver su proyecto" title="Ver su proyecto" aria-expanded={details} onClick={() => setDetails(open => !open)}><Info size={17} /></button>
    </header>
    {details && contact && <section className="dm-project" aria-label="Su proyecto">
      {contact.problem && <p>{contact.problem}</p>}
      {contact.hypotheses.length > 0 && <ul className="network-hypotheses">{contact.hypotheses.map(h => <li key={h.title + h.body}><span className={`cr-chip ${hypothesisStatus[h.status].chip}`}><span className="cr-chip__dot" />{hypothesisStatus[h.status].label}</span><span>{h.body}</span></li>)}</ul>}
    </section>}
    <div className="dm-thread" ref={thread} aria-live="polite">
      <div className="dm-thread-inner">
        <p className="dm-context">Se cruzaron por tu nota <button className="text-button" onClick={() => onOpenNote(request.projectId, request.note.id)}>{request.note.title}</button></p>
        {!messages ? <div className="dm-loading"><LoaderCircle className="spin" size={16} /></div> : messages.map((item, index) => {
          const next = messages[index + 1]
          const last = !next || next.mine !== item.mine || minutes(next.createdAt) - minutes(item.createdAt) > 10
          return <div key={item.id} className={`dm-message ${item.mine ? 'mine' : ''} ${last ? 'last' : ''}`}>
            <div className={`chat-bubble ${item.mine ? 'user' : 'agent'}`} title={new Date(item.createdAt).toLocaleString('es-UY')}>{item.body}</div>
            {last && <time dateTime={item.createdAt}>{when(item.createdAt)}</time>}
          </div>
        })}
        {pending && <div className="dm-message mine last sending"><div className="chat-bubble user">{pending}</div><time>Enviando…</time></div>}
      </div>
    </div>
    <div className="dm-footer">
      {error && <p className="dm-error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={submit}>
        <textarea ref={input} aria-label="Mensaje" rows={1} maxLength={4000} value={draft} placeholder="Escribí un mensaje…"
          onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit() } }} />
        <button className="assistant-send" aria-label="Enviar" disabled={!draft.trim() || Boolean(pending)}>{pending ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}</button>
      </form>
    </div>
  </div>
}

function sameMessages(a: ChatMessage[], b: ChatMessage[]) { return a.length === b.length && a.every((item, index) => item.id === b[index].id) }
function minutes(value: string) { return new Date(value).getTime() / 60000 }
function when(value: string) {
  const date = new Date(value), today = new Date()
  const time = date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
  return date.toDateString() === today.toDateString() ? time : `${date.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })} · ${time}`
}
function message(cause: unknown) { return cause instanceof Error ? cause.message : 'No se pudo completar la acción.' }
