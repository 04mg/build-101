import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, ArrowUp, Check, LoaderCircle, RotateCcw, Undo2 } from 'lucide-react'
import { GraphCanvas } from './GraphCanvas'
import type { Project, Question } from './types'
import { useVoiceInput } from './useVoiceInput'
import { VoiceInputButton } from './VoiceInputButton'

// Discover's first step: the cofounder grills the founder until the problem is defined.
export function ProblemChat({ project, busy, onAnswer, onAction }: {
  project: Project; busy: string;
  onAnswer: (value: string, question: Question) => Promise<boolean>; onAction: (action: Record<string, unknown>) => Promise<Project | null>;
}) {
  const doc = project.document, question = doc.question
  const processing = doc.intake?.status === 'running', failed = doc.intake?.status === 'error'
  const canAnswer = Boolean(question && !processing && !failed)
  const [input, setInput] = useState(''), [sent, setSent] = useState<{ text: string; count: number } | null>(null), [selected, setSelected] = useState<string | null>(null)
  const voice = useVoiceInput({ value: input, onChange: setInput, disabled: Boolean(busy) || !canAnswer, maxLength: 3999 })
  // The sent answer shows until the server's copy lands in the history.
  const pending = sent && sent.count === doc.answers.length ? sent.text : ''
  const [editing, setEditing] = useState(false)
  const problem = doc.nodes.find(n => n.id === 'problem'), hypotheses = doc.nodes.filter(n => n.kind === 'hypothesis')
  const [draft, setDraft] = useState(problem?.body ?? '')
  const notes = doc.nodes.filter(n => (n.phase ?? 'discover') === 'discover' && n.kind !== 'deliverable')
  const thread = useRef<HTMLDivElement>(null)
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' }) }, [doc.answers.length, pending, question?.id])

  async function send(value: string) {
    const text = value.trim()
    if (!text || !question || !canAnswer || busy) return
    setSent({ text, count: doc.answers.length }); setInput('')
    const ok = await onAnswer(text, question)
    setSent(null)
    if (!ok) setInput(text)
  }
  // Reopen an earlier question; later answers are discarded by the server.
  async function rewind(index: number) {
    if (busy || pending) return
    const previous = doc.answers[index].value
    if (await onAction({ action: 'rewind', index })) setInput(previous)
  }
  async function restart() {
    if (busy || pending || !window.confirm('¿Reiniciar la conversación? Se borran las respuestas y el mapa.')) return
    if (await onAction({ action: 'rewind', index: 0 })) { setInput(''); setSelected(null); setEditing(false) }
  }
  function submit(event?: FormEvent) { event?.preventDefault(); const text = voice.stop(); void send(text) }
  async function saveProblem() {
    if (!problem || !draft.trim()) return
    if (await onAction({ action: 'note', id: 'problem', title: problem.title, body: draft.trim() })) setEditing(false)
  }

  return <div className="define-layout">
    <section className="problem-chat" aria-label="Definir el problema con tu cofounder">
      <header className="problem-chat-heading"><strong>Definí el problema</strong><div className="problem-chat-actions">{canAnswer && <span className="chat-step">Pregunta {Math.min(doc.answers.length, 3)} de 3</span>}<button className="text-button chat-restart" disabled={Boolean(busy) || Boolean(pending) || !doc.answers.length} onClick={() => void restart()} title="Empezar de nuevo"><RotateCcw size={13} />Reiniciar</button></div></header>
      {doc.research.status === 'running' && <div className="chat-research-status" role="status"><LoaderCircle size={12} className="spin" />Buscando contexto y alternativas en paralelo…</div>}
      <div className="chat-thread" ref={thread}>
        {doc.answers.map((answer, i) => <div key={answer.questionId + i} className="chat-turn">
          {i > 0 && <AgentBubble><p className="chat-prompt">{answer.prompt}</p></AgentBubble>}
          <div className="chat-answer"><button className="chat-rewind" disabled={Boolean(busy) || Boolean(pending)} onClick={() => void rewind(i)} aria-label="Volver a esta pregunta" title="Volver a esta pregunta"><Undo2 size={13} /></button><div className="chat-bubble user">{answer.value}</div></div>
        </div>)}
        {canAnswer && question && <AgentBubble><p className="chat-prompt">{question.prompt}</p></AgentBubble>}
        {pending && <div className="chat-answer"><div className="chat-bubble user">{pending}</div></div>}
        {(pending || processing || busy === 'thinking') && <div className="chat-agent"><span className="cofounder-avatar">A</span><div className="chat-bubble agent typing" role="status"><LoaderCircle size={14} className="spin" />{doc.intake?.message || 'Pensando…'}</div></div>}
        {failed && <AgentBubble><p role="alert">{doc.intake.message}</p><p>Tu respuesta está guardada.</p><button disabled={Boolean(busy)} onClick={() => void onAction({ action: 'retry-intake' })}>Reintentar sin volver a responder<ArrowRight size={14} /></button></AgentBubble>}
        {!question && !processing && !failed && <AgentBubble>
          <p>Ya tenemos el problema definido. Revisalo antes de seguir:</p>
          <div className="problem-summary">
            {editing ? <><textarea rows={5} maxLength={4000} value={draft} onChange={event => setDraft(event.target.value)} disabled={Boolean(busy)} /><div className="problem-summary-actions"><button className="text-button" disabled={Boolean(busy)} onClick={() => { setEditing(false); setDraft(problem?.body ?? '') }}>Cancelar</button><button disabled={Boolean(busy) || !draft.trim()} onClick={() => void saveProblem()}>Guardar</button></div></>
              : <><span className="eyebrow">PROBLEMA</span><p>{problem?.body}</p><button className="text-button" disabled={Boolean(busy)} onClick={() => { setDraft(problem?.body ?? ''); setEditing(true) }}>Ajustar definición</button></>}
            {hypotheses.length > 0 && <><span className="eyebrow">HIPÓTESIS A CONTRASTAR</span><ul>{hypotheses.map(h => <li key={h.id}>{h.body}</li>)}</ul></>}
          </div>
          <div className="phase-complete"><Check size={16} /><span>Completaste esta fase.</span><button className="primary" disabled={Boolean(busy) || editing} onClick={() => void onAction({ action: 'confirm' })}>{busy ? <LoaderCircle size={14} className="spin" /> : null}Continuar<ArrowRight size={14} /></button></div>
        </AgentBubble>}
      </div>
      {question && !failed && <><form className={`chat-composer ${voice.listening ? 'voice-active' : ''}`} onSubmit={submit}><textarea aria-label="Tu respuesta" aria-live={voice.listening ? 'polite' : 'off'} rows={1} maxLength={3999} value={input} onChange={event => { voice.stop(); setInput(event.target.value) }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder={processing ? 'Tu respuesta está guardada. Preparando el siguiente paso…' : voice.listening ? 'Te escucho…' : question.placeholder || 'Escribí tu respuesta…'} disabled={Boolean(busy) || !canAnswer} /><VoiceInputButton voice={voice} disabled={Boolean(busy) || !canAnswer} /><button className="assistant-send" aria-label="Enviar" disabled={Boolean(busy) || !canAnswer || !input.trim()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}</button></form>{voice.listening && <p className="voice-input-status" role="status">Escuchando · el texto aparece en vivo. Revisalo y envialo cuando quieras.</p>}{voice.error && <p className="voice-input-status error" role="alert">{voice.error}</p>}</>}
    </section>
    <section className="define-graph fill-canvas" aria-label="Mapa del problema">
      <GraphCanvas key={project.id} notes={notes} edges={doc.edges} positions={doc.positions} selected={selected} onSelect={setSelected} follow onMove={(id, position) => void onAction({ action: 'layout', positions: { [id]: position } })} />
    </section>
  </div>
}

function AgentBubble({ children }: { children: ReactNode }) {
  return <div className="chat-agent"><span className="cofounder-avatar">A</span><div className="chat-bubble agent">{children}</div></div>
}
