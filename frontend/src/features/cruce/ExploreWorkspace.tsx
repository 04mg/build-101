import type { ReactNode } from 'react'
import { ArrowRight, Check, Download, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { artifacts, getSteps, phasePercent } from './phases'
import { deliverablesMarkdown, downloadMarkdown } from './exportMarkdown'
import { chosenSolution, type DeliverableKey, type MatrixRow, type Project } from './types'
import { ValidationGauge } from './ValidationWorkspace'

type Action = (action: Record<string, unknown>) => Promise<Project | null>
const exploreKeys = ['solution-concept', 'value-proposition', 'critical-assumptions'] as const

// Explore: from the Discover insights to one solution worth prototyping.
export function ExploreWorkspace({ project, busy, onAction, onArtifact, onContinue, assistant }: {
  project: Project; busy: string; onAction: Action; onArtifact: (key: DeliverableKey) => void; onContinue: () => void; assistant: ReactNode
}) {
  const explore = project.document.explore, chosen = chosenSolution(project), steps = getSteps(project, 'explore')
  const running = explore.status === 'running', disabled = Boolean(busy) || running
  const insights = project.document.nodes.filter(n => n.kind === 'insight' && n.discovery)
  function exportBrief() {
    const choice = chosen ? [`## Solución elegida\n\n**${chosen.name}**. ${chosen.summary}\n\n${chosen.hmw ?? ''}`] : []
    downloadMarkdown(`explore-${project.id}.md`, deliverablesMarkdown(project, 'Explore', ['comparison-matrix', ...exploreKeys], choice))
  }
  return <div className="define-layout validation-layout">
    <aside className="validation-sidebar" aria-label="Explore"><div className="validation-home">
      <h1>Elegí qué construir.</h1>
      <ValidationGauge percent={phasePercent(project, 'explore')} label="Avance de Explore" />
      <p className="validation-intro">Compará cómo se resuelve hoy con lo que podrías construir, y quedate con una.</p>
      <hr /><div className="validation-section-heading"><h2>Pasos</h2><span>{steps.filter(s => s.done).length} de {steps.length}</span></div>
      <div className="validation-checklist">
        <StepItem index={1} done={Boolean(explore.rows.length)} title="Matriz de alternativas" detail={explore.rows.length ? `${explore.rows.length} alternativas · ${explore.criteria.length} criterios` : 'Desde el research y tus insights'} onClick={() => explore.rows.length ? onArtifact('comparison-matrix') : document.getElementById('explore-matrix')?.scrollIntoView({ behavior: 'smooth' })} />
        <StepItem index={2} done={Boolean(chosen)} title="Elegir la solución" detail={chosen?.name ?? 'Una de las tres propuestas'} onClick={() => document.getElementById('explore-solutions')?.scrollIntoView({ behavior: 'smooth' })} />
        {exploreKeys.map((key, i) => {
          const note = project.document.nodes.find(n => n.id === `deliverable-${key}`)
          return <StepItem key={key} index={i + 3} done={note?.status === 'done'} title={artifacts[key].title} detail={note?.status === 'done' ? 'Aprobado' : note ? 'Borrador · revisalo y dale OK' : chosen ? 'Pendiente' : 'Después de elegir'} disabled={!note} onClick={() => onArtifact(key)} />
        })}
      </div>
      {chosen && <button className="primary validation-continue" disabled={disabled} onClick={onContinue}>Continuar a Prototype<ArrowRight size={15} /></button>}
      {explore.rows.length > 0 && <button className="text-button phase-export" onClick={exportBrief}><Download size={13} />Descargar entregable (.md)</button>}
    </div></aside>
    <section className="phase-main" aria-label="Matriz y soluciones"><div className="phase-main-scroll">
      {!explore.rows.length ? <div className="phase-empty-state" id="explore-matrix">
        {running ? <><LoaderCircle className="spin" size={22} /><h2>Armando la matriz…</h2><p>Cruzo el research de Discover con tus {insights.length} insights.</p></>
          : <><h2>¿Cómo se resuelve hoy y qué podrías construir?</h2><p>Comparo alternativas actuales y tres soluciones nacidas de tus How might we.</p>
            {explore.error && <p className="inline-error" role="alert">{explore.error}</p>}
            <button className="primary" disabled={disabled} onClick={() => void onAction({ action: 'explore-matrix' })}>Generar matriz<ArrowRight size={14} /></button></>}
      </div> : <>
        <div className="phase-main-heading" id="explore-matrix"><h2>Matriz de alternativas</h2><button className="text-button" disabled={disabled} onClick={() => void onAction({ action: 'explore-matrix' })}>{running && explore.task === 'matrix' ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />}Regenerar</button></div>
        {explore.error && <p className="inline-error" role="alert">{explore.error}</p>}
        <Matrix project={project} />
        <div className="phase-main-heading" id="explore-solutions"><h2>Soluciones propuestas</h2>{running && explore.task === 'deliverables' && <span className="phase-working"><LoaderCircle className="spin" size={13} />Escribiendo concepto, propuesta de valor y supuestos…</span>}</div>
        <div className="solution-grid">{explore.rows.filter(r => r.type === 'solution').map(row => {
          const isChosen = row.id === explore.chosenId
          return <article key={row.id} className={`solution-card ${isChosen ? 'chosen' : ''}`}>
            <div className="solution-card-top"><h3>{row.name}</h3><ScoreTotal row={row} max={explore.criteria.length * 3} /></div>
            <p>{row.summary}</p>{row.hmw && <p className="solution-hmw">{row.hmw}</p>}
            <button className={isChosen ? 'solution-chosen' : 'primary'} disabled={disabled || isChosen} onClick={() => void onAction({ action: 'explore-choose', solutionId: row.id })}>{isChosen ? <><Check size={14} />Elegida</> : 'Elegir esta'}</button>
          </article>
        })}</div>
      </>}
    </div>{assistant}</section>
  </div>
}

function StepItem({ index, done, title, detail, disabled, onClick }: { index: number; done: boolean; title: string; detail: string; disabled?: boolean; onClick: () => void }) {
  return <button className={`validation-check-item ${done ? 'validated' : ''}`} disabled={disabled} onClick={onClick}>
    <span className="validation-check" aria-hidden="true">{done ? <Check size={14} strokeWidth={3} /> : index}</span>
    <span className="validation-item-text"><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={15} />
  </button>
}

function Matrix({ project }: { project: Project }) {
  const { criteria, rows, chosenId } = project.document.explore
  const insight = (id: string | null) => project.document.nodes.find(n => n.id === id)
  const groups = [['Hoy', rows.filter(r => r.type !== 'solution')], ['Propuestas', rows.filter(r => r.type === 'solution')]] as const
  return <div className="matrix-wrap card"><table className="explore-matrix">
    <thead><tr><th scope="col">Alternativa</th>{criteria.map(c => <th key={c.id} scope="col" title={insight(c.insightId)?.discovery?.insight ?? undefined}>{c.label}</th>)}</tr></thead>
    {groups.map(([label, items]) => <tbody key={label}><tr className="matrix-group"><th colSpan={criteria.length + 1} scope="rowgroup">{label}</th></tr>
      {items.map(row => <tr key={row.id} className={row.id === chosenId ? 'chosen' : row.type === 'solution' ? 'proposal' : ''}>
        <th scope="row"><span className="matrix-name">{row.name}{row.url && <a href={row.url} target="_blank" rel="noreferrer" aria-label={`Fuente de ${row.name}`}><ExternalLink size={11} /></a>}</span><small>{row.summary}</small></th>
        {criteria.map(c => { const s = row.scores.find(x => x.criterionId === c.id); return <td key={c.id} title={s?.note}><Dots value={s?.score ?? null} /></td> })}
      </tr>)}
    </tbody>)}
  </table></div>
}

function Dots({ value }: { value: number | null }) {
  if (value === null) return <span className="matrix-unknown">Sin datos</span>
  return <span className="matrix-dots" role="img" aria-label={`${value} de 3`}>{[0, 1, 2].map(i => <i key={i} className={i < value ? 'on' : ''} />)}</span>
}

function ScoreTotal({ row, max }: { row: MatrixRow; max: number }) {
  const total = row.scores.reduce((sum, s) => sum + (s.score ?? 0), 0)
  return <span className="solution-score" title="Puntaje estimado en la matriz">{total}<small>/{max}</small></span>
}
