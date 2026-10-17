import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ClipboardList, Copy, Mic, Plus, Square, Trash2, X } from 'lucide-react'
import { canExplore, currentAssessment, hypothesisRejected, hypothesisValidated, validationCounts, type Project, type SurveyDraft, type SurveyQuestion, type ValidationPlan } from './types'

type Action = (action: Record<string, unknown>) => Promise<Project | null>

export function ValidationWorkspace({ project, busy, onAction, onSelect, active, onOpen }: { project: Project; busy: string; onAction: Action; onSelect: (id: string) => void; active: string | null; onOpen: (id: string | null) => void }) {
  const hypotheses = project.document.nodes.filter(n => n.kind === 'hypothesis')
  const plan = project.document.validation?.find(p => p.hypothesisId === active)
  if (active && plan) return <HypothesisValidation key={`${project.id}-${active}`} plan={plan} project={project} busy={busy} onAction={onAction} onBack={() => onOpen(null)} onSelect={onSelect} />
  return <div className="validation-home">
    <h1>Salí a contrastarlo.</h1>
    <ValidationGauge percent={project.progress} />
    <p className="validation-intro">Hablá con personas del segmento sobre la última vez que vivieron el problema.</p>
    <hr /><div className="validation-section-heading"><h2>Hipótesis</h2><span>{hypotheses.filter(n => hypothesisValidated(project, n.id)).length} de 3</span></div>
    <div className="validation-checklist">{hypotheses.map((note, i) => {
      const item = project.document.validation?.find(p => p.hypothesisId === note.id), counts = validationCounts(item), validated = hypothesisValidated(project, note.id), rejected = hypothesisRejected(project, note.id)
      return <button key={note.id} className={`validation-check-item ${validated ? 'validated' : rejected ? 'rejected' : ''}`} onClick={() => onOpen(note.id)}>
        {validated || rejected ? <HypothesisResult validated={validated} /> : <span className="validation-check" aria-hidden="true">{i + 1}</span>}
        <span className="validation-item-text"><strong>{note.body}</strong><small>{validated ? 'Validada' : rejected ? 'No validada' : 'Por contrastar'} · {counts.surveys} encuesta{counts.surveys === 1 ? '' : 's'} · {counts.interviews} entrevista{counts.interviews === 1 ? '' : 's'}</small></span><ArrowRight size={15} />
      </button>
    })}</div>
    {canExplore(project) && <button className="primary validation-continue" disabled={Boolean(busy)} onClick={() => void onAction({ action: 'phase', phase: 'explore' })}>Continuar a Explore<ArrowRight size={15} /></button>}
  </div>
}

function ValidationGauge({ percent }: { percent: number }) {
  return <div className="validation-gauge" role="meter" aria-label="Avance de validación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
    <svg viewBox="0 0 240 155" aria-hidden="true"><defs><linearGradient id="validation-gradient"><stop stopColor="#a9bb9c" /><stop offset="1" stopColor="#41684a" /></linearGradient></defs>
      <path d="M 25 112 A 95 95 0 0 1 215 112" className="gauge-track" pathLength="100" />
      <path d="M 25 112 A 95 95 0 0 1 215 112" className="gauge-fill" pathLength="100" strokeDasharray={`${percent} 100`} />
      <text x="120" y="86" textAnchor="middle" className="gauge-number">{percent}<tspan>%</tspan></text><text x="22" y="139" className="gauge-label">0</text><text x="218" y="139" textAnchor="end" className="gauge-label">100</text>
    </svg>
  </div>
}

function HypothesisValidation({ plan, project, busy, onAction, onBack, onSelect }: { plan: ValidationPlan; project: Project; busy: string; onAction: Action; onBack: () => void; onSelect: (id: string) => void }) {
  const [tab, setTab] = useState<'survey' | 'interview' | 'results'>('survey'), [copied, setCopied] = useState(false)
  const note = project.document.nodes.find(n => n.id === plan.hypothesisId)!, counts = validationCounts(plan), validated = hypothesisValidated(project, plan.hypothesisId)
  const rejected = hypothesisRejected(project, plan.hypothesisId), assessment = currentAssessment(project, plan)
  const canValidate = assessment?.verdict === 'supports' && counts.surveys > 0 && counts.interviews > 0
  const ready = plan.instrumentStatus === 'ready' && plan.instrumentVersion >= 3
  const hasInsight = project.document.nodes.some(n => plan.insightIds?.includes(n.id) && n.discovery)
  const url = `${window.location.origin}/s/${plan.survey.token}`
  return <div className="hypothesis-validation">
    <button className="text-button" onClick={onBack}><ArrowLeft size={14} />Hipótesis</button>
    {(validated || rejected) && <HypothesisResult validated={validated} />}
    <div className="validation-detail-heading"><span className="eyebrow">{note.title}</span><button className="text-button" onClick={() => onSelect(note.id)}>Editar nota<ArrowRight size={12} /></button></div>
    <h2>{note.body}</h2><details className="validation-criterion"><summary>Qué vamos a contrastar</summary><p>{plan.criterion}</p></details>
    <div className="validation-tabs" role="tablist" aria-label="Validación">{([['survey', 'Encuesta'], ['interview', 'Entrevistas'], ['results', 'Resultados']] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {!ready && tab !== 'results' && <section className="validation-assessment"><h3>Instrumentos pendientes de generación</h3><p>{plan.instrumentError ?? 'La IA debe preparar preguntas específicas para esta hipótesis antes de compartir la encuesta o realizar entrevistas.'}</p><button disabled={Boolean(busy)} onClick={() => void onAction({ action: 'generate-validation', hypothesisId: plan.hypothesisId })}>{busy ? 'Generando y revisando…' : 'Generar con IA'}</button></section>}
    {ready && tab === 'survey' && <><div className="survey-share"><label>Link público<input readOnly value={url} onFocus={e => e.target.select()} /></label><div><button onClick={() => void navigator.clipboard.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000) }).catch(() => setCopied(false))}><Copy size={13} />{copied ? 'Copiado' : 'Copiar'}</button><a href={url} target="_blank" rel="noreferrer">Abrir encuesta ↗</a></div></div><SurveyEditor key={plan.survey.version} plan={plan} busy={busy} onAction={onAction} /></>}
    {ready && tab === 'interview' && <InterviewEditor key={`${plan.epoch}-${plan.survey.version}`} plan={plan} busy={busy} onAction={onAction} />}
    {tab === 'results' && <ValidationResults plan={plan} project={project} onSelect={onSelect} />}
    <div className="validation-review"><div><span className={counts.surveys ? 'complete' : ''}>{counts.surveys ? <Check size={13} /> : <ClipboardList size={13} />}{counts.surveys} encuesta{counts.surveys === 1 ? '' : 's'}</span><span className={counts.interviews ? 'complete' : ''}>{counts.interviews ? <Check size={13} /> : <Mic size={13} />}{counts.interviews} entrevista{counts.interviews === 1 ? '' : 's'}</span></div>
      <section className={`validation-assessment ${assessment?.verdict ?? 'pending'}`} aria-live="polite"><span className="eyebrow">EVALUACIÓN DE LA IA</span><h3>{assessment?.verdict === 'supports' ? 'Los insights permiten validarla.' : assessment?.verdict === 'contradicts' ? 'La evidencia contradice la hipótesis.' : assessment ? 'Todavía no hay evidencia suficiente.' : 'Evaluación pendiente.'}</h3><p>{assessment?.reason ?? plan.assessmentError ?? 'La IA evalúa las respuestas, las entrevistas y los insights para determinar si esta hipótesis se puede validar.'}</p></section>
      {canValidate ? <button className="validation-approve validated" disabled={Boolean(busy) || validated} onClick={() => void onAction({ action: 'validate-hypothesis', hypothesisId: plan.hypothesisId, validated: true })}><Check size={19} />{validated ? 'Hipótesis validada' : 'Validar hipótesis'}</button>
        : assessment && assessment.verdict !== 'supports' && (hasInsight || assessment.verdict === 'contradicts') && <button className="validation-approve rejected" disabled={Boolean(busy) || rejected} onClick={() => void onAction({ action: 'validate-hypothesis', hypothesisId: plan.hypothesisId, validated: false })}><X size={19} />{rejected ? 'Hipótesis no validada' : 'No validar'}</button>}
      {ready && Boolean(counts.surveys || counts.interviews || plan.survey.responses.length) && <button className="text-button validation-reassess" disabled={Boolean(busy)} onClick={() => void onAction({ action: 'assess-hypothesis', hypothesisId: plan.hypothesisId })}>{busy ? 'Evaluando…' : assessment ? 'Reevaluar con IA' : 'Evaluar con IA'}</button>}
      <p>Validar requiere una evaluación favorable de la IA, al menos una respuesta a la encuesta actual y una entrevista. La nueva evidencia vuelve a evaluar el resultado.</p>
    </div>
  </div>
}

function HypothesisResult({ validated }: { validated: boolean }) {
  return <span className={`hypothesis-result ${validated ? 'validated' : 'rejected'}`} role="img" aria-label={validated ? 'Hipótesis validada' : 'Hipótesis no validada'}>{validated ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}</span>
}

function SurveyEditor({ plan, busy, onAction }: { plan: ValidationPlan; busy: string; onAction: Action }) {
  const [draft, setDraft] = useState<SurveyDraft>({ title: plan.survey.title, intro: plan.survey.intro, questions: structuredClone(plan.survey.questions) })
  const changed = JSON.stringify(draft) !== JSON.stringify({ title: plan.survey.title, intro: plan.survey.intro, questions: plan.survey.questions })
  function update(index: number, value: Partial<SurveyQuestion>) { setDraft(d => ({ ...d, questions: d.questions.map((q, i) => i === index ? { ...q, ...value } : q) })) }
  const invalid = draft.questions.some(q => !q.prompt.trim() || ((q.type === 'single' || q.type === 'multiple') && (q.options.filter(o => o.trim()).length < 2 || new Set(q.options).size !== q.options.length)))
  return <form className="editor-form survey-editor" onSubmit={e => { e.preventDefault(); void onAction({ action: 'survey', hypothesisId: plan.hypothesisId, survey: draft }) }}>
    <label>Título<input required maxLength={180} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></label>
    <label>Introducción<textarea maxLength={1000} rows={3} value={draft.intro} onChange={e => setDraft(d => ({ ...d, intro: e.target.value }))} /></label>
    {draft.questions.map((q, i) => <fieldset className="survey-question-editor" key={q.id}><legend>Pregunta {i + 1}</legend><label>Pregunta<textarea required rows={2} maxLength={600} value={q.prompt} onChange={e => update(i, { prompt: e.target.value })} /></label><label>Tipo<select value={q.type} onChange={e => { const type = e.target.value as SurveyQuestion['type']; update(i, { type, required: type === 'text' ? false : q.required, options: type === 'single' || type === 'multiple' ? q.options : [] }) }}><option value="single">Selección única</option><option value="multiple">Checklist · varias opciones</option><option value="scale">Escala · 1 a 5</option><option value="text">Respuesta abierta · opcional</option></select></label>
      {(q.type === 'single' || q.type === 'multiple') && <label>Opciones · una por línea<textarea required rows={Math.max(3, q.options.length)} value={q.options.join('\n')} onChange={e => update(i, { options: e.target.value.split('\n') })} /></label>}
      <div className="survey-question-actions"><button type="button" className={`choice-toggle ${q.required ? 'chosen' : ''}`} disabled={q.type === 'text'} aria-pressed={q.required} onClick={() => update(i, { required: !q.required })}>{q.required ? 'Obligatoria' : 'Opcional'}</button><button type="button" className="icon-button" aria-label={`Eliminar pregunta ${i + 1}`} disabled={draft.questions.length <= 2} onClick={() => setDraft(d => ({ ...d, questions: d.questions.filter((_, j) => i !== j) }))}><Trash2 size={14} /></button></div>
    </fieldset>)}
    <button type="button" disabled={draft.questions.length >= 10 || Boolean(busy)} onClick={() => setDraft(d => ({ ...d, questions: [...d.questions, { id: crypto.randomUUID(), prompt: '', type: 'text', required: false, options: [] }] }))}><Plus size={14} />Agregar pregunta</button>
    {plan.survey.responses.length > 0 && changed && <p className="input-hint">Guardar crea una nueva versión. Las respuestas anteriores se conservan en Resultados; necesitás una respuesta a la versión nueva para validar.</p>}
    <button className="primary" disabled={Boolean(busy) || !changed || invalid || !draft.title.trim()}>Guardar encuesta</button>
  </form>
}

function InterviewEditor({ plan, busy, onAction }: { plan: ValidationPlan; busy: string; onAction: Action }) {
  const [person, setPerson] = useState(''), [transcript, setTranscript] = useState(''), [editingGuide, setEditingGuide] = useState(false), [recording, setRecording] = useState(false)
  const [guide, setGuide] = useState(plan.interview)
  return <div className="interview-editor"><div className="interview-guide"><div className="validation-section-heading"><h3>Guía de entrevista</h3><button className="text-button" disabled={Boolean(busy)} onClick={() => setEditingGuide(v => !v)}>{editingGuide ? 'Cerrar edición' : 'Editar'}</button></div>
    {editingGuide ? <form className="editor-form" onSubmit={e => { e.preventDefault(); void onAction({ action: 'interview-guide', hypothesisId: plan.hypothesisId, ...guide }).then(result => { if (result) setEditingGuide(false) }) }}><label>Introducción<textarea maxLength={1000} value={guide.intro} onChange={e => setGuide(g => ({ ...g, intro: e.target.value }))} /></label>{guide.questions.map((q, i) => <label key={i}>Pregunta {i + 1}<textarea required maxLength={600} rows={2} value={q} onChange={e => setGuide(g => ({ ...g, questions: g.questions.map((p, j) => i === j ? e.target.value : p) }))} /></label>)}<button disabled={Boolean(busy) || guide.questions.some(q => !q.trim())}>Guardar guía</button></form> : <><p>{plan.interview.intro}</p><ol>{plan.interview.questions.map((q, i) => <li key={i}>{q}</li>)}</ol></>}
    </div><form className="editor-form" onSubmit={e => { e.preventDefault(); void onAction({ action: 'interview', hypothesisId: plan.hypothesisId, person, transcript }).then(result => { if (result) { setPerson(''); setTranscript('') } }) }}>
      <h3>Nueva persona entrevistada</h3><label>¿A quién entrevistás?<textarea required minLength={3} maxLength={1000} rows={3} value={person} onChange={e => setPerson(e.target.value)} placeholder="Nombre o alias, rol, contexto y por qué pertenece al segmento…" /></label>
      <InterviewRecorder disabled={Boolean(busy)} onRecording={setRecording} onTranscript={text => setTranscript(t => `${t}${t ? '\n' : ''}${text}`.slice(0, 30000))} />
      <label>Transcripción · podés corregirla<textarea required minLength={20} maxLength={30000} rows={10} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Grabá con el micrófono o escribí la conversación. Conservá los hechos y las palabras de la persona." /></label>
      <button className="primary" disabled={Boolean(busy) || recording || person.trim().length < 3 || transcript.trim().length < 20}>Guardar entrevista y actualizar insights<ArrowRight size={14} /></button>
    </form></div>
}

interface SpeechResultEvent { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; 0: { transcript: string } } } }
interface Recognition { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: SpeechResultEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort: () => void }
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

function InterviewRecorder({ disabled, onTranscript, onRecording }: { disabled: boolean; onTranscript: (text: string) => void; onRecording: (recording: boolean) => void }) {
  const [recording, setRecording] = useState(false), [starting, setStarting] = useState(false), [error, setError] = useState(''), [interim, setInterim] = useState(''), [audio, setAudio] = useState('')
  const recognition = useRef<Recognition | null>(null), recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), audioRef = useRef(''), active = useRef(false), mounted = useRef(true), callback = useRef(onTranscript)
  useEffect(() => { callback.current = onTranscript }, [onTranscript])
  const speech = window as SpeechWindow, Engine = speech.SpeechRecognition ?? speech.webkitSpeechRecognition
  function stop() { active.current = false; recognition.current?.stop(); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); setRecording(false); onRecording(false); setInterim('') }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current = false; if (recognition.current) { recognition.current.onend = null; recognition.current.abort() } if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); if (audioRef.current) URL.revokeObjectURL(audioRef.current) } }, [])
  async function start() {
    if (starting || recording || disabled) return
    setStarting(true); setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Este navegador no permite grabar audio. Podés escribir o pegar la entrevista.')
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) { media.getTracks().forEach(t => t.stop()); return }
      stream.current = media
      const chunks: BlobPart[] = [], capture = new MediaRecorder(media); recorder.current = capture
      capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      capture.onstop = () => { if (!mounted.current) return; if (audioRef.current) URL.revokeObjectURL(audioRef.current); audioRef.current = URL.createObjectURL(new Blob(chunks, { type: capture.mimeType })); setAudio(audioRef.current) }
      capture.start(); active.current = true; setRecording(true); onRecording(true)
      if (Engine) {
        const engine = new Engine(); recognition.current = engine; engine.lang = 'es-AR'; engine.continuous = true; engine.interimResults = true
        engine.onresult = event => { let pending = ''; for (let i = event.resultIndex; i < event.results.length; i++) { const r = event.results[i]; if (r.isFinal) callback.current(r[0].transcript); else pending += r[0].transcript } setInterim(pending) }
        engine.onerror = event => { if (event.error !== 'no-speech') { setError(`La transcripción se interrumpió (${event.error}). El audio sigue grabándose; podés completar el texto.`); engine.onend = null } }
        engine.onend = () => { if (active.current) { try { engine.start() } catch { setError('La transcripción se detuvo. Podés continuar escribiendo.') } } }
        try { engine.start() } catch { setError('No se pudo iniciar la transcripción. El audio sigue grabándose.') }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos acceder al micrófono.'); stop() }
    finally { if (mounted.current) setStarting(false) }
  }
  return <div className="interview-recorder"><button type="button" className={recording ? 'recording' : ''} disabled={disabled || starting} onClick={() => recording ? stop() : void start()}>{recording ? <Square size={14} /> : <Mic size={15} />}{starting ? 'Abriendo micrófono…' : recording ? 'Detener grabación' : 'Grabar entrevista'}</button>
    <p className="input-hint">{Engine ? 'Transcripción en vivo con el reconocimiento de voz del navegador. ' : 'Este navegador no ofrece transcripción en vivo. Grabá el audio y completá el texto manualmente. '}El audio queda en este dispositivo; guardamos la transcripción.</p>
    {interim && <p className="interim-transcript" aria-live="polite">{interim}</p>}{error && <p role="alert" className="recorder-error">{error}</p>}
    {audio && <div className="interview-audio"><audio controls src={audio} /><a href={audio} download="entrevista.webm">Descargar grabación</a></div>}
  </div>
}

function ValidationResults({ plan, project, onSelect }: { plan: ValidationPlan; project: Project; onSelect: (id: string) => void }) {
  const insights = project.document.nodes.filter(n => plan.insightIds?.includes(n.id) && n.discovery)
  const responses = [...plan.survey.responses].reverse(), interviews = [...plan.interviews].reverse()
  return <div className="validation-results">{insights.map(insight => <section key={insight.id} className="validation-insight"><h3>{insight.title}</h3><div className="discovery-sections"><section><h4>Observación</h4><p>{insight.discovery!.observation}</p></section><section><h4>Insight</h4><p>{insight.discovery!.insight}</p></section><section><h4>Oportunidad (HMW)</h4><p>{insight.discovery!.opportunity}</p></section></div><button className="text-button" onClick={() => onSelect(insight.id)}>Ver nota en el grafo<ArrowRight size={13} /></button></section>)}
    <h3>Encuestas · {responses.length}</h3>{!responses.length && <p className="quiet">Compartí el link para recibir la primera respuesta.</p>}
    {responses.map(r => <details key={r.id} className="response-card"><summary>{new Date(r.at).toLocaleString('es-AR')} · v{r.version}{r.version !== plan.survey.version || r.epoch !== plan.epoch ? ' · Contexto anterior' : ''}</summary><dl>{r.questions.map(q => <div key={q.id}><dt>{q.prompt}</dt><dd>{Array.isArray(r.answers[q.id]) ? (r.answers[q.id] as string[]).join(', ') : r.answers[q.id] ?? 'Sin respuesta'}</dd></div>)}</dl></details>)}
    <h3>Personas entrevistadas · {interviews.length}</h3>{!interviews.length && <p className="quiet">Todavía no guardaste entrevistas.</p>}{interviews.map(r => <details key={r.id} className="response-card"><summary>{r.person} · {new Date(r.at).toLocaleDateString('es-AR')}{r.epoch !== plan.epoch ? ' · Contexto anterior' : ''}</summary><p>{r.transcript}</p></details>)}
  </div>
}
