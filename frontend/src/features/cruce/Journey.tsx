import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, LoaderCircle, X } from 'lucide-react'
import { initialQuestion, statusLabels, type Capabilities, type KnowledgeNote, type Project, type Question } from './types'
import { sourceContribution } from './sourceContribution'

interface Props {
  project: Project | null
  capabilities: Capabilities
  busy: string
  onAnswer: (value: string, question: Question) => Promise<boolean>
  onAction: (action: Record<string, unknown>) => Promise<Project | null>
  onResearch: () => void
  onSelect: (id: string) => void
  onEvidence: () => void
  onSearch: (query: string) => void
  initialMode?: 'decision'
}

export function Journey(props: Props) {
  const { project, capabilities, busy, onSelect, onResearch, onEvidence, onSearch } = props
  const doc = project?.document
  const question = doc ? doc.question : initialQuestion
  const [decisionMode, setDecisionMode] = useState(props.initialMode === 'decision')
  const [forkMode, setForkMode] = useState(false)
  if (question) return <div className="journey-panel"><QuestionForm key={`${project?.id ?? 'new'}-${question.id}`} question={question} count={doc?.answers.length ?? 0} busy={busy} onAnswer={props.onAnswer} />
    {doc?.answers.length ? <details className="answer-history"><summary>Lo que trajiste · {doc.answers.length}</summary>{doc.answers.map((answer, i) => <div key={answer.questionId + i}><strong>{answer.prompt}</strong><p>{answer.value}</p></div>)}</details> : null}
  </div>
  if (!doc || !project) return null
  const hypotheses = doc.nodes.filter(n => n.kind === 'hypothesis')
  const evidence = doc.nodes.filter(n => n.kind === 'evidence' && n.status === 'done')
  const problem = doc.nodes.find(n => n.kind === 'problem')
  if (decisionMode) return <DecisionForm busy={busy} onBack={() => setDecisionMode(false)} onSave={async action => {
    const result = await props.onAction(action)
    if (result) setDecisionMode(false)
  }} />
  if (forkMode) return <ForkForm busy={busy} onBack={() => setForkMode(false)} onSave={async pivot => {
    const result = await props.onAction({ action: 'fork', pivot })
    if (result) setForkMode(false)
  }} />
  return <div className="journey-panel">
    <div className="panel-kicker">{doc.confirmed ? 'Próximo paso' : 'Antes de investigar'}</div>
    {!doc.confirmed ? <>
      <h2>¿Este es el problema?</h2>
      <p className="problem-review">{problem?.body}</p>
      <div className="panel-actions"><button className="primary" disabled={Boolean(busy)} onClick={() => void props.onAction({ action: 'confirm' })}>Investigar este problema <ArrowRight size={14} /></button>
        <button className="text-button" disabled={Boolean(busy)} onClick={() => onSelect('problem')}>Ajustar definición</button></div>
    </> : doc.decision ? <>
      <h2>{doc.decision === 'pivot' ? 'Otro camino, con lo aprendido.' : doc.decision === 'pause' ? 'Pausa con contexto.' : 'Ya sabés qué profundizar.'}</h2>
      <p className="quiet">{doc.nodes.find(n => n.id === 'decision')?.body}</p>
      {doc.pivots.map((pivot, i) => <div className="pivot-option" key={i}><h3>{pivot.title}</h3><p>{pivot.problem}</p><button disabled={Boolean(busy)} onClick={() => void props.onAction({ action: 'fork', pivot })}>Abrir fork <ArrowRight size={13} /></button></div>)}
      <button className="text-button" disabled={Boolean(busy)} onClick={() => setForkMode(true)}>⑂ Definir otro fork</button>
    </> : <>
      <h2>{evidence.length ? '¿Qué cambia con esta evidencia?' : 'Salí a contrastarlo.'}</h2>
      <p className="quiet">{evidence.length ? 'Revisá lo que apoya y contradice tus hipótesis antes de decidir.' : 'Hablá con personas del segmento sobre la última vez que vivieron el problema.'}</p>
      <button className="primary" disabled={Boolean(busy)} onClick={evidence.length ? () => setDecisionMode(true) : onEvidence}>{evidence.length ? 'Tomar una decisión' : 'Registrar evidencia'} <ArrowRight size={14} /></button>
      <button className="text-button" onClick={() => onSelect('experiment')}>Ver el experimento</button>
    </>}
    <section className="research-status">
      <div className="section-title"><span>Research del agente</span>{doc.research.status === 'running' ? <LoaderCircle size={14} className="spin" /> : <span>{doc.nodes.filter(n => n.kind === 'source').length} fuentes</span>}</div>
      <p className="quiet">{doc.research.message || (capabilities.research ? 'Alternativas, experiencias y contraejemplos.' : 'Falta Claude Code o EXA_API_KEY para buscar en la web.')}</p>
      {doc.confirmed && doc.research.status !== 'running' && <button className="text-button" disabled={Boolean(busy) || !capabilities.research} onClick={onResearch}>{doc.research.status === 'idle' ? 'Investigar ahora' : 'Actualizar research'} <ArrowRight size={12} /></button>}
    </section>
    <section className="hypotheses-list"><div className="section-title"><span>Hipótesis</span><span>{hypotheses.length}</span></div>
      {hypotheses.map(note => <button key={note.id} className="hypothesis-row" onClick={() => onSelect(note.id)}><span className={`status-dot ${note.status}`} /><span>{note.body}</span><span className="sr-only">{statusLabels[note.status]}</span></button>)}
    </section>
    {doc.confirmed && <div className="panel-actions secondary-actions"><button className="text-button" disabled={Boolean(busy)} onClick={onEvidence}>＋ Agregar evidencia</button><button className="text-button" onClick={() => onSearch(problem?.body ?? '')}>Buscar aprendizajes parecidos <ArrowRight size={12} /></button></div>}
  </div>
}

function QuestionForm({ question, count, busy, onAnswer }: { question: Question; count: number; busy: string; onAnswer: Props['onAnswer'] }) {
  const [value, setValue] = useState(''), [choice, setChoice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const answer = [choice, value.trim()].filter(Boolean).join('\n')
    if (!answer || busy || submitting) return
    setSubmitting(true)
    try { await onAnswer(answer, question) } finally { setSubmitting(false) }
  }
  return <form className="grill-form" onSubmit={event => void submit(event)}>
    <div className="panel-kicker">DISCOVER / DEFINIR EL PROBLEMA <span>Pregunta {count}</span></div>
    <h2>{question.prompt}</h2>
    <div className="suggestions">{question.options.map(option => <button type="button" key={option.label} aria-pressed={choice === option.label} className={`suggestion ${choice === option.label ? 'chosen' : ''}`} disabled={Boolean(busy)} onClick={() => setChoice(c => c === option.label ? '' : option.label)}>
      <span>{option.label}</span>{option.recommended && <small>Recomendado{option.reason ? ` · ${option.reason}` : ''}</small>}{choice === option.label && <Check size={14} className="choice-check" />}
    </button>)}</div>
    <div className="answer-composer"><textarea aria-label={question.options.length ? 'Tu respuesta o más contexto' : 'Tu idea'} value={value} onChange={event => setValue(event.target.value)} placeholder={question.options.length ? 'O escribí tu respuesta…' : question.placeholder} maxLength={Math.max(0, 3999 - choice.length)} rows={question.options.length ? 3 : 6} disabled={Boolean(busy)} />
      <div><button className="primary" type="submit" disabled={Boolean(busy) || submitting || (!value.trim() && !choice)}>{busy || submitting ? <><LoaderCircle size={14} className="spin" /> Pensando</> : <>Continuar <ArrowRight size={14} /></>}</button></div>
    </div>
    {!count && <p className="input-hint">No hace falta tener la solución.</p>}
  </form>
}

function DecisionForm({ busy, onBack, onSave }: { busy: string; onBack: () => void; onSave: (action: Record<string, unknown>) => Promise<void> }) {
  const [decision, setDecision] = useState('persevere'), [reason, setReason] = useState('')
  return <form className="journey-panel editor-form" onSubmit={e => { e.preventDefault(); void onSave({ action: 'decision', decision, reason }) }}>
    <PanelBack onBack={onBack} busy={busy} /><h2>¿Qué decidimos?</h2>
    <label>Dirección<select value={decision} onChange={e => setDecision(e.target.value)}><option value="persevere">Profundizar este enfoque</option><option value="pivot">Explorar un pivot</option><option value="pause">Pausar</option></select></label>
    <label>Qué aprendimos y por qué<textarea required minLength={5} maxLength={4000} rows={7} value={reason} onChange={e => setReason(e.target.value)} placeholder="Qué evidencia cambió tu forma de ver el problema…" /></label>
    <button className="primary" disabled={Boolean(busy) || reason.trim().length < 5}>{busy ? 'Guardando…' : 'Registrar decisión'}</button>
  </form>
}

function ForkForm({ busy, onBack, onSave }: { busy: string; onBack: () => void; onSave: (pivot: { title: string; problem: string; hypothesis: string; experiment: string }) => Promise<void> }) {
  const [values, setValues] = useState({ title: '', problem: '', hypothesis: '', experiment: '' })
  return <form className="journey-panel editor-form" onSubmit={e => { e.preventDefault(); void onSave(values) }}><PanelBack onBack={onBack} busy={busy} /><h2>Un nuevo camino.</h2>
    {([['title', 'Nombre'], ['problem', 'Problema a explorar'], ['hypothesis', 'Nueva hipótesis'], ['experiment', 'Próximo experimento']] as const).map(([key, label]) => <label key={key}>{label}<textarea required maxLength={key === 'title' ? 100 : 4000} rows={key === 'title' ? 1 : 3} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} /></label>)}
    <button className="primary" disabled={Boolean(busy) || Object.values(values).some(v => !v.trim())}>Crear fork <ArrowRight size={14} /></button>
  </form>
}

export function PanelBack({ onBack, busy = '' }: { onBack: () => void; busy?: string }) { return <button type="button" className="text-button back-button" disabled={Boolean(busy)} onClick={onBack}>← Volver al recorrido</button> }

export function EvidenceForm({ project, busy, onBack, onSave, hypothesisId }: { project: Project; busy: string; onBack: () => void; onSave: Props['onAction']; hypothesisId?: string }) {
  const hypotheses = project.document.nodes.filter(n => n.kind === 'hypothesis')
  const [target, setTarget] = useState(hypothesisId ?? hypotheses[0]?.id ?? '')
  const selectedHypothesis = hypotheses.find(note => note.id === target)
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [url, setUrl] = useState(''), [outcome, setOutcome] = useState('informs')
  return <form className="journey-panel editor-form" onSubmit={e => { e.preventDefault(); void onSave({ action: 'evidence', title, body, hypothesisId: target, outcome, ...(url.trim() ? { url: url.trim() } : {}) }).then(result => { if (result) onBack() }) }}>
    <PanelBack onBack={onBack} busy={busy} /><h2>¿Qué observaste?</h2>
    <label>Hipótesis<select value={target} onChange={e => setTarget(e.target.value)} required aria-describedby="selected-hypothesis">{hypotheses.map(n => <option key={n.id} value={n.id}>{n.title} · {n.body}</option>)}</select></label>
    {selectedHypothesis && <p className="hypothesis-statement" id="selected-hypothesis">{selectedHypothesis.body}</p>}
    <label>Resumen<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} placeholder="Qué pasó, en una frase" /></label>
    <label>Observación<textarea required maxLength={4000} rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder="Quién, cuándo, qué dijo o hizo. Separá los hechos de tu interpretación." /></label>
    <label>Fuente o registro (opcional)<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label>
    <label>Qué aporta<select value={outcome} onChange={e => setOutcome(e.target.value)}><option value="informs">Contexto, todavía no concluye</option><option value="supports">Apoya la hipótesis</option><option value="contradicts">Contradice la hipótesis</option></select></label>
    <button className="primary" disabled={Boolean(busy) || !target || !body.trim() || !title.trim()}>Guardar evidencia <ArrowRight size={14} /></button>
  </form>
}

export function NotePanel({ note, project, busy, onClose, onSelect, onSave, onEvidence }: { note: KnowledgeNote; project: Project; busy: string; onClose: () => void; onSelect: (id: string) => void; onSave: Props['onAction']; onEvidence: (id: string) => void }) {
  const [title, setTitle] = useState(note.title), [body, setBody] = useState(note.body), [target, setTarget] = useState('')
  const [discovery, setDiscovery] = useState(note.discovery)
  const editedBody = discovery ? `Observación\n${discovery.observation}\n\nInsight\n${discovery.insight}\n\nOportunidad (HMW)\n${discovery.opportunity}` : body
  const nodes = project.document.nodes, edges = project.document.edges
  const isSource = (id: string) => nodes.some(n => n.id === id && n.kind === 'source')
  const sources = note.kind === 'source' ? [] : nodes.filter(n => n.kind === 'source' && edges.some(e => (e.source === n.id && e.target === note.id) || (e.target === n.id && e.source === note.id)))
  const connections = edges.filter(e => (e.source === note.id || e.target === note.id) && (note.kind === 'source' || !isSource(e.source === note.id ? e.target : e.source)))
  return <div className="journey-panel note-detail"><div className="detail-heading"><span className="panel-kicker">{note.kind === 'source' ? 'Aporte de la fuente' : 'En tu mapa'}</span><button className="icon-button" aria-label="Cerrar nota" onClick={onClose}><X size={16} /></button></div>
    <span className={`note-status ${note.status}`}>{statusLabels[note.status]}</span>
    {note.inheritedFrom && <p className="input-hint">⑂ Contexto heredado del proyecto #{note.inheritedFrom.projectId}. Su alcance original se conserva.</p>}
    {note.kind === 'source' ? <><h2>{note.title}</h2><p className="source-contribution">{sourceContribution(note, project.document.nodes, project.document.edges)}</p>{note.url && <a className="source-link" href={note.url} target="_blank" rel="noreferrer">Abrir fuente ↗</a>}<details className="source-original"><summary>Ver contenido original</summary><p className="source-content">{note.quote || note.body}</p></details><p className="input-hint">Consultada {formatDate(note.updatedAt)}{note.publishedAt ? ` · Publicada ${formatDate(note.publishedAt)}` : ''}</p></> :
      <form className="editor-form" onSubmit={e => { e.preventDefault(); void onSave({ action: 'note', id: note.id, title, body: editedBody, ...(discovery ? { discovery } : {}) }) }}><label>Título<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} /></label>{discovery ? <>{([['observation', 'Observación', 700], ['insight', 'Insight', 700], ['opportunity', 'Oportunidad (HMW)', 450]] as const).map(([key, label, limit]) => <label key={key}>{label}<textarea required minLength={10} maxLength={limit} rows={4} value={discovery[key]} onChange={e => setDiscovery(d => d ? { ...d, [key]: e.target.value } : d)} /></label>)}</> : <label>Contenido<textarea required maxLength={4000} rows={8} value={body} onChange={e => setBody(e.target.value)} /></label>}<button disabled={Boolean(busy) || !title.trim() || !editedBody.trim() || (title === note.title && editedBody === note.body)}>Guardar cambios</button></form>}
    {note.kind === 'hypothesis' && <button className="primary" disabled={Boolean(busy)} onClick={() => onEvidence(note.id)}>Encuesta y entrevistas <ArrowRight size={13} /></button>}
    {(note.rationale || sources.length > 0) && <section className="note-research"><div className="section-title"><span>{note.rationale ? 'Por qué cambió' : 'Fuentes'}</span><span>{sources.length}</span></div>
          {note.rationale && <p>{note.rationale}</p>}
          {sources.map(source => <button key={source.id} className="text-button related-link" onClick={() => onSelect(source.id)}><span><small>{source.url ? hostname(source.url) : 'Fuente'}</small>{source.title}</span><ArrowRight size={12} /></button>)}
    </section>}
    <section className="related-notes"><div className="section-title">Conexiones</div>{connections.map(edge => {
      const other = project.document.nodes.find(n => n.id === (edge.source === note.id ? edge.target : edge.source))
      return other ? <button className="text-button related-link" key={edge.id} onClick={() => onSelect(other.id)}>{other.title} <ArrowRight size={12} /></button> : null
    })}<div className="connect-note"><select aria-label="Relacionar con otra nota" value={target} onChange={e => setTarget(e.target.value)}><option value="">Relacionar con…</option>{project.document.nodes.filter(n => n.id !== note.id).map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select><button className="icon-button" aria-label="Crear relación" disabled={!target || Boolean(busy)} onClick={() => void onSave({ action: 'relation', source: note.id, target, relation: 'related' }).then(result => { if (result) setTarget('') })}>＋</button></div></section>
    {note.history.length > 0 && <details className="answer-history"><summary>Versiones anteriores · {note.history.length}</summary>{[...note.history].reverse().map((revision, i) => <div key={i}><strong>{formatDate(revision.at)} · {statusLabels[revision.status]}</strong><p>{revision.body}</p></div>)}</details>}
  </div>
}

function hostname(url: string) { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Fuente' } }

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' }) }
