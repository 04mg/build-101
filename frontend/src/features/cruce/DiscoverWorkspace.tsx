import { useState } from 'react'
import { ListChecks, X } from 'lucide-react'
import { GraphCanvas } from './GraphCanvas'
import { EvidenceForm, Journey, NotePanel } from './Journey'
import type { Capabilities, Project, Question } from './types'

export type DiscoverPanel = 'journey' | 'note' | 'evidence' | 'decision'
// Once the problem is confirmed, Discover is the map; detail opens in a drawer on demand.
export function DiscoverWorkspace({ project, capabilities, busy, selected, panel, onSelect, onPanel, onAnswer, onAction, onResearch, onSearch }: {
  project: Project; capabilities: Capabilities; busy: string; selected: string | null; panel: DiscoverPanel;
  onSelect: (id: string | null) => void; onPanel: (panel: DiscoverPanel, hypothesisId?: string) => void;
  onAnswer: (value: string, question: Question) => Promise<boolean>; onAction: (action: Record<string, unknown>) => Promise<Project | null>;
  onResearch: () => void; onSearch: (query: string) => void;
}) {
  const [nextOpen, setNextOpen] = useState(false)
  const doc = project.document
  const note = doc.nodes.find(n => n.id === selected)
  const notes = doc.nodes.filter(n => (n.phase ?? 'discover') === 'discover' && n.kind !== 'deliverable')
  const drawer = panel === 'note' && note ? 'note' : panel === 'evidence' ? 'evidence' : panel === 'decision' || nextOpen ? 'journey' : null
  function close() { setNextOpen(false); onSelect(null) }
  return <div className="discover-map fill-canvas">
    <GraphCanvas key={project.id} notes={notes} edges={doc.edges} positions={doc.positions} selected={selected} onSelect={id => { setNextOpen(false); onSelect(id) }} />
    {!drawer && <button className="map-next-step" onClick={() => setNextOpen(true)}><ListChecks size={15} />Próximo paso</button>}
    {drawer && <aside className="map-drawer" aria-label="Trabajar con el cofounder">
      {drawer !== 'note' && <button className="icon-button map-drawer-close" aria-label="Cerrar panel" onClick={close}><X size={16} /></button>}
      {drawer === 'note' && note ? <NotePanel key={`${project.id}-${note.id}`} note={note} project={project} busy={busy} onClose={close} onSelect={onSelect} onSave={onAction} onEvidence={id => onPanel('evidence', id)} />
        : drawer === 'evidence' ? <EvidenceForm key={`${project.id}-${selected ?? 'all'}`} project={project} busy={busy} hypothesisId={selected ?? undefined} onBack={close} onSave={onAction} />
        : <Journey key={`${project.id}-${panel}`} initialMode={panel === 'decision' ? 'decision' : undefined} project={project} capabilities={capabilities} busy={busy} onAnswer={onAnswer} onAction={onAction} onResearch={onResearch} onSelect={id => { setNextOpen(false); onSelect(id) }} onEvidence={() => { setNextOpen(false); onPanel('evidence') }} onSearch={onSearch} />}
    </aside>}
  </div>
}
