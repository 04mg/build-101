import { ArrowRight, Check, Flag, X } from 'lucide-react'
import { artifacts, getSteps, phasePercent, phases } from './phases'
import { chosenSolution, hypothesisValidated, validationCounts, type DeliverableKey, type PhaseId, type Project } from './types'

type MilestoneState = 'done' | 'progress' | 'open' | 'failed'
interface Milestone { id: string; label: string; state: MilestoneState; word: string; detail?: string }

// Each phase shows the milestones that move its percentage, with their state in
// words and color. Labels stay short so the three columns line up.
function milestones(project: Project | null, phase: PhaseId): Milestone[] {
  const doc = project?.document
  if (phase === 'discover') {
    const hypotheses = doc?.nodes.filter(n => n.kind === 'hypothesis') ?? []
    return [
      { id: 'problem', label: 'Problema', state: doc?.confirmed ? 'done' : doc ? 'progress' : 'open', word: doc?.confirmed ? 'Confirmado' : doc ? 'En definición' : 'Pendiente', detail: doc?.nodes.find(n => n.id === 'problem')?.body },
      ...[0, 1, 2].map((i): Milestone => {
        const note = hypotheses[i], plan = doc?.validation?.find(p => p.hypothesisId === note?.id), counts = validationCounts(plan)
        const label = `Hipótesis 0${i + 1}`
        if (!project || !note) return { id: `h-${i}`, label, state: 'open', word: 'Pendiente' }
        if (hypothesisValidated(project, note.id)) return { id: note.id, label, state: 'done', word: 'Validada', detail: note.body }
        if (plan?.rejectedAt) return { id: note.id, label, state: 'failed', word: 'No validada', detail: note.body }
        if (counts.surveys || counts.interviews) return { id: note.id, label, state: 'progress', word: `En validación · ${counts.surveys}E ${counts.interviews}I`, detail: note.body }
        return { id: note.id, label, state: 'open', word: 'Por contrastar', detail: note.body }
      }),
    ]
  }
  const deliverable = (key: DeliverableKey): Milestone => {
    const note = doc?.nodes.find(n => n.id === `deliverable-${key}`)
    return { id: key, label: artifacts[key].title, state: note?.status === 'done' ? 'done' : note ? 'progress' : 'open', word: note?.status === 'done' ? 'Aprobado' : note ? 'Borrador' : 'Pendiente' }
  }
  if (phase === 'explore') {
    const chosen = chosenSolution(project)
    return [
      { id: 'choice', label: 'Solución elegida', state: chosen ? 'done' : doc?.explore?.rows.length ? 'progress' : 'open', word: chosen ? 'Elegida' : doc?.explore?.rows.length ? 'Comparando' : 'Pendiente' },
      ...(['solution-concept', 'value-proposition', 'critical-assumptions'] as const).map(deliverable),
    ]
  }
  return getSteps(project, 'prototype').map(step => ({ id: step.id, label: step.id === 'landing' ? 'Landing' : step.title.replace(' de la landing', ''), state: step.done ? 'done' : 'open', word: step.done ? (step.id === 'landing' ? 'Publicada' : 'Decidida') : 'Pendiente' }))
}

export function Timeline({ project, onPhase, onStart, busy }: {
  project: Project | null; onPhase: (phase: PhaseId) => void; onArtifact: (key: DeliverableKey) => void; onStart: () => void; busy: boolean;
}) {
  const current = project?.document.activePhase ?? 'discover'
  const idea = project?.document.answers[0]?.value ?? project?.name
  return <div className="page-scroll"><div className="page-content timeline-page">
    <div className="timeline-heading"><h1>Tu recorrido</h1><p>{idea ?? 'Un problema claro. Evidencia real. Una solución que vale la pena probar.'}</p>
      {!project && <button className="primary" disabled={busy} onClick={onStart}>Empezar una idea<ArrowRight size={15} /></button>}</div>
    <section className="timeline-card card" aria-label="Recorrido Discover, Explore y Prototype"><div className="phase-timeline">
      {phases.map((phase, i) => {
        const percent = phasePercent(project, phase.id), completed = percent === 100, active = current === phase.id
        const items = milestones(project, phase.id)
        return <div key={phase.id} className={`timeline-column ${active ? 'current' : ''}`}>
          <button className="timeline-column-title" disabled={busy} onClick={() => onPhase(phase.id)}><strong>{phase.name}</strong><span>{completed ? 'Ciclo completado' : active ? 'En curso' : 'Por explorar'}</span></button>
          <div className="timeline-node-row"><span className={`timeline-spine left ${i === 0 ? 'hidden-spine' : ''} ${phasePercent(project, phases[Math.max(0, i - 1)].id) === 100 ? 'complete' : ''}`} /><span className={`timeline-spine right ${i === 2 ? 'hidden-spine' : ''} ${completed ? 'complete' : ''}`} />
            <button className={`timeline-node ${completed ? 'complete' : active ? 'current' : ''}`} disabled={busy} onClick={() => onPhase(phase.id)} aria-label={`Abrir ${phase.name}: ${percent}%`}>{completed ? <Check size={24} /> : i === 2 ? <Flag size={23} /> : <span>{i + 1}</span>}</button>
            {active && <span className="you-are-here">Estás acá</span>}
          </div>
          <p className="timeline-question">{phase.question}</p>
          <ul className="timeline-milestones">{items.map(item => <li key={item.id} className={`timeline-milestone ${item.state}`} title={item.detail}>
            <span className="milestone-mark" aria-hidden="true">{item.state === 'done' ? <Check size={11} /> : item.state === 'failed' ? <X size={11} /> : null}</span>
            <span className="milestone-label">{item.label}</span><span className="milestone-state">{item.word}</span>
          </li>)}</ul>
          <div className="timeline-phase-progress"><div className="thin-track"><span style={{ width: `${percent}%` }} /></div><button disabled={busy} onClick={() => onPhase(phase.id)}><strong>{percent}%</strong><span>{items.filter(m => m.state === 'done').length}/{items.length} hitos</span><ArrowRight size={14} /></button></div>
        </div>
      })}
    </div></section>
    <div className="timeline-legend"><span><i className="legend-dot supported" />Logrado</span><span><i className="legend-dot progress" />En curso</span><span><i className="legend-dot open" />Pendiente</span><span><i className="legend-dot failed" />No validada</span></div>
  </div></div>
}
