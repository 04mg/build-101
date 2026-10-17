import { ArrowRight, Check, FileText, FlaskConical, Sparkles } from 'lucide-react'
import { artifacts, getSteps, phasePercent, phases } from './phases'
import type { DeliverableKey, PhaseId, Project } from './types'

export function PhaseWorkspace({ phase, project, busy, onArtifact, onTimeline, onPhase, onStart }: {
  phase: PhaseId; project: Project | null; busy: boolean; onArtifact: (key: DeliverableKey, instruction?: string) => void;
  onTimeline: () => void; onPhase: (phase: PhaseId) => void; onStart: () => void;
}) {
  const definition = phases.find(p => p.id === phase)!, index = phases.findIndex(p => p.id === phase)
  const entries = (Object.entries(artifacts) as [DeliverableKey, typeof artifacts[DeliverableKey]][]).filter(([, a]) => a.phase === phase)
  const required = entries.filter(([, a]) => !a.optional), optional = entries.filter(([, a]) => a.optional)
  const steps = getSteps(project, phase)
  return <div className="page-scroll"><div className="page-content phase-page"><div className="page-heading"><div><h1>{definition.name}</h1><p>{definition.question}</p></div><div className="phase-heading-actions"><button onClick={onTimeline}>Ver recorrido</button>{index < 2 && <button className="primary" disabled={busy} onClick={() => onPhase(phases[index + 1].id)}>Siguiente: {phases[index + 1].name}<ArrowRight size={14} /></button>}</div></div>
    {!project ? <section className="card phase-empty"><FlaskConical size={25} /><h2>Primero, una idea para explorar.</h2><p>Los entregables de {definition.name} se construyen con el contexto de tu proyecto.</p><button className="primary" onClick={onStart}>Empezar una idea<ArrowRight size={14} /></button></section> : <>
      <section className="phase-intro card"><div><span className="eyebrow">EL OBJETIVO</span><h2>{definition.description}</h2></div><div className="phase-intro-progress"><strong>{phasePercent(project, phase)}<span>%</span></strong><span>{steps.filter(s => s.done).length} de {steps.length} entregables aprobados</span><div className="thin-track"><span style={{ width: `${phasePercent(project, phase)}%` }} /></div></div></section>
      <div className="artifact-grid">{required.map(([key, artifact], i) => {
        const note = project.document.nodes.find(n => n.id === `deliverable-${key}`), approved = note?.status === 'done'
        return <section className="card artifact-card" key={key}><div className="artifact-card-top"><span className="artifact-number">0{i + 1}</span><span className={`artifact-status ${approved ? 'approved' : note ? 'draft' : ''}`}>{approved ? <><Check size={12} />Aprobado</> : note ? 'Borrador' : 'Por definir'}</span></div><FileText size={23} className="artifact-icon" /><h2>{artifact.title}</h2><p>{artifact.description}</p>{note && <div className="artifact-preview">{note.body}</div>}<button disabled={busy} onClick={() => onArtifact(key)}>{note ? 'Abrir entregable' : 'Empezar'}<ArrowRight size={14} /></button></section>
      })}</div>
      {optional.length > 0 && <section className="card optional-artifacts"><span className="eyebrow">PARA PENSAR MEJOR</span>{optional.map(([key, artifact]) => <button key={key} disabled={busy} onClick={() => onArtifact(key)}><div><h3>{artifact.title}</h3><p>{artifact.description}</p></div><ArrowRight size={16} /></button>)}</section>}
      {phase === 'prototype' && <section className="card prototype-methods"><div><span className="eyebrow">EL EXPERIMENTO MÁS CHICO POSIBLE</span><h2>Aprender antes de construir.</h2><p>Elegí el formato que mejor contraste tu supuesto crítico.</p></div><div>{['Landing', 'Mago de Oz', 'Fake Door'].map(method => <button key={method} disabled={busy} onClick={() => onArtifact('prototype', `Diseñá el experimento usando ${method}.`)}><Sparkles size={14} />{method}<ArrowRight size={14} /></button>)}</div></section>}
    </>}
  </div></div>
}
