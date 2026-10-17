import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Search, X } from 'lucide-react'
import { findMemory } from './api'
import { kindLabels, type MemoryHit, type ProjectSummary } from './types'

export function MemorySearch({ initial, projects, currentId, onClose, onOpen, onReference, busy }: {
  initial: string; projects: ProjectSummary[]; currentId?: number; busy: boolean;
  onClose: () => void; onOpen: (projectId: number, nodeId: string) => void; onReference: (hit: MemoryHit) => void;
}) {
  const [query, setQuery] = useState(initial.slice(0, 300)), [hits, setHits] = useState<MemoryHit[]>([])
  const [mode, setMode] = useState(''), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null), sequence = useRef(0)
  useEffect(() => { const d = dialog.current; d?.showModal(); return () => { d?.close() } }, [])
  async function search(event: FormEvent) {
    event.preventDefault()
    if (query.trim().length < 2) return
    const id = ++sequence.current
    setLoading(true); setError('')
    try {
      const result = await findMemory(query.trim())
      if (id !== sequence.current) return
      setHits(result.hits); setMode(result.mode)
    } catch (cause) { if (id === sequence.current) setError(cause instanceof Error ? cause.message : 'No se pudo buscar.') }
    finally { if (id === sequence.current) setLoading(false) }
  }
  return <dialog ref={dialog} className="memory-dialog" onCancel={onClose} onClick={e => { if (e.target === dialog.current) onClose() }} aria-labelledby="memory-title">
    <div className="memory-heading"><h2 id="memory-title">Buscar en la memoria</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar búsqueda"><X size={18} /></button></div>
    <form className="memory-search-form" onSubmit={event => void search(event)}><Search size={16} /><input autoFocus value={query} maxLength={300} onChange={e => setQuery(e.target.value)} placeholder="Un problema, una hipótesis, algo que aprendiste…" aria-label="Buscar aprendizajes" /><button type="submit" disabled={loading || query.trim().length < 2}>{loading ? 'Buscando…' : 'Buscar'}</button></form>
    <p className="input-hint">Tus proyectos · Búsqueda textual · Fuentes y versiones conservadas</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="memory-results">{hits.map(hit => <article key={`${hit.projectId}-${hit.note.id}`} className="memory-result"><div className="panel-kicker">{projects.find(p => p.id === hit.projectId)?.name ?? `Proyecto #${hit.projectId}`} · {kindLabels[hit.note.kind]}</div><button className="memory-open" onClick={() => onOpen(hit.projectId, hit.note.id)}><strong>{hit.note.title}</strong><ArrowRight size={14} /></button><p>{hit.note.body}</p>{hit.projectId !== currentId && currentId && <button className="text-button" disabled={busy} onClick={() => onReference(hit)}>＋ Traer como contexto a este proyecto</button>}</article>)}</div>
    {mode && !hits.length && !loading && <p className="quiet">No encontré notas relacionadas con esa búsqueda.</p>}
  </dialog>
}
