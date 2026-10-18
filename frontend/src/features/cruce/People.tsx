import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Bell, Check, GitMerge, LoaderCircle, Mail, Search, Trophy, Users, X } from 'lucide-react'
import { matchLabels, type Karma, type MatchType, type NetworkMatch, type NetworkRequest } from './network'
import { NetworkChat } from './NetworkChat'
import type { NetworkApi } from './useNetwork'

const filters = ['Todas', 'Algo parecido', 'Pasaron por tu problema', 'Complementarias', 'Solicitudes']

export function People({ network, focus, chat, onChat, onSearch, onJourney, onOpenNote }: {
  network: NetworkApi; focus?: string; chat: string | null; onChat: (id: string | null) => void; onSearch: () => void; onJourney: () => void; onOpenNote: (projectId: number, noteId: string) => void
}) {
  const [filter, setFilter] = useState('Todas')
  const { state, busy, push } = network
  const incoming = state?.requests.filter(r => r.direction === 'incoming' && r.status === 'pending') ?? []
  const connections = (state?.requests.filter(r => r.status === 'accepted') ?? []).sort((a, b) => activity(b).localeCompare(activity(a)))
  const conversation = connections.find(r => r.id === chat)
  // An accepted crossing is shown once, as its connection.
  const open = (state?.matches ?? []).filter(m => m.request?.status !== 'accepted')
  const matches = open.filter(m => filter === 'Todas' || matchLabels[m.type].filter === filter)
  const empty = !incoming.length && !connections.length && !open.length

  const onChatRef = useRef(onChat)
  useEffect(() => { onChatRef.current = onChat })
  useEffect(() => {
    if (!focus) return
    // A push about an accepted request or a new message opens its chat.
    const id = focus.startsWith('request:') ? focus.slice(8) : ''
    if (state?.requests.some(r => r.id === id && r.status === 'accepted')) onChatRef.current(id)
    else document.querySelector(`[data-network="${CSS.escape(focus)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focus, state])

  if (conversation) return <NetworkChat key={conversation.id} request={conversation} onBack={() => onChat(null)} onRead={() => void network.refresh()} onOpenNote={onOpenNote} />

  return <div className="page-scroll"><div className="page-content people-page">
    <div className="page-heading"><div><h1>Personas</h1><p>Founders que resuelven tu mismo problema, ya probaron tus hipótesis o atacan uno de tus pain points. El contacto es anónimo hasta que la otra persona acepta.</p></div>
      {push !== 'unsupported' && push !== 'granted' && <button onClick={() => void network.enablePush()} disabled={push === 'denied'} title={push === 'denied' ? 'Habilitá las notificaciones de este sitio en tu navegador.' : undefined}><Bell size={14} />{push === 'denied' ? 'Notificaciones bloqueadas' : 'Activar notificaciones push'}</button>}
    </div>
    {state && !state.memory && <div className="cr-alert cr-alert--info network-alert"><Search size={18} /><div><strong>La memoria de la red no está disponible</strong>Tus proyectos siguen funcionando. Arrancá FalkorDB y el servicio de memoria para buscar cruces.</div></div>}
    {network.error && <div className="notice-bar error network-error" role="alert"><span>{network.error}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => network.setError('')}><X size={14} /></button></div>}
    {state?.karma && <KarmaCard karma={state.karma} />}
    <div className="people-filters" aria-label="Filtrar cruces">{filters.map(label => <button key={label} className={filter === label ? 'selected' : ''} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
    {!state ? <div className="loading-workspace"><LoaderCircle className="spin" size={18} /><span>Buscando en la red…</span></div> : empty ? <EmptyPeople onSearch={onSearch} onJourney={onJourney} /> : <div className="network-layout">
      {(filter === 'Todas' || filter === 'Solicitudes') && incoming.length > 0 && <section className="network-section"><span className="eyebrow">Solicitudes de contacto · {incoming.length}</span>
        {incoming.map(request => <RequestCard key={request.id} request={request} active={focus === `request:${request.id}`} busy={busy === request.id} onOpenNote={onOpenNote}
          onRespond={async value => { if (await network.respond(request.id, value) && value) onChat(request.id) }} />)}</section>}
      {(filter === 'Todas' || filter === 'Solicitudes') && connections.length > 0 && <section className="network-section"><span className="eyebrow">Conexiones · {connections.length}</span>
        <div className="card network-threads">{connections.map(request => <ConnectionRow key={request.id} request={request} onOpen={() => onChat(request.id)} />)}</div></section>}
      {filter !== 'Solicitudes' && <section className="network-section">
        {matches.length ? matches.map(match => <MatchCard key={match.id} match={match} active={focus === `match:${match.id}`} busy={busy === match.id}
          onContact={() => void network.contact(match.id)} onDismiss={() => void network.dismiss(match.id)} onOpenNote={onOpenNote} />)
          : <p className="network-none">No hay cruces de este tipo todavía.</p>}</section>}
    </div>}
  </div></div>
}

function Avatar({ type, size = 44 }: { type: MatchType; size?: number }) {
  return <span className={`cr-avatar ${matchLabels[type].partner ? 'cr-avatar--partner' : 'cr-avatar--red'}`} style={{ '--avatar-size': `${size}px` } as CSSProperties} aria-hidden="true">{matchLabels[type].partner ? <GitMerge size={18} /> : <Users size={18} />}</span>
}

function NoteLink({ projectId, projectName, note, onOpenNote }: { projectId: number; projectName: string; note: NetworkMatch['note']; onOpenNote: (projectId: number, noteId: string) => void }) {
  return <button className="network-note" onClick={() => onOpenNote(projectId, note.id)} title="Abrir la nota en el grafo"><span className="eyebrow">Tu nota · {projectName}</span><span>{note.title}</span><ArrowRight size={13} /></button>
}

function MatchCard({ match, active, busy, onContact, onDismiss, onOpenNote }: { match: NetworkMatch; active: boolean; busy: boolean; onContact: () => void; onDismiss: () => void; onOpenNote: (projectId: number, noteId: string) => void }) {
  const status = match.request
  return <article className={`card network-card ${active ? 'cr-card--active' : ''}`} data-network={`match:${match.id}`}>
    <div className="network-card-head"><Avatar type={match.type} /><div><div className="cr-label">{matchLabels[match.type].label}</div><h2>{match.title}</h2></div>
      <button className="icon-button" aria-label="Descartar cruce" title="Descartar" disabled={busy} onClick={onDismiss}><X size={14} /></button></div>
    <p className="network-message">{match.message}</p>
    <p className="network-description">{match.description}</p>
    <NoteLink projectId={match.projectId} projectName={match.projectName} note={match.note} onOpenNote={onOpenNote} />
    <div className="network-actions">
      {!status ? <button className="primary" disabled={busy} onClick={onContact}>{busy ? <><LoaderCircle className="spin" size={14} />Preparando mensaje anónimo…</> : <><Mail size={14} />{match.type === 'partnership' ? 'Proponer partnership' : 'Contactar'}</>}</button>
        : <span className={`cr-chip ${status.status === 'accepted' ? 'cr-chip--validada' : status.status === 'rejected' ? 'cr-chip--supuesto' : 'cr-chip--en-validacion'}`}><span className="cr-chip__dot" />
          {status.status === 'accepted' ? 'Conectados' : status.direction === 'incoming' ? 'Te escribió: respondé arriba' : status.status === 'rejected' ? 'No aceptada' : 'Solicitud enviada'}</span>}
      {status?.status !== 'accepted' && <small className="cr-data">Anónimo hasta que acepte</small>}
    </div>
  </article>
}

function RequestCard({ request, active, busy, onRespond, onOpenNote }: { request: NetworkRequest; active: boolean; busy: boolean; onRespond: (accept: boolean) => Promise<void>; onOpenNote: (projectId: number, noteId: string) => void }) {
  return <article className={`card network-card network-request ${active ? 'cr-card--active' : ''}`} data-network={`request:${request.id}`}>
    <div className="network-card-head"><Avatar type={request.type} /><div><div className="cr-label">Solicitud · {matchLabels[request.type].label}</div><h2>{request.title}</h2></div></div>
    <p className="network-message">{request.message}</p>
    <p className="network-description">{request.description}</p>
    <NoteLink projectId={request.projectId} projectName={request.projectName} note={request.note} onOpenNote={onOpenNote} />
    <div className="network-actions">
      <button className="primary" disabled={busy} onClick={() => void onRespond(true)}>{busy ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}Aceptar y chatear</button>
      <button disabled={busy} onClick={() => void onRespond(false)}>Rechazar</button>
      <small className="cr-data">Al aceptar se abre un chat entre ambos</small>
    </div>
  </article>
}

function ConnectionRow({ request, onOpen }: { request: NetworkRequest; onOpen: () => void }) {
  const last = request.chat?.last, unread = request.chat?.unread ?? 0
  return <button className={`network-thread ${unread ? 'unread' : ''}`} data-network={`request:${request.id}`} onClick={onOpen}>
    <Avatar type={request.type} size={40} />
    <span className="network-thread-text"><strong>{request.contact?.projectName ?? 'Conexión'}</strong><span>{last ? `${last.mine ? 'Vos: ' : ''}${last.body}` : matchLabels[request.type].label}</span></span>
    <span className="network-thread-meta">{last && <time dateTime={last.createdAt}>{shortDate(last.createdAt)}</time>}{unread > 0 && <span className="nav-count" aria-label={`${unread} mensajes sin leer`}>{unread}</span>}</span>
  </button>
}

function activity(request: NetworkRequest) { return request.chat?.last?.createdAt ?? request.respondedAt ?? request.createdAt }
function shortDate(value: string) {
  const date = new Date(value)
  return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
}

function EmptyPeople({ onSearch, onJourney }: { onSearch: () => void; onJourney: () => void }) {
  return <div className="people-empty-layout"><section className="card people-empty"><div className="people-empty-art" aria-hidden="true"><span><Users size={30} /></span><span><GitMerge size={27} /></span></div><span className="eyebrow">LOS BUENOS ENCUENTROS TIENEN CONTEXTO</span><h2>Todavía no hay cruces para mostrar.</h2><p>Cuando tu problema y tus hipótesis se parezcan a los de otra persona de la red, te avisamos acá y con una notificación.</p><button className="primary" onClick={onJourney}>Seguir con mi proyecto<ArrowRight size={14} /></button></section><aside className="card people-context"><Search size={23} /><h2>Empezá por lo que ya aprendiste.</h2><p>La memoria de tus proyectos puede mostrarte problemas y aprendizajes relacionados.</p><button onClick={onSearch}>Explorar aprendizajes<ArrowRight size={14} /></button></aside></div>
}

function KarmaCard({ karma }: { karma: Karma }) {
  return <section className="card karma-card" aria-label="Karma">
    <div className="karma-score">
      <span className="eyebrow">KARMA</span>
      <strong>{karma.points}</strong>
      <p>{karma.accepted ? `Aceptaste conectar ${karma.accepted} ${karma.accepted === 1 ? 'vez' : 'veces'}${karma.rank ? ` · puesto ${karma.rank} de la red` : ''}.` : 'Todavía no aceptaste conectar con nadie.'} Sumás {karma.perAccept} puntos cada vez que aceptás hablar con otro founder.</p>
    </div>
    {karma.ranking.length > 0 && <ol className="karma-ranking">{karma.ranking.map(row => <li key={row.rank} className={row.you ? 'you' : ''}>
      <span className="karma-rank">{row.rank === 1 ? <Trophy size={14} /> : row.rank}</span><span className="karma-name">{row.label}</span><span className="karma-points">{row.points}</span>
    </li>)}</ol>}
  </section>
}
