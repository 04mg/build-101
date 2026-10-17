import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, ChevronDown, Globe, LoaderCircle, Maximize, Minus, Plus, X } from 'lucide-react'
import { kindLabels, relationLabels, statusLabels, type EditTarget, type GraphEdge, type KnowledgeNote, type Point } from './types'
import { sourceContribution } from './sourceContribution'

type Viewport = Point & { zoom: number }
// Dragging a note moves it, dragging the background pans, and a click on a note selects it.
type Gesture = { start: Point; origin: Point; id?: string; note?: Point; moved: boolean }
interface Props {
  notes: KnowledgeNote[]
  edges: GraphEdge[]
  positions: Record<string, Point>
  selected: string | null
  onSelect: (id: string | null) => void
  /** Persist a note's new position after it was dragged. */
  onMove?: (id: string, position: Point) => void
  /** Animate the view to notes as they are created or updated, then back to the whole map. */
  follow?: boolean
  hypothesisOutcomes?: Record<string, 'validated' | 'rejected'>
  focusRequest?: { id: string; sequence: number } | null
  /** Notes the assistant is changing right now: focused and shown as skeletons. */
  editing?: EditTarget[]
}
type Bounds = { x: number; y: number; width: number; height: number }
/** Web sources are not cards: they are listed together next to the note they inform. */
type SourceCluster = Bounds & { key: string; owner: string; sources: KnowledgeNote[] }
const size = (note: KnowledgeNote) => ({ width: 220, height: note.discovery ? 280 : 180 })
const clamp = (zoom: number) => Math.max(0.15, Math.min(2, zoom))
const CLUSTER_WIDTH = 250, ROW_HEIGHT = 34, VISIBLE_ROWS = 5

export function GraphCanvas({ notes: allNotes, edges, positions: saved, selected, onSelect, onMove, follow = false, editing = [], hypothesisOutcomes = {}, focusRequest }: Props) {
  // Dragged positions show immediately and stay until the saved layout catches up.
  const [moved, setMoved] = useState<Record<string, Point>>({})
  const positions = Object.keys(moved).length ? { ...saved, ...moved } : saved
  useEffect(() => {
    setMoved(current => {
      const pending = Object.entries(current).filter(([id, p]) => saved[id]?.x !== p.x || saved[id]?.y !== p.y)
      return pending.length === Object.keys(current).length ? current : Object.fromEntries(pending)
    })
  }, [saved])
  const notes = allNotes.filter(n => n.kind !== 'source')
  const clusters = clusterSources(allNotes, notes, edges, positions)
  const clustersRef = useRef(clusters)
  clustersRef.current = clusters
  const [openSource, setOpenSource] = useState<string | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 0.85 })
  const viewRef = useRef(view)
  const positionsRef = useRef(positions)
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const pinch = useRef<{ distance: number; zoom: number; world: Point } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [flash, setFlash] = useState<Set<string>>(new Set())
  const animation = useRef<number | null>(null), tour = useRef<number[]>([])
  const seen = useRef<Map<string, string> | null>(null)
  viewRef.current = view
  positionsRef.current = positions

  const animateTo = useCallback((target: Viewport, duration = 650) => {
    if (animation.current) cancelAnimationFrame(animation.current)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setView(target); return }
    const from = viewRef.current, start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration), e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, zoom: from.zoom + (target.zoom - from.zoom) * e })
      animation.current = t < 1 ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
  }, [])
  // Any manual gesture takes the view back from the guided tour.
  const stopTour = useCallback(() => {
    if (animation.current) cancelAnimationFrame(animation.current)
    animation.current = null
    tour.current.forEach(clearTimeout); tour.current = []
    setFlash(new Set())
  }, [])
  useEffect(() => stopTour, [stopTour])

  // Frame a set of rectangles, never zooming past 100%.
  const frame = useCallback((bounds: Bounds[], animate: boolean) => {
    const el = container.current
    if (!el || !bounds.length) return
    const minX = Math.min(...bounds.map(n => n.x)), minY = Math.min(...bounds.map(n => n.y))
    const maxX = Math.max(...bounds.map(n => n.x + n.width)), maxY = Math.max(...bounds.map(n => n.y + n.height))
    const zoom = Math.min(1, clamp(Math.min((el.clientWidth - 100) / (maxX - minX), (el.clientHeight - 100) / (maxY - minY))))
    const target = { x: (el.clientWidth - (maxX + minX) * zoom) / 2, y: (el.clientHeight - (maxY + minY) * zoom) / 2, zoom }
    if (animate) animateTo(target, 800); else setView(target)
  }, [animateTo])
  const boundsOf = useCallback((list: KnowledgeNote[]) => list.map(n => ({ ...positionsRef.current[n.id] ?? { x: 0, y: 0 }, ...size(n) })), [])
  const fit = useCallback((animate = false) => {
    frame(notes.length ? [...boundsOf(notes), ...clustersRef.current] : [{ x: 0, y: 0, width: 220, height: 180 }], animate)
  }, [notes, frame, boundsOf])

  // Fit when new knowledge appears, not after every edit or manual drag.
  const noteCount = notes.length
  useEffect(() => {
    if (follow && seen.current) return
    const frame = requestAnimationFrame(() => fit())
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteCount])

  // Follow mode: visit each new or rewritten note in turn (only those), then show the whole map.
  // Many changes at once (e.g. research) are framed and highlighted together instead.
  useEffect(() => {
    if (!follow) return
    const previous = seen.current
    seen.current = new Map(allNotes.map(n => [n.id, `${n.title}\n${n.body}`]))
    if (!previous) return
    // New sources count once, as their source list.
    const stops = new Map<string, Bounds>()
    for (const note of allNotes.filter(n => previous.get(n.id) !== `${n.title}\n${n.body}`)) {
      const cluster = note.kind === 'source' ? clustersRef.current.find(c => c.sources.includes(note)) : undefined
      if (cluster) stops.set(cluster.key, cluster)
      else if (note.kind !== 'source') stops.set(note.id, boundsOf([note])[0])
    }
    const changed = [...stops]
    if (!changed.length) return
    stopTour()
    if (changed.length > 4) {
      tour.current.push(window.setTimeout(() => { frame(changed.map(([, b]) => b), true); setFlash(new Set(stops.keys())) }, 150))
      tour.current.push(window.setTimeout(() => setFlash(new Set()), 1600))
      return
    }
    const visit = ([key, b]: [string, Bounds]) => {
      const el = container.current
      if (!el) return
      const zoom = Math.min(1, Math.max(viewRef.current.zoom, 0.8))
      animateTo({ x: el.clientWidth / 2 - (b.x + b.width / 2) * zoom, y: el.clientHeight / 2 - (b.y + b.height / 2) * zoom, zoom })
      setFlash(new Set([key]))
    }
    changed.forEach((stop, i) => tour.current.push(window.setTimeout(() => visit(stop), 150 + i * 1300)))
    tour.current.push(window.setTimeout(() => { setFlash(new Set()); fit(true) }, 150 + changed.length * 1300 + 300))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, allNotes])

  // While the assistant edits, frame the notes it is touching and where new ones will land.
  const editingKey = editing.map(t => `${t.op}:${t.id}`).join('|')
  useEffect(() => {
    if (!editing.length) return
    stopTour()
    const byId = new Map(notes.map(n => [n.id, n]))
    frame(editing.flatMap(t => {
      const note = byId.get(t.id), anchor = note ? boundsOf([note]) : []
      return t.at ? [...anchor, { ...t.at, width: 220, height: 180 }] : anchor
    }), true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingKey])
  useEffect(() => {
    const el = container.current
    if (!el) return
    let previousWidth = el.clientWidth, previousHeight = el.clientHeight
    const observer = new ResizeObserver(() => {
      const dx = (el.clientWidth - previousWidth) / 2, dy = (el.clientHeight - previousHeight) / 2
      previousWidth = el.clientWidth; previousHeight = el.clientHeight
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Opening a note brings it to the center at a readable zoom.
  const readNote = useCallback((id: string, expanded = true) => {
    const el = container.current, p = positionsRef.current[id]
    if (!el || !p) return
    const zoom = Math.max(1, viewRef.current.zoom)
    animateTo({ x: el.clientWidth / 2 - (p.x + (expanded ? 140 : 110)) * zoom, y: expanded ? Math.min(el.clientHeight / 2 - (p.y + 90) * zoom, 60 - p.y * zoom) : el.clientHeight / 2 - (p.y + 90) * zoom, zoom })
  }, [animateTo])

  useEffect(() => {
    if (!focusRequest) return
    stopTour()
    readNote(focusRequest.id, false)
    setFlash(new Set([focusRequest.id]))
    const timer = window.setTimeout(() => setFlash(new Set()), 1400)
    return () => clearTimeout(timer)
  }, [focusRequest, readNote, stopTour])

  function zoomAt(factor: number, point?: Point) {
    const el = container.current
    if (!el) return
    const anchor = point ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }
    setView(v => {
      const zoom = clamp(v.zoom * factor)
      return { x: anchor.x - (anchor.x - v.x) * zoom / v.zoom, y: anchor.y - (anchor.y - v.y) * zoom / v.zoom, zoom }
    })
  }

  useEffect(() => {
    const el = container.current
    if (!el) return
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('[data-canvas-ui]:not(.source-cluster)')) return
      // Let an expanded note or a long source list scroll its own content.
      const open = (event.target as HTMLElement).closest<HTMLElement>('.graph-note.expanded, .source-cluster-list')
      if (open && open.scrollHeight > open.clientHeight) return
      event.preventDefault()
      stopTour()
      const rect = el.getBoundingClientRect(), anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      setView(v => {
        const zoom = clamp(v.zoom * Math.exp(-event.deltaY * 0.0015))
        return { x: anchor.x - (anchor.x - v.x) * zoom / v.zoom, y: anchor.y - (anchor.y - v.y) * zoom / v.zoom, zoom }
      })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [stopTour])

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // A source list is dragged by its header; the rest of the list stays clickable.
    const list = (event.target as HTMLElement).closest<HTMLElement>('.source-cluster-head')?.dataset.clusterKey
    if ((!list && (event.target as HTMLElement).closest('[data-canvas-ui]')) || event.button > 1) return
    stopTour()
    const el = container.current!
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    el.setPointerCapture(event.pointerId)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()], rect = el.getBoundingClientRect(), v = viewRef.current
      const center = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: v.zoom, world: { x: (center.x - v.x) / v.zoom, y: (center.y - v.y) / v.zoom } }
      gesture.current = null
      return
    }
    if (list) {
      const cluster = clustersRef.current.find(c => c.key === list), owner = cluster && (positionsRef.current[cluster.owner] ?? { x: 0, y: 0 })
      if (!cluster || !owner) return
      gesture.current = { id: list, note: { x: cluster.x - owner.x, y: cluster.y - owner.y }, start: { x: event.clientX, y: event.clientY }, origin: { x: view.x, y: view.y }, moved: false }
      return
    }
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
    // Notes the assistant is rewriting stay put until it finishes.
    const movable = id && !editing.some(t => t.id === id && (t.op === 'update' || t.op === 'delete'))
    gesture.current = { id, note: movable ? positionsRef.current[id] ?? { x: 0, y: 0 } : undefined, start: { x: event.clientX, y: event.clientY }, origin: { x: view.x, y: view.y }, moved: false }
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()], p = pinch.current, rect = container.current!.getBoundingClientRect()
      const zoom = clamp(p.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, p.distance))
      setView({ x: (a.x + b.x) / 2 - rect.left - p.world.x * zoom, y: (a.y + b.y) / 2 - rect.top - p.world.y * zoom, zoom })
      return
    }
    const g = gesture.current
    if (!g) return
    const dx = event.clientX - g.start.x, dy = event.clientY - g.start.y
    if (Math.hypot(dx, dy) < 4 && !g.moved) return
    g.moved = true; setDragging(true)
    if (g.id && g.note) {
      const zoom = viewRef.current.zoom, id = g.id, note = g.note
      setMoved(current => ({ ...current, [id]: { x: Math.round(note.x + dx / zoom), y: Math.round(note.y + dy / zoom) } }))
    } else setView(v => ({ ...v, x: g.origin.x + dx, y: g.origin.y + dy }))
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    pointers.current.delete(event.pointerId)
    const g = gesture.current
    if (!cancelled && g && !g.moved && !g.id?.startsWith('sources:')) {
      const open = g.id && g.id !== selected ? g.id : null
      onSelect(open)
      if (open) readNote(open)
    }
    if (!cancelled && g?.moved && g.id && g.note) {
      const position = positionsRef.current[g.id]
      if (position) onMove?.(g.id, position)
    }
    gesture.current = null; pinch.current = null; setDragging(false)
    if (container.current?.hasPointerCapture(event.pointerId)) container.current.releasePointerCapture(event.pointerId)
  }

  const byId = new Map(notes.map(n => [n.id, n]))
  return (
    <div ref={container} className={`knowledge-canvas ${dragging ? 'is-dragging' : ''}`} aria-label="Mapa del problema. Arrastrá una nota para moverla o el fondo para desplazarte, usá la rueda para acercar y hacé click en una nota para leerla completa."
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={e => pointerUp(e)} onPointerCancel={e => pointerUp(e, true)}
      style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${28 * view.zoom}px ${28 * view.zoom}px` }}>
      <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        <svg className="graph-connections" aria-hidden="true">
          <defs><marker id="graph-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#b2aca0" /></marker></defs>
          {edges.map(edge => {
            const source = byId.get(edge.source), target = byId.get(edge.target)
            if (!source || !target) return null
            const from = rectOf(source, positions), to = rectOf(target, positions)
            const a = borderPoint(from, to), b = borderPoint(to, from)
            const active = edge.source === selected || edge.target === selected
            return <g key={edge.id} className={active ? 'connection-selected' : ''}>
              <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} className={`connection ${edge.relation}`} markerEnd="url(#graph-arrow)" />
              {active && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} className="connection-label" textAnchor="middle">{relationLabels[edge.relation]}</text>}
            </g>
          })}
          {clusters.map(cluster => {
            const owner = byId.get(cluster.owner)
            if (!owner) return null
            const from = rectOf(owner, positions), a = borderPoint(from, cluster), b = borderPoint(cluster, from)
            return <path key={cluster.key} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} className={`connection source-link-line ${cluster.sources.some(n => n.id === selected) ? 'active' : ''}`} />
          })}
          {editing.filter(t => t.op === 'create' && t.at && positions[t.id]).map((t, i) => {
            const p = positions[t.id]
            return <path key={`new-${i}`} d={`M ${p.x + 110} ${p.y + 90} L ${t.at!.x + 110} ${t.at!.y + 90}`} className="connection pending" />
          })}
        </svg>
        {!notes.length && <div className="graph-note problem empty-problem" style={{ left: 0, top: 0 }}>Problema</div>}
        {notes.map(note => {
          const edit = editing.find(t => t.id === note.id && (t.op === 'update' || t.op === 'delete'))
          const linked = !edit && editing.some(t => t.id === note.id)
          return <div key={note.id} data-node-id={note.id} role="button" tabIndex={0}
          aria-label={`${kindLabels[note.kind]}: ${note.title}. ${statusLabels[note.status]}`} aria-pressed={selected === note.id} aria-busy={Boolean(edit)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(note.id); readNote(note.id) } }}
          className={`graph-note ${note.kind} ${selected === note.id && !edit ? 'selected expanded' : ''} ${flash.has(note.id) ? 'flash' : ''} ${edit ? `editing ${edit.op}` : ''} ${linked ? 'edit-anchor' : ''} ${note.status} ${hypothesisOutcomes[note.id] ? `outcome-${hypothesisOutcomes[note.id]}` : ''}`}
          style={{ left: positions[note.id]?.x ?? 0, top: positions[note.id]?.y ?? 0 }}>
          {!edit && note.kind === 'hypothesis' && hypothesisOutcomes[note.id] && <span className={`hypothesis-result graph-hypothesis-result ${hypothesisOutcomes[note.id]}`} role="img" aria-label={hypothesisOutcomes[note.id] === 'validated' ? 'Hipótesis validada' : 'Hipótesis no validada'}>{hypothesisOutcomes[note.id] === 'validated' ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}</span>}
          {edit ? <NoteSkeleton label={edit.op === 'delete' ? 'Quitando esta nota…' : 'Editando…'} /> : note.kind === 'problem' ? <><strong>{note.title}</strong><p>{note.body}</p></> : <>
            <strong>{note.title}</strong>{note.discovery ? <div className="discovery-sections"><section><h4>Observación</h4><p>{note.discovery.observation}</p></section><section><h4>Insight</h4><p>{note.discovery.insight}</p></section><section><h4>Oportunidad (HMW)</h4><p>{note.discovery.opportunity}</p></section></div> : <p>{sourceContribution(note, notes, edges)}</p>}
            <span className="note-foot">{hypothesisOutcomes[note.id] === 'validated' ? 'Validada' : hypothesisOutcomes[note.id] === 'rejected' ? 'No validada' : note.rationale ? 'Ajustado con research' : note.status === 'open' ? (note.origin === 'founder' ? 'Tu punto de partida' : 'Por contrastar') : statusLabels[note.status]}</span>
          </>}
        </div>
        })}
        {clusters.map(cluster => <section key={cluster.key} data-canvas-ui className={`source-cluster ${flash.has(cluster.key) ? 'flash' : ''}`} style={{ left: cluster.x, top: cluster.y, width: cluster.width }} aria-label={`Fuentes de ${byId.get(cluster.owner)?.title ?? 'la nota'}`}>
          <header className="source-cluster-head" data-cluster-key={cluster.key} title="Arrastrá para mover la lista"><Globe size={12} /><span>Fuentes</span><span className="source-count">{cluster.sources.length}</span></header>
          <ul className="source-cluster-list" style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS + 4 }}>{cluster.sources.map(source => {
            const open = openSource === source.id || selected === source.id
            return <li key={source.id} className={`${open ? 'open' : ''} ${selected === source.id ? 'selected' : ''}`}>
              <button className="source-row" aria-expanded={open} onClick={() => setOpenSource(open ? null : source.id)}>
                <span className="source-row-text"><span className="source-host">{source.url ? hostname(source.url) : 'Fuente'}</span><span className="source-title">{source.title}</span></span><ChevronDown size={13} />
              </button>
              {open && <div className="source-row-body"><p>{sourceContribution(source, allNotes, edges)}</p><div>{source.url && <a href={source.url} target="_blank" rel="noreferrer">Abrir fuente ↗</a>}<button className="text-button" onClick={() => onSelect(source.id)}>Ver detalle</button></div></div>}
            </li>
          })}</ul>
        </section>)}
        {editing.filter(t => t.op === 'create' && t.at).map((t, i) => <div key={`new-${i}`} className="graph-note editing create" aria-busy="true" style={{ left: t.at!.x, top: t.at!.y }}><NoteSkeleton label="Nueva nota…" /></div>)}
      </div>
      <div className="canvas-controls" data-canvas-ui>
        <button className="icon-button" onClick={() => { stopTour(); zoomAt(1.25) }} aria-label="Acercar"><Plus size={15} /></button>
        <span className="zoom-label">{Math.round(view.zoom * 100)}%</span>
        <button className="icon-button" onClick={() => { stopTour(); zoomAt(0.8) }} aria-label="Alejar"><Minus size={15} /></button>
        <button className="icon-button" onClick={() => { stopTour(); fit(true) }} aria-label="Ver todo el mapa" title="Ver todo"><Maximize size={15} /></button>
      </div>
    </div>
  )
}

function NoteSkeleton({ label }: { label: string }) {
  return <><span className="note-editing-label"><LoaderCircle size={12} className="spin" />{label}</span><span className="skeleton-line wide" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line short" /></>
}

function hostname(url: string) { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Fuente' } }

const rectOf = (note: KnowledgeNote, positions: Record<string, Point>): Bounds => ({ ...positions[note.id] ?? { x: 0, y: 0 }, ...size(note) })

function borderPoint(s: Bounds, o: Bounds): Point {
  const center = { x: s.x + s.width / 2, y: s.y + s.height / 2 }
  const dx = o.x + o.width / 2 - center.x, dy = o.y + o.height / 2 - center.y
  const factor = Math.min((s.width / 2) / Math.max(1, Math.abs(dx)), (s.height / 2) / Math.max(1, Math.abs(dy)))
  return { x: center.x + dx * factor, y: center.y + dy * factor }
}

// Each source joins the list of every note it justifies (Personas, Proceso actual,
// Pain points or the problem), else of a note citing it. A list keeps the offset the
// founder dragged it to (`sources:<note>`); otherwise it sits beside its note in the
// first free direction, so it never covers cards or other lists.
function clusterSources(all: KnowledgeNote[], cards: KnowledgeNote[], edges: GraphEdge[], positions: Record<string, Point>): SourceCluster[] {
  const visible = new Set(cards.map(n => n.id)), groups = new Map<string, KnowledgeNote[]>()
  for (const source of all.filter(n => n.kind === 'source')) {
    const informs = edges.filter(e => e.source === source.id && visible.has(e.target)).map(e => e.target)
    const citing = edges.filter(e => e.target === source.id && visible.has(e.source)).map(e => e.source)
    const owners = informs.length ? informs : citing.length ? citing.slice(0, 1) : visible.has('problem') ? ['problem'] : []
    for (const owner of new Set(owners)) groups.set(owner, [...groups.get(owner) ?? [], source])
  }
  const taken: Bounds[] = cards.map(n => rectOf(n, positions)), clusters: SourceCluster[] = []
  for (const [owner, sources] of groups) {
    const p = positions[owner] ?? { x: 0, y: 0 }, width = CLUSTER_WIDTH
    const height = 38 + Math.min(sources.length, VISIBLE_ROWS) * ROW_HEIGHT + 10
    const free = (spot: Point) => taken.every(r => spot.x + width + 24 < r.x || r.x + r.width + 24 < spot.x || spot.y + height + 24 < r.y || r.y + r.height + 24 < spot.y)
    const offset = positions[`sources:${owner}`]
    let spot: Point | undefined = offset && { x: p.x + offset.x, y: p.y + offset.y }
    for (let gap = 50; !spot && gap < 1200; gap += 140) {
      spot = [{ x: p.x - 15, y: p.y - height - gap }, { x: p.x - width - gap, y: p.y }, { x: p.x + 220 + gap, y: p.y }, { x: p.x - 15, y: p.y + 180 + gap }].find(free)
    }
    spot ??= { x: p.x - 15, y: p.y - height - 50 }
    const cluster = { key: `sources:${owner}`, owner, sources, ...spot, width, height }
    taken.push(cluster); clusters.push(cluster)
  }
  return clusters
}
