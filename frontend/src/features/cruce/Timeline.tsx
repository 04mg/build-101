import { ArrowRight, Check, Flag, GitBranch } from 'lucide-react'
import { artifacts, getSteps, overallPercent, phasePercent, phases } from './phases'
import type { DeliverableKey, PhaseId, Project } from './types'

export function Timeline({ project, onPhase, onArtifact, onStart, busy }: {
  project: Project | null; onPhase: (phase: PhaseId) => void; onArtifact: (key: DeliverableKey) => void; onStart: () => void; busy: boolean;
}) {
  const allSteps = phases.flatMap(phase => getSteps(project, phase.id))
  const done = allSteps.filter(step => step.done).length
  const current = project?.document.activePhase ?? 'discover'
  const problem = project?.document.nodes.find(n => n.id === 'problem')
  return <div className="page-scroll"><div className="page-content timeline-page">
    <div className="page-heading"><div><span className="eyebrow">DE IDEA A PROYECTO</span><h1>Tu recorrido</h1><p>{problem?.body ?? 'Un problema claro. Evidencia real. Una solución que vale la pena probar.'}</p></div>
      <div className="overall-progress"><span><strong>{done} de {allSteps.length}</strong> pasos · {overallPercent(project)}%</span><div className="segmented-track" aria-hidden="true">{allSteps.map((step, i) => <span key={i} className={step.done ? 'filled' : ''} />)}</div></div>
    </div>
    <section className="timeline-card card" aria-label="Recorrido Discover, Explore y Prototype"><div className="phase-timeline">
      {phases.map((phase, i) => {
        const percent = phasePercent(project, phase.id), steps = getSteps(project, phase.id), completed = percent === 100
        const active = current === phase.id
        const primaryArtifacts = phase.id === 'discover' ? ['Problem Statement', 'Hipótesis', 'Evidence Board'] : (Object.values(artifacts).filter(a => a.phase === phase.id && !a.optional).map(a => a.title))
        const hypotheses = phase.id === 'discover' ? project?.document.nodes.filter(n => n.kind === 'hypothesis').slice(0, 2) ?? [] : []
        return <div key={phase.id} className={`timeline-column ${active ? 'current' : ''}`}>
          <button className="timeline-column-title" disabled={busy} onClick={() => onPhase(phase.id)}><strong>{phase.name}</strong><span>{completed ? 'Ciclo completado' : active ? 'En curso' : 'Por explorar'}</span></button>
          <div className="timeline-branches above"><span className="branch-stem" />{(hypotheses.length ? hypotheses.map(n => ({ label: n.body, state: n.status })) : primaryArtifacts.slice(0, 2).map(label => ({ label, state: steps.find(s => s.title === label)?.done ? 'supported' : 'open' }))).map((chip, index) => <button className={`timeline-chip ${chip.state}`} key={index} title={chip.label} disabled={busy} onClick={() => onPhase(phase.id)}><span />{chip.label}</button>)}</div>
          <div className="timeline-node-row"><span className={`timeline-spine left ${i === 0 ? 'hidden-spine' : ''} ${phasePercent(project, phases[Math.max(0, i - 1)].id) === 100 ? 'complete' : ''}`} /><span className={`timeline-spine right ${i === 2 ? 'hidden-spine' : ''} ${completed ? 'complete' : ''}`} />
            <button className={`timeline-node ${completed ? 'complete' : active ? 'current' : ''}`} disabled={busy} onClick={() => onPhase(phase.id)} aria-label={`Abrir ${phase.name}: ${percent}%`}>{completed ? <Check size={24} /> : i === 2 ? <Flag size={23} /> : <span>{i + 1}</span>}</button>
            {active && <span className="you-are-here">Estás acá</span>}
          </div>
          <div className="timeline-branches below"><span className="branch-stem" /><button className="timeline-chip dark" disabled={busy} onClick={() => onPhase(phase.id)}><span />{phase.id === 'discover' ? 'Enmarcar + validar' : phase.id === 'explore' ? 'Definir la solución' : 'Probar y aprender'}</button><span className="timeline-question">{phase.question}</span></div>
          <div className="timeline-phase-progress"><div className="thin-track"><span style={{ width: `${percent}%` }} /></div><button disabled={busy} onClick={() => onPhase(phase.id)}><strong>{percent}%</strong><span>{steps.filter(s => s.done).length}/{steps.length} pasos</span><ArrowRight size={14} /></button></div>
        </div>
      })}
    </div></section>
    <div className="timeline-legend"><span><i className="legend-dot supported" />Con evidencia de apoyo</span><span><i className="legend-dot open" />Por contrastar</span><span><i className="legend-dot dark" />Foco del proyecto</span></div>
    <div className="roadmap-detail-grid"><section className="card discover-description"><div className="card-heading"><div><span className="eyebrow">01 / DISCOVER</span><h2>Primero el problema. Después la solución.</h2></div></div><div className="discover-two-steps"><div><span className="step-number">01.1</span><h3>Discover & Frame Problem</h3><p>¿Qué problema queremos resolver y para quién?</p><div className="deliverable-pills"><button onClick={() => project ? onPhase('discover') : onStart()}>Problem Statement</button><button disabled={!project} onClick={() => onArtifact('customer-journey')}>Customer Journey <span>opcional</span></button><button onClick={() => project ? onPhase('discover') : onStart()}>Hipótesis</button></div></div><div><span className="step-number">01.2</span><h3>Validate Problem</h3><p>¿Existe evidencia de que es importante?</p><div className="deliverable-pills"><button disabled={!project} onClick={() => onPhase('discover')}>Evidence Board</button><button disabled={!project} onClick={() => onArtifact('interview-guide')}>Validation Experiments</button><button disabled={!project} onClick={() => onPhase('discover')}>Problem Verdict</button></div></div></div></section>
      <aside className="card next-move"><span className="eyebrow">TU PRÓXIMO MOVIMIENTO</span><div className="next-move-icon"><GitBranch size={21} /></div><h2>{project ? phases.find(p => p.id === current)?.question : 'Todo empieza con una intuición.'}</h2><p>{project ? 'Volvé al espacio de trabajo para resolver el siguiente paso con tu cofounder.' : 'Contanos qué tenés en mente. Vamos a separar lo que sabés de lo que falta descubrir.'}</p><button className="primary" disabled={busy} onClick={() => project ? onPhase(current) : onStart()}>{project ? 'Continuar mi recorrido' : 'Empezar una idea'}<ArrowRight size={15} /></button></aside>
    </div>
  </div></div>
}
