import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowUp, Check, CircleDashed, Copy, Download, ExternalLink, LoaderCircle, Monitor, Smartphone, X } from 'lucide-react'
import { getLandingStats } from './api'
import { artifacts, phasePercent } from './phases'
import { deliverablesMarkdown, downloadMarkdown } from './exportMarkdown'
import { chosenSolution, type DeliverableKey, type LandingHypothesis, type LandingStats, type Project } from './types'
import { HypothesisResult, ValidationGauge } from './ValidationWorkspace'

type Action = (action: Record<string, unknown>) => Promise<Project | null>
const prototypeKeys = ['prototype', 'experiment-results', 'learnings'] as const

// Prototype: one landing that sells the chosen solution, iterated by chat,
// and three hypotheses that its visits and leads can support or contradict.
export function PrototypeWorkspace({ project, busy, onAction, onArtifact }: { project: Project; busy: string; onAction: Action; onArtifact: (key: DeliverableKey) => void }) {
  const p = project.document.prototype, solution = chosenSolution(project)
  const live = p.hasLanding && p.solutionId === project.document.explore.chosenId
  const [stats, setStats] = useState<LandingStats>({ visits: 0, leads: [] }), [active, setActive] = useState<string | null>(null)
  const url = p.token ? `${window.location.origin}/l/${p.token}` : ''
  const statsKey = `${stats.visits}:${stats.leads.length}`
  useEffect(() => {
    if (!p.token) return
    let alive = true
    const load = () => { if (document.visibilityState !== 'hidden') getLandingStats(project.id, AbortSignal.timeout(15000)).then(next => { if (alive) setStats(next) }).catch(() => { /* Keep the last counts. */ }) }
    load(); const timer = window.setInterval(load, 6000)
    return () => { alive = false; clearInterval(timer) }
  }, [project.id, p.token, p.version])
  const hypothesis = p.hypotheses.find(h => h.id === active)
  function exportReport() {
    const metrics = `## Métricas\n\n- Visitas: ${stats.visits}\n- Leads: ${stats.leads.length}\n- Conversión: ${conversion(stats)}`
    const verdicts = p.hypotheses.length ? `## Hipótesis de la landing\n\n${p.hypotheses.map((h, i) => `${i + 1}. ${h.statement}\n   Criterio: ${h.criterion}\n   Resultado: ${h.decision === 'validated' ? 'Validada' : h.decision === 'rejected' ? 'No validada' : 'Por decidir'}${h.assessment ? ` · ${h.assessment.reason}` : ''}`).join('\n')}` : ''
    downloadMarkdown(`prototype-${project.id}.md`, deliverablesMarkdown(project, 'Prototype', [...prototypeKeys], [`**Landing:** ${url}`, metrics, verdicts]))
  }
  return <div className="define-layout validation-layout">
    <aside className="validation-sidebar" aria-label="Prototype">{hypothesis ? <HypothesisDetail key={hypothesis.id} hypothesis={hypothesis} index={p.hypotheses.indexOf(hypothesis)} statsKey={statsKey} hasData={Boolean(stats.visits || stats.leads.length)} busy={busy} onAction={onAction} onBack={() => setActive(null)} />
      : <div className="validation-home">
        <h1>Probalo con una landing.</h1>
        <ValidationGauge percent={phasePercent(project, 'prototype')} label="Avance de Prototype" />
        {live ? <ShareLink url={url} /> : <p className="validation-intro">Una página que vende {solution?.name ?? 'tu solución'} y junta interesados reales.</p>}
        {live && <div className="landing-metrics"><div><strong>{stats.visits}</strong><span>Visitas</span></div><div><strong>{stats.leads.length}</strong><span>Leads</span></div><div><strong>{conversion(stats)}</strong><span>Conversión</span></div></div>}
        {p.hypotheses.length > 0 && <><hr /><div className="validation-section-heading"><h2>Hipótesis</h2><span>{p.hypotheses.filter(h => h.decision).length} de {p.hypotheses.length}</span></div>
          <div className="validation-checklist">{p.hypotheses.map((h, i) => <button key={h.id} className={`validation-check-item ${h.decision ?? ''}`} onClick={() => setActive(h.id)}>
            {h.decision ? <HypothesisResult validated={h.decision === 'validated'} /> : <span className="validation-check" aria-hidden="true">{i + 1}</span>}
            <span className="validation-item-text"><strong>{h.statement}</strong>{!h.decision && <span className="note-badge pending"><CircleDashed size={12} strokeWidth={2.4} aria-hidden="true" />Por contrastar</span>}</span><ArrowRight size={15} />
          </button>)}</div></>}
        {live && <><hr /><div className="validation-section-heading"><h2>Leads</h2><span>{stats.leads.length}</span></div>
          {!stats.leads.length ? <p className="quiet landing-empty">Compartí el link con personas del segmento.</p> : <div className="lead-list">{stats.leads.slice(0, 50).map(lead => <details key={lead.id} className="response-card"><summary>{lead.fields.nombre ? `${lead.fields.nombre} · ` : ''}{lead.fields.email}</summary><dl>{Object.entries(lead.fields).filter(([k]) => k !== 'email' && k !== 'nombre').map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}<div><dt>Fecha</dt><dd>{new Date(lead.at).toLocaleString('es-AR')}</dd></div></dl></details>)}</div>}</>}
        {live && <><hr /><div className="validation-section-heading"><h2>Entregables</h2></div>
          <div className="validation-checklist">{prototypeKeys.map(key => {
            const note = project.document.nodes.find(n => n.id === `deliverable-${key}`)
            return <button key={key} className={`validation-check-item ${note?.status === 'done' ? 'validated' : ''}`} disabled={Boolean(busy)} onClick={() => onArtifact(key)}>
              <span className="validation-check" aria-hidden="true">{note?.status === 'done' ? <Check size={14} strokeWidth={3} /> : '·'}</span>
              <span className="validation-item-text"><strong>{artifacts[key].title}</strong><small>{note?.status === 'done' ? 'Aprobado' : note ? 'Borrador' : 'Preparalo con IA'}</small></span><ArrowRight size={15} />
            </button>
          })}</div>
          <button className="text-button phase-export" onClick={exportReport}><Download size={13} />Descargar entregable (.md)</button></>}
      </div>}
    </aside>
    <section className="phase-main landing-stage" aria-label="Landing">
      <LandingPreview project={project} url={url} live={live} busy={busy} onAction={onAction} />
    </section>
  </div>
}

function conversion(stats: LandingStats) { return stats.visits ? `${Math.round(stats.leads.length / stats.visits * 100)}%` : '—' }

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return <div className="survey-share landing-share"><label>Link público<input readOnly value={url} onFocus={e => e.target.select()} /></label><div>
    <button onClick={() => void navigator.clipboard.writeText(url).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000) }).catch(() => setCopied(false))}><Copy size={13} />{copied ? 'Copiado' : 'Copiar'}</button>
    <a href={url} target="_blank" rel="noreferrer">Abrir landing ↗</a></div></div>
}

function HypothesisDetail({ hypothesis, index, statsKey, hasData, busy, onAction, onBack }: { hypothesis: LandingHypothesis; index: number; statsKey: string; hasData: boolean; busy: string; onAction: Action; onBack: () => void }) {
  const assessment = hypothesis.assessment?.statsKey === statsKey ? hypothesis.assessment : null
  return <div className="hypothesis-validation">
    <button className="text-button" onClick={onBack}><ArrowLeft size={14} />Hipótesis</button>
    {hypothesis.decision && <HypothesisResult validated={hypothesis.decision === 'validated'} />}
    <div className="validation-detail-heading"><span className="quiet">Hipótesis 0{index + 1}</span></div>
    <h2>{hypothesis.statement}</h2>
    <dl className="landing-criterion"><div><dt>Señal</dt><dd>{hypothesis.signal}</dd></div><div><dt>Criterio previo</dt><dd>{hypothesis.criterion}</dd></div></dl>
    <div className="validation-review">
      <section className={`validation-assessment ${assessment?.verdict ?? 'pending'}`} aria-live="polite"><h3>{assessment?.verdict === 'supports' ? 'Los datos la apoyan.' : assessment?.verdict === 'contradicts' ? 'Los datos la contradicen.' : assessment ? 'Todavía no alcanza la muestra.' : hypothesis.assessment ? 'Llegaron datos nuevos.' : 'Sin evaluar.'}</h3>
        <p>{assessment?.reason ?? (hasData ? 'Evaluá con IA las visitas, los leads y las respuestas contra el criterio.' : 'Compartí el link para empezar a juntar datos.')}</p></section>
      {assessment?.verdict === 'supports' ? <button className="validation-approve validated" disabled={Boolean(busy) || hypothesis.decision === 'validated'} onClick={() => void onAction({ action: 'landing-decide', hypothesisId: hypothesis.id, validated: true })}><Check size={19} />{hypothesis.decision === 'validated' ? 'Hipótesis validada' : 'Validar hipótesis'}</button>
        : assessment?.verdict === 'contradicts' && <button className="validation-approve rejected" disabled={Boolean(busy) || hypothesis.decision === 'rejected'} onClick={() => void onAction({ action: 'landing-decide', hypothesisId: hypothesis.id, validated: false })}><X size={19} />{hypothesis.decision === 'rejected' ? 'Hipótesis no validada' : 'No validar'}</button>}
      {hasData && <button className="text-button validation-reassess" disabled={Boolean(busy)} onClick={() => void onAction({ action: 'landing-assess', hypothesisId: hypothesis.id })}>{busy ? 'Evaluando…' : assessment ? 'Reevaluar con IA' : 'Evaluar con IA'}</button>}
    </div>
  </div>
}

function LandingPreview({ project, url, live, busy, onAction }: { project: Project; url: string; live: boolean; busy: string; onAction: Action }) {
  const p = project.document.prototype, solution = chosenSolution(project), running = p.status === 'running'
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop'), [message, setMessage] = useState('')
  const thread = useRef<HTMLDivElement>(null)
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }) }, [p.chat.length, running])
  async function send(event?: FormEvent) {
    event?.preventDefault()
    const text = message.trim()
    if (!text || busy || running) return
    if (await onAction({ action: 'landing', message: text, origin: window.location.origin })) setMessage('')
  }
  if (!live) return <div className="phase-empty-state">
    {running ? <><LoaderCircle className="spin" size={22} /><h2>Diseñando tu landing…</h2><p>Claude Sonnet escribe y diseña la página. Tarda un par de minutos.</p></>
      : <><h2>Una landing para {solution?.name ?? 'tu solución'}.</h2><p>Vende la propuesta y pregunta lo justo para contrastar tus hipótesis.</p>
        {p.error && <p className="inline-error" role="alert">{p.error}</p>}
        <button className="primary" disabled={Boolean(busy)} onClick={() => void onAction({ action: 'landing', origin: window.location.origin })}>Generar landing<ArrowRight size={14} /></button></>}
  </div>
  return <>
    <div className="landing-toolbar"><div className="segmented" role="group" aria-label="Vista previa">
      <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor size={14} />Escritorio</button>
      <button aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone size={14} />Móvil</button>
    </div><span className="quiet">Versión {p.version}</span><a className="landing-open" href={url} target="_blank" rel="noreferrer"><ExternalLink size={13} />Abrir</a></div>
    <div className={`landing-frame ${device} ${running ? 'updating' : ''}`}><iframe key={p.version} title="Vista previa de la landing" src={`${url}?preview=1`} sandbox="allow-scripts allow-forms" /></div>
    <div className="landing-chat">
      {(p.chat.length > 0 || running) && <div className="landing-chat-thread" ref={thread}>
        {p.chat.slice(-8).map((m, i) => <p key={i} className={`chat-bubble ${m.role === 'founder' ? 'user' : 'agent'}`}>{m.text}</p>)}
        {running && <p className="chat-bubble agent typing"><LoaderCircle className="spin" size={13} />Aplicando cambios…</p>}
        {p.status === 'error' && p.error && <p className="inline-error" role="alert">{p.error}</p>}
      </div>}
      <form className="chat-composer" onSubmit={event => void send(event)}>
        <textarea rows={1} value={message} maxLength={1500} disabled={running} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} placeholder="Pedile un cambio a la landing: otro titular, más corta, otra pregunta…" aria-label="Pedido para la landing" />
        <button type="submit" className="primary icon-send" disabled={!message.trim() || Boolean(busy) || running} aria-label="Enviar pedido"><ArrowUp size={16} /></button>
      </form>
    </div>
  </>
}
