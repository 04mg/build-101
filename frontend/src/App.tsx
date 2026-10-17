import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, LoaderCircle, LogOut, Route, Users, X } from 'lucide-react'
import { getSession, signOut } from '@/features/agent-demo/api/session'
import { ApiError, createProject, getProject, listProjects, researchProject, updateProject } from '@/features/cruce/api'
import { AssistantBar } from '@/features/cruce/AssistantBar'
import { AuthPage } from '@/features/cruce/AuthPage'
import { DeliverableEditor } from '@/features/cruce/DeliverableEditor'
import { DiscoverWorkspace, type DiscoverPanel } from '@/features/cruce/DiscoverWorkspace'
import { MemorySearch } from '@/features/cruce/MemorySearch'
import { NewIdea } from '@/features/cruce/NewIdea'
import { People } from '@/features/cruce/People'
import { PhaseWorkspace } from '@/features/cruce/PhaseWorkspace'
import { ProblemChat } from '@/features/cruce/ProblemChat'
import { ProjectMenu } from '@/features/cruce/ProjectMenu'
import { Timeline } from '@/features/cruce/Timeline'
import { artifacts, phasePercent, phases } from '@/features/cruce/phases'
import { initialQuestion, type AssistantReply, type Capabilities, type DeliverableKey, type EditTarget, type MemoryHit, type PhaseId, type Project, type ProjectSummary, type Question } from '@/features/cruce/types'

type Page = 'ideation' | 'journey' | 'people' | 'phase'

export default function App() {
  const [session, setSession] = useState<'loading' | 'signed-in' | 'signed-out'>('loading')
  const [projects, setProjects] = useState<ProjectSummary[]>([]), [project, setProject] = useState<Project | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities>({ ai: false, research: false, semanticMemory: false })
  const [page, setPage] = useState<Page>('ideation'), [phase, setPhase] = useState<PhaseId>('discover'), [navOpen, setNavOpen] = useState(true)
  const [selected, setSelected] = useState<string | null>(null), [panel, setPanel] = useState<DiscoverPanel>('journey')
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [warning, setWarning] = useState('')
  const [search, setSearch] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<{ key: DeliverableKey; instruction?: string } | null>(null)
  const [editing, setEditing] = useState<EditTarget[]>([])
  const currentRef = useRef(project), busyRef = useRef(false), loadSequence = useRef(0)

  const accept = useCallback((result: Project) => {
    setProject(result); currentRef.current = result; setPhase(result.document.activePhase ?? 'discover')
    try { sessionStorage.setItem('cruce-project', String(result.id)) } catch { /* Optional navigation preference. */ }
    setProjects(existing => {
      const summary = { id: result.id, name: result.name, progress: result.progress, phaseProgress: result.phaseProgress, activePhase: result.document.activePhase, parent: result.document.parent }
      return existing.some(p => p.id === result.id) ? existing.map(p => p.id === result.id ? summary : p) : [...existing, summary]
    })
    if (result.warning) setWarning(result.warning)
  }, [])

  const initialize = useCallback(async () => {
    try {
      const result = await getSession()
      if (!result.auth_token) { setSession('signed-out'); return }
      if (window.location.pathname === '/login') {
        const destination = new URLSearchParams(window.location.search).get('redirect_uri')
        if (destination?.startsWith('/_/admin') || destination === '/_/') { window.location.replace('/_/admin/'); return }
        window.history.replaceState(null, '', '/')
      }
      const data = await listProjects()
      setProjects(data.projects); setCapabilities(data.capabilities); setSession('signed-in')
      let remembered: string | null = null
      try { remembered = sessionStorage.getItem('cruce-project') } catch { /* Storage may be disabled. */ }
      if (remembered && data.projects.some(p => String(p.id) === remembered)) {
        const loaded = await getProject(Number(remembered)); accept(loaded)
        setPage(loaded.document.activePhase === 'discover' ? 'ideation' : 'phase')
      }
    } catch (cause) { setSession('signed-out'); setError(message(cause)) }
  }, [accept])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) return initialize() })
    return () => { active = false }
  }, [initialize])

  const projectId = project?.id, researchStatus = project?.document.research.status
  useEffect(() => {
    if (!projectId || researchStatus !== 'running') return
    const timer = window.setInterval(() => {
      void getProject(projectId).then(result => {
        if (currentRef.current?.id === projectId && result.document.revision >= currentRef.current.document.revision) accept(result)
      }).catch(() => { /* The foreground request reports errors. */ })
    }, 2500)
    return () => clearInterval(timer)
  }, [projectId, researchStatus, accept])

  async function selectProject(id: string, nodeId?: string) {
    if (busyRef.current) return
    const sequence = ++loadSequence.current
    setError(''); setWarning(''); setSelected(null); setPanel('journey'); setArtifact(null); setPage('ideation'); setPhase('discover')
    if (id === 'new') {
      setProject(null); currentRef.current = null
      try { sessionStorage.removeItem('cruce-project') } catch { /* Optional. */ }
      return
    }
    busyRef.current = true; setBusy('loading')
    try {
      const result = await getProject(Number(id))
      if (sequence === loadSequence.current) {
        accept(result)
        if (nodeId) {
          const key = nodeId.replace(/^deliverable-/, '')
          if (nodeId.startsWith('deliverable-') && key in artifacts) setArtifact({ key: key as DeliverableKey })
          else { setSelected(nodeId); setPanel('note'); setPhase('discover') }
        } else setPage(result.document.activePhase === 'discover' ? 'ideation' : 'phase')
      }
    } catch (cause) { setError(message(cause)) }
    finally { busyRef.current = false; setBusy('') }
  }

  async function runResearch(id = currentRef.current?.id) {
    if (!id || busyRef.current) return
    busyRef.current = true; setBusy('research'); setError('')
    setProject(p => p?.id === id ? { ...p, document: { ...p.document, research: { status: 'running', message: 'Buscando alternativas, experiencias y contraejemplos…' } } } : p)
    try { accept(await researchProject(id)) }
    catch (cause) {
      setError(message(cause))
      try { accept(await getProject(id)) } catch { /* Keep the last persisted view. */ }
    } finally { busyRef.current = false; setBusy('') }
  }

  async function mutate(action: Record<string, unknown>): Promise<Project | null> {
    const active = currentRef.current
    if (!active || busyRef.current) return null
    busyRef.current = true
    setBusy(action.action === 'answer' || action.action === 'assist' ? 'thinking' : action.action === 'assist-apply' ? 'editing' : action.action === 'generate-deliverable' ? 'generating' : 'save')
    setError(''); setWarning('')
    let result: Project | null = null
    try {
      result = await updateProject(active, action); accept(result)
      if (action.action === 'fork') { setSelected(null); setPanel('journey'); setPage('ideation'); setPhase('discover') }
    } catch (cause) {
      setError(message(cause))
      if (cause instanceof ApiError && cause.status === 409) {
        try { accept(await getProject(active.id)) } catch { /* Display original conflict. */ }
      }
    } finally { busyRef.current = false; setBusy('') }
    if (result && action.action === 'confirm' && capabilities.research) void runResearch(result.id)
    return result
  }

  async function answer(value: string, question: Question) {
    if (currentRef.current) return Boolean(await mutate({ action: 'answer', value, questionId: question.id }))
    if (busyRef.current) return false
    busyRef.current = true; setBusy('thinking'); setError(''); setWarning('')
    try { accept(await createProject(value)); setPage('ideation'); return true }
    catch (cause) { setError(message(cause)); return false }
    finally { busyRef.current = false; setBusy('') }
  }

  async function openPhase(next: PhaseId) {
    if (busyRef.current) return
    setSelected(null); setPanel('journey'); setPhase(next); setPage(next === 'discover' ? 'ideation' : 'phase')
    if (currentRef.current && currentRef.current.document.activePhase !== next) await mutate({ action: 'phase', phase: next })
  }
  function openArtifact(key: DeliverableKey, instruction?: string) { if (project && !busyRef.current) setArtifact({ key, instruction }) }
  function selectNote(id: string | null) {
    const key = id?.replace(/^deliverable-/, '')
    if (id?.startsWith('deliverable-') && key && key in artifacts) { openArtifact(key as DeliverableKey); return }
    setSelected(id); setPanel(id ? 'note' : 'journey')
  }
  function openPanel(next: DiscoverPanel, hypothesisId?: string) { setSelected(hypothesisId ?? null); setPanel(next) }
  async function reference(hit: MemoryHit) {
    const result = await mutate({ action: 'reference', projectId: hit.projectId, nodeId: hit.note.id })
    if (result) { setSearch(null); setPage('ideation'); setPhase('discover'); selectNote(`reference-${hit.projectId}-${hit.note.id}`) }
  }
  // On the Discover map the assistant can change notes: it plans first, the canvas
  // focuses those notes as skeletons, and a second call writes them.
  async function ask(question: string, onPlan: (reply: AssistantReply) => void) {
    if (!currentRef.current) return await answer(question, initialQuestion) ? currentRef.current : null
    const canEdit = page === 'ideation' && phase === 'discover' && currentRef.current.document.confirmed
    const planned = await mutate({ action: 'assist', question, ...(canEdit ? { edit: true, ...(selected ? { selected } : {}) } : {}) })
    if (!planned?.edit) return planned
    const reopen = selected
    if (planned.assistant) onPlan(planned.assistant)
    setSelected(null); setPanel('journey'); setEditing(planned.edit.targets)
    try {
      const applied = await mutate({ action: 'assist-apply', ...planned.edit })
      if (reopen && applied?.document.nodes.some(n => n.id === reopen)) { setSelected(reopen); setPanel('note') }
      return applied
    } finally { setEditing([]) }
  }
  async function navigateReply(reply: AssistantReply) {
    if (reply.destination === 'timeline') { setPage('journey'); return }
    if (reply.destination === 'people') { setPage('people'); return }
    await openPhase(reply.destination === 'evidence' || reply.destination === 'research' ? 'discover' : reply.phase)
    if (reply.destination === 'evidence' && project?.document.nodes.some(n => n.kind === 'hypothesis')) openPanel('evidence')
    if (reply.destination === 'research' && currentRef.current?.document.confirmed) void runResearch()
  }
  async function logout() {
    if (busyRef.current) return
    try { await signOut(); setSession('signed-out'); setProjects([]); setProject(null); currentRef.current = null; setSelected(null); setPanel('journey'); setSearch(null); setArtifact(null) }
    catch (cause) { setError(message(cause)) }
  }

  if (session === 'loading') return <div className="loading-workspace full-page"><LoaderCircle className="spin" size={22} /><span>Abriendo tu espacio…</span></div>
  if (session === 'signed-out') return <AuthPage initialError={error} onSignedIn={() => { setError(''); void initialize() }} />

  const isBusy = Boolean(busy)
  // Until the problem is defined, Discover is a focused conversation without the global bar.
  const defining = page === 'ideation' && (!project || !project.document.confirmed)
  return <div className="cruce-app">
    <aside className="app-sidebar"><button className="brand-wordmark" aria-label="cruce, ir al recorrido" onClick={() => setPage('journey')}>cruce</button>
      <ProjectMenu project={project} projects={projects} disabled={isBusy} onSelect={id => void selectProject(id)} />
      <nav className="main-navigation" aria-label="Proyecto">
        <div className={`nav-split ${page === 'journey' ? 'active' : ''}`}><button className="nav-item" aria-current={page === 'journey' ? 'page' : undefined} onClick={() => setPage('journey')}><Route size={17} />Recorrido</button><button className={`nav-chevron ${navOpen ? 'open' : ''}`} aria-label={navOpen ? 'Ocultar fases' : 'Mostrar fases'} aria-expanded={navOpen} onClick={() => setNavOpen(open => !open)}><ChevronDown size={15} /></button></div>
        {navOpen && <div className="phase-navigation">{phases.map(item => {
          const percent = phasePercent(project, item.id)
          return <button key={item.id} disabled={isBusy} className={`phase-nav-item ${(page === 'ideation' && item.id === 'discover') || (page === 'phase' && phase === item.id) ? 'selected' : ''}`} onClick={() => void openPhase(item.id)}><span className={`phase-dot ${percent === 100 ? 'complete' : item.id === (project?.document.activePhase ?? 'discover') ? 'current' : ''}`} aria-hidden="true" /><span>{item.name}</span><small>{percent}%</small></button>
        })}</div>}
        <button className={`nav-item ${page === 'people' ? 'active' : ''}`} aria-current={page === 'people' ? 'page' : undefined} onClick={() => setPage('people')}><Users size={17} />Personas</button>
      </nav><div className="sidebar-bottom"><div className="sidebar-account"><span className="account-avatar">A</span><div><strong>Tu espacio</strong></div><button className="icon-button" disabled={isBusy} aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void logout()}><LogOut size={15} /></button></div></div>
    </aside>
    <main className="app-main">
      {(error || warning) && <div className={`notice-bar ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}><span>{error || warning}</span><button className="icon-button" aria-label="Cerrar aviso" onClick={() => { setError(''); setWarning('') }}><X size={14} /></button></div>}
      {page === 'journey' ? <Timeline project={project} busy={isBusy} onPhase={next => void openPhase(next)} onArtifact={openArtifact} onStart={() => { void selectProject('new') }} /> : page === 'people' ? <People onSearch={() => setSearch('')} onJourney={() => setPage('journey')} /> : page === 'phase' ? <PhaseWorkspace phase={phase} project={project} busy={isBusy} onArtifact={openArtifact} onTimeline={() => setPage('journey')} onPhase={next => void openPhase(next)} onStart={() => void selectProject('new')} /> : !project ? <NewIdea busy={busy} onSubmit={value => answer(value, initialQuestion)} /> : !project.document.confirmed ? <ProblemChat project={project} busy={busy} onAnswer={answer} onAction={mutate} /> : <DiscoverWorkspace project={project} capabilities={capabilities} busy={busy} selected={selected} panel={panel} onSelect={selectNote} onPanel={openPanel} onAnswer={answer} onAction={mutate} onResearch={() => void runResearch()} onSearch={setSearch} editing={editing} />}
    </main>
    {!defining && <AssistantBar key={project?.id ?? 'new'} history={project?.document.assistant ?? []} phase={phase} busy={busy} disabled={!capabilities.ai || Boolean(artifact) || search !== null} onAsk={ask} onNavigate={reply => void navigateReply(reply)} />}
    {artifact && project && <DeliverableEditor key={`${project.id}-${artifact.key}-${artifact.instruction ?? ''}`} artifactKey={artifact.key} initialInstruction={artifact.instruction} project={project} busy={busy} ai={capabilities.ai} onClose={() => setArtifact(null)} onAction={mutate} />}
    {search !== null && <MemorySearch initial={search} projects={projects} currentId={project?.id} busy={isBusy} onClose={() => setSearch(null)} onOpen={(id, nodeId) => { if (!busyRef.current) { setSearch(null); void selectProject(String(id), nodeId) } }} onReference={hit => void reference(hit)} />}
  </div>
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : 'No se pudo completar la acción.' }
