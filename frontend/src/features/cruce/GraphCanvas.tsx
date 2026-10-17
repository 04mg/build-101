import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, Maximize, Minus, Plus, X } from 'lucide-react'
import { kindLabels, relationLabels, statusLabels, type GraphEdge, type KnowledgeNote, type Point } from './types'
import { sourceContribution } from './sourceContribution'

type Viewport = Point & { zoom: number }
// Notes are fixed in place: dragging anywhere pans, a click on a note selects it.
type Gesture = { start: Point; origin: Point; id?: string; moved: boolean }
interface Props {
  notes: KnowledgeNote[]
  edges: GraphEdge[]
  positions: Record<string, Point>
  selected: string | null
  onSelect: (id: string | null) => void
  /** Animate the view to notes as they are created or updated, then back to the whole map. */
  follow?: boolean
  hypothesisOutcomes?: Record<string, 'validated' | 'rejected'>
  focusRequest?: { id: string; sequence: number } | null
}
const size = (note: KnowledgeNote) => ({ width: 220, height: note.discovery ? 280 : 180 })
const clamp = (zoom: number) => Math.max(0.15, Math.min(2, zoom))

export function GraphCanvas({ notes, edges, positions, selected, onSelect, follow = false, hypothesisOutcomes = {}, focusRequest }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 0.85 })
  const viewRef = useRef(view)
  const positionsRef = useRef(positions)
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const pinch = useRef<{ distance: number; zoom: number; world: Point } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
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
    setFlash(null)
  }, [])
  useEffect(() => stopTour, [stopTour])

  const fit = useCallback((animate = false) => {
    const el = container.current
    if (!el) return
    const bounds = notes.length ? notes.map(n => ({ ...positionsRef.current[n.id] ?? { x: 0, y: 0 }, ...size(n) })) : [{ x: 0, y: 0, width: 220, height: 180 }]
    const minX = Math.min(...bounds.map(n => n.x)), minY = Math.min(...bounds.map(n => n.y))
    const maxX = Math.max(...bounds.map(n => n.x + n.width)), maxY = Math.max(...bounds.map(n => n.y + n.height))
    const zoom = Math.min(1, clamp(Math.min((el.clientWidth - 100) / (maxX - minX), (el.clientHeight - 100) / (maxY - minY))))
    const target = { x: (el.clientWidth - (maxX + minX) * zoom) / 2, y: (el.clientHeight - (maxY + minY) * zoom) / 2, zoom }
    if (animate) animateTo(target, 800); else setView(target)
  }, [notes, animateTo])

  // Fit when new knowledge appears, not after every edit or manual drag.
  const noteCount = notes.length
  useEffect(() => {
    if (follow && seen.current) return
    const frame = requestAnimationFrame(() => fit())
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteCount])

  // Follow mode: visit each new or rewritten note in turn, then show the whole map.
  useEffect(() => {
    if (!follow) return
    const previous = seen.current
    seen.current = new Map(notes.map(n => [n.id, `${n.title}\n${n.body}`]))
    if (!previous) return
    const changed = notes.filter(n => previous.get(n.id) !== `${n.title}\n${n.body}`)
    if (!changed.length) return
    stopTour()
    const visit = (note: KnowledgeNote) => {
      const el = container.current, p = positionsRef.current[note.id]
      if (!el || !p) return
      const { width, height } = size(note), zoom = Math.min(1, Math.max(viewRef.current.zoom, 0.8))
      animateTo({ x: el.clientWidth / 2 - (p.x + width / 2) * zoom, y: el.clientHeight / 2 - (p.y + height / 2) * zoom, zoom })
      setFlash(note.id)
    }
    changed.forEach((note, i) => tour.current.push(window.setTimeout(() => visit(note), 150 + i * 1300)))
    tour.current.push(window.setTimeout(() => { setFlash(null); fit(true) }, 150 + changed.length * 1300 + 300))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, notes])
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
    setFlash(focusRequest.id)
    const timer = window.setTimeout(() => setFlash(null), 1400)
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
      if ((event.target as HTMLElement).closest('[data-canvas-ui]')) return
      // Let an expanded note scroll its own text.
      const open = (event.target as HTMLElement).closest<HTMLElement>('.graph-note.expanded')
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
    if ((event.target as HTMLElement).closest('[data-canvas-ui]') || event.button > 1) return
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
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
    gesture.current = { id, start: { x: event.clientX, y: event.clientY }, origin: { x: view.x, y: view.y }, moved: false }
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
    setView(v => ({ ...v, x: g.origin.x + dx, y: g.origin.y + dy }))
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    pointers.current.delete(event.pointerId)
    const g = gesture.current
    if (!cancelled && g && !g.moved) {
      const open = g.id && g.id !== selected ? g.id : null
      onSelect(open)
      if (open) readNote(open)
    }
    gesture.current = null; pinch.current = null; setDragging(false)
    if (container.current?.hasPointerCapture(event.pointerId)) container.current.releasePointerCapture(event.pointerId)
  }

  const byId = new Map(notes.map(n => [n.id, n]))
  return (
    <div ref={container} className={`knowledge-canvas ${dragging ? 'is-dragging' : ''}`} aria-label="Mapa del problema. Arrastrá para desplazarte, usá la rueda para acercar y hacé click en una nota para leerla completa."
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={e => pointerUp(e)} onPointerCancel={e => pointerUp(e, true)}
      style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${28 * view.zoom}px ${28 * view.zoom}px` }}>
      <div className="canvas-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        <svg className="graph-connections" aria-hidden="true">
          <defs><marker id="graph-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#b2aca0" /></marker></defs>
          {edges.map(edge => {
            const source = byId.get(edge.source), target = byId.get(edge.target)
            if (!source || !target) return null
            const a = borderPoint(source, positions[source.id], target, positions[target.id])
            const b = borderPoint(target, positions[target.id], source, positions[source.id])
            const active = edge.source === selected || edge.target === selected
            return <g key={edge.id} className={active ? 'connection-selected' : ''}>
              <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} className={`connection ${edge.relation}`} markerEnd="url(#graph-arrow)" />
              {active && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 8} className="connection-label" textAnchor="middle">{relationLabels[edge.relation]}</text>}
            </g>
          })}
        </svg>
        {!notes.length && <div className="graph-note problem empty-problem" style={{ left: 0, top: 0 }}>Problema</div>}
        {notes.map(note => <div key={note.id} data-node-id={note.id} role="button" tabIndex={0}
          aria-label={`${kindLabels[note.kind]}: ${note.title}. ${statusLabels[note.status]}`} aria-pressed={selected === note.id}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(note.id); readNote(note.id) } }}
          className={`graph-note ${note.kind} ${selected === note.id ? 'selected expanded' : ''} ${flash === note.id ? 'flash' : ''} ${note.status} ${hypothesisOutcomes[note.id] ? `outcome-${hypothesisOutcomes[note.id]}` : ''}`}
          style={{ left: positions[note.id]?.x ?? 0, top: positions[note.id]?.y ?? 0 }}>
          {note.kind === 'hypothesis' && hypothesisOutcomes[note.id] && <span className={`hypothesis-result graph-hypothesis-result ${hypothesisOutcomes[note.id]}`} role="img" aria-label={hypothesisOutcomes[note.id] === 'validated' ? 'Hipótesis validada' : 'Hipótesis no validada'}>{hypothesisOutcomes[note.id] === 'validated' ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}</span>}
          {note.kind === 'problem' ? <><strong>{note.title}</strong><p>{note.body}</p></> : <>
            <strong>{note.title}</strong>{note.discovery ? <div className="discovery-sections"><section><h4>Observación</h4><p>{note.discovery.observation}</p></section><section><h4>Insight</h4><p>{note.discovery.insight}</p></section><section><h4>Oportunidad (HMW)</h4><p>{note.discovery.opportunity}</p></section></div> : <p>{sourceContribution(note, notes, edges)}</p>}
            <span className="note-foot">{hypothesisOutcomes[note.id] === 'validated' ? 'Validada' : hypothesisOutcomes[note.id] === 'rejected' ? 'No validada' : note.kind === 'source' && note.url ? hostname(note.url) : note.status === 'open' ? (note.origin === 'founder' ? 'Tu punto de partida' : 'Por contrastar') : statusLabels[note.status]}</span>
          </>}
        </div>)}
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

function hostname(url: string) { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Fuente' } }

function borderPoint(note: KnowledgeNote, position: Point | undefined, other: KnowledgeNote, otherPosition: Point | undefined): Point {
  const s = size(note), o = size(other), p = position ?? { x: 0, y: 0 }, q = otherPosition ?? { x: 0, y: 0 }
  const center = { x: p.x + s.width / 2, y: p.y + s.height / 2 }
  const dx = q.x + o.width / 2 - center.x, dy = q.y + o.height / 2 - center.y
  const factor = Math.min((s.width / 2) / Math.max(1, Math.abs(dx)), (s.height / 2) / Math.max(1, Math.abs(dy)))
  return { x: center.x + dx * factor, y: center.y + dy * factor }
}
