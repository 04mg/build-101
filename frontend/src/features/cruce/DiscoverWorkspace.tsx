import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { GraphCanvas } from './GraphCanvas'
import { EvidenceForm, Journey, NotePanel } from './Journey'
import type { Capabilities, Project, Question } from './types'
import { hypothesisRejected, hypothesisValidated } from './types'
import { ValidationWorkspace } from './ValidationWorkspace'

export type DiscoverPanel = 'journey' | 'note' | 'evidence' | 'decision'
// The validation panel takes the chat's place; the assistant belongs to the graph.
export function DiscoverWorkspace({ project, capabilities, busy, selected, panel, onSelect, onPanel, onAnswer, onAction, onResearch, onSearch, assistant }: {
  project: Project; capabilities: Capabilities; busy: string; selected: string | null; panel: DiscoverPanel;
  onSelect: (id: string | null) => void; onPanel: (panel: DiscoverPanel, hypothesisId?: string) => void;
  onAnswer: (value: string, question: Question) => Promise<boolean>; onAction: (action: Record<string, unknown>) => Promise<Project | null>;
  onResearch: () => void; onSearch: (query: string) => void;
  assistant: ReactNode;
}) {
  const [activeHypothesis, setActiveHypothesis] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; sequence: number } | null>(null)
  const doc = project.document
  const note = doc.nodes.find(n => n.id === selected)
  const notes = doc.nodes.filter(n => (n.phase ?? 'discover') === 'discover' && n.kind !== 'deliverable')
  const hypothesisOutcomes: Record<string, 'validated' | 'rejected'> = {}
  for (const note of notes.filter(n => n.kind === 'hypothesis')) {
    if (hypothesisValidated(project, note.id)) hypothesisOutcomes[note.id] = 'validated'
    else if (hypothesisRejected(project, note.id)) hypothesisOutcomes[note.id] = 'rejected'
  }
  const drawer = panel === 'note' && note ? 'note' : panel === 'evidence' ? 'evidence' : panel === 'decision' ? 'journey' : null
  function close() { onSelect(null) }
  function openHypothesis(id: string | null) {
    setActiveHypothesis(id)
    if (id) {
      close()
      setFocusRequest(previous => ({ id, sequence: (previous?.sequence ?? 0) + 1 }))
    }
  }
  return <div className="define-layout validation-layout">
    <aside className="validation-sidebar" aria-label="Validar el problema"><ValidationWorkspace key={project.id} project={project} busy={busy} onAction={onAction} onSelect={onSelect} active={activeHypothesis} onOpen={openHypothesis} /></aside>
    <section className="discover-map fill-canvas" aria-label="Grafo del problema">
    <GraphCanvas key={project.id} notes={notes} edges={doc.edges} positions={doc.positions} selected={selected} onSelect={onSelect} follow hypothesisOutcomes={hypothesisOutcomes} focusRequest={focusRequest} />
    {assistant}
    {drawer && <aside className="map-drawer" aria-label="Trabajar con el cofounder">
      {drawer !== 'note' && <button className="icon-button map-drawer-close" aria-label="Cerrar panel" onClick={close}><X size={16} /></button>}
      {drawer === 'note' && note ? <NotePanel key={`${project.id}-${note.id}`} note={note} project={project} busy={busy} onClose={close} onSelect={onSelect} onSave={onAction} onEvidence={openHypothesis} />
        : drawer === 'evidence' ? <EvidenceForm key={`${project.id}-${selected ?? 'all'}`} project={project} busy={busy} hypothesisId={selected ?? undefined} onBack={close} onSave={onAction} />
        : <Journey key={`${project.id}-${panel}`} initialMode={panel === 'decision' ? 'decision' : undefined} project={project} capabilities={capabilities} busy={busy} onAnswer={onAnswer} onAction={onAction} onResearch={onResearch} onSelect={onSelect} onEvidence={() => onPanel('evidence')} onSearch={onSearch} />}
    </aside>}
    </section></div>
}
