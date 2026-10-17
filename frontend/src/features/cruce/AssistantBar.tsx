import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUp, Clock, LoaderCircle, X } from 'lucide-react'
import type { AssistantReply, AssistantTurn, PhaseId, Project } from './types'

export function AssistantBar({ busy, disabled, phase, history, onAsk, onNavigate }: {
  busy: string; disabled: boolean; phase: PhaseId; history: AssistantTurn[]; onAsk: (question: string) => Promise<Project | null>; onNavigate: (reply: AssistantReply) => void;
}) {
  const [input, setInput] = useState(''), [open, setOpen] = useState(false), [reply, setReply] = useState<AssistantReply | null>(null), [asked, setAsked] = useState('')
  // The clock shows the saved conversation of this project.
  const [showHistory, setShowHistory] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => { if (showHistory) list.current?.scrollTo({ top: list.current.scrollHeight }) }, [showHistory, history.length])
  const suggestions = phase === 'discover' ? ['¿Cuál hipótesis es más riesgosa?', '¿Qué necesito validar?', 'Resumí lo que aprendimos'] : phase === 'explore' ? ['¿Qué alternativa tiene más sentido?', '¿Cuál es el supuesto crítico?'] : ['¿Qué experimento harías primero?', '¿Qué nos dicen los resultados?']
  async function ask(question: string) {
    const value = question.trim()
    if (!value || busy || disabled) return
    setAsked(value); setInput(''); setReply(null); setOpen(true); setShowHistory(false)
    const result = await onAsk(value)
    if (result?.assistant) setReply(result.assistant)
  }
  function submit(event: FormEvent) { event.preventDefault(); void ask(input) }
  function close() { setOpen(false); setShowHistory(false); setReply(null); setAsked('') }
  function navigate(target: AssistantReply) { onNavigate(target); close() }
  return <section className={`assistant-bar ${open ? 'expanded' : ''}`} aria-label="Tu cofounder de IA">
    {open && <div className="assistant-expanded" ref={list}><div className="assistant-expanded-heading"><span className="eyebrow">{showHistory ? 'HISTORIAL CON TU COFOUNDER' : 'TU COFOUNDER, CON TODO EL CONTEXTO'}</span><button className="icon-button" aria-label="Cerrar asistente" disabled={Boolean(busy)} onClick={close}><X size={15} /></button></div>
      {showHistory ? (history.length ? <div className="assistant-history">{history.map(turn => <div key={turn.at} className="assistant-turn">
          <p className="assistant-question">{turn.question}</p>
          <div className="assistant-reply"><span className="cofounder-avatar">A</span><div><p>{turn.message}</p><div className="assistant-turn-foot"><time dateTime={turn.at}>{new Date(turn.at).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><button onClick={() => navigate(turn)}>Continuar por acá<ArrowRight size={13} /></button></div></div></div>
        </div>)}</div> : <p className="quiet">Todavía no hablaste con tu cofounder en este proyecto.</p>)
        : <>{asked && <p className="assistant-question">{asked}</p>}{busy ? <p className="assistant-thinking" role="status"><LoaderCircle size={15} className="spin" />Pensando el próximo movimiento…</p> : reply ? <div className="assistant-reply"><span className="cofounder-avatar">A</span><div><p>{reply.message}</p><button onClick={() => navigate(reply)}>Continuar por acá<ArrowRight size={13} /></button></div></div> : <div className="assistant-suggestions">{suggestions.map(suggestion => <button key={suggestion} disabled={disabled} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div>}</>}
    </div>}
    <form onSubmit={submit}><button type="button" className={`assistant-history-toggle ${showHistory ? 'active' : ''}`} aria-label="Historial del chat" aria-pressed={showHistory} title="Historial del chat" disabled={Boolean(busy)} onClick={() => { const next = !(open && showHistory); setShowHistory(next); setOpen(next) }}><Clock size={18} /></button><input aria-label="Pedile algo a cruce" value={input} onChange={event => setInput(event.target.value)} onFocus={() => { setOpen(true); setShowHistory(false) }} onKeyDown={event => { if (event.key === 'Escape') close() }} placeholder="Pensá en voz alta. Tu cofounder conoce el camino." maxLength={1000} disabled={disabled || Boolean(busy)} /><button className="assistant-send" aria-label="Enviar al cofounder" disabled={disabled || Boolean(busy) || !input.trim()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}</button></form>
  </section>
}
