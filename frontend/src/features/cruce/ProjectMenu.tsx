import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, GitBranch, Plus } from 'lucide-react'
import type { Project, ProjectSummary } from './types'

export function ProjectMenu({ project, projects, disabled, onSelect }: { project: Project | null; projects: ProjectSummary[]; disabled: boolean; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [open])
  function choose(id: string) { setOpen(false); onSelect(id) }
  return <div className="project-menu" ref={root}>
    <button className="project-menu-trigger" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(value => !value)}>
      <span className="project-avatar">{initials(project?.name)}</span><strong>{project?.name ?? 'Nuevo proyecto'}</strong><ChevronDown size={15} className={open ? 'open' : ''} />
    </button>
    {open && <div className="project-menu-list" role="menu">
      {projects.map(item => <button key={item.id} role="menuitem" className={item.id === project?.id ? 'current' : ''} onClick={() => choose(String(item.id))}>
        <span className="project-avatar small">{initials(item.name)}</span><span className="project-menu-name">{item.name}</span>{item.parent && <GitBranch size={12} aria-label="Fork" />}{item.id === project?.id && <Check size={14} />}
      </button>)}
      <button role="menuitem" className="project-menu-new" onClick={() => choose('new')}><span className="project-avatar small ghost"><Plus size={13} /></span>Nuevo proyecto</button>
    </div>}
  </div>
}

function initials(name?: string) { return name ? name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() : '+' }
