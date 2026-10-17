import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, FileText, LoaderCircle, Sparkles, X } from 'lucide-react'
import { artifacts } from './phases'
import type { DeliverableKey, Project } from './types'

export function DeliverableEditor({ artifactKey, initialInstruction = '', project, busy, ai, onClose, onAction }: {
  artifactKey: DeliverableKey; initialInstruction?: string; project: Project; busy: string; ai: boolean; onClose: () => void; onAction: (action: Record<string, unknown>) => Promise<Project | null>;
}) {
  const definition = artifacts[artifactKey], note = project.document.nodes.find(n => n.id === `deliverable-${artifactKey}`)
  const [body, setBody] = useState(note?.body ?? ''), [instruction, setInstruction] = useState(initialInstruction)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close() }, [])
  async function generate() {
    const result = await onAction({ action: 'generate-deliverable', key: artifactKey, instruction })
    const generated = result?.document.nodes.find(n => n.id === `deliverable-${artifactKey}`)
    if (generated) setBody(generated.body)
  }
  async function save(event: FormEvent, approve = false) {
    event.preventDefault()
    if (!body.trim() || busy) return
    const result = await onAction({ action: 'deliverable', key: artifactKey, body, approve })
    if (result) onClose()
  }
  return <dialog ref={dialog} className="deliverable-dialog" aria-labelledby="deliverable-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
    <header className="deliverable-dialog-heading"><div><span className="eyebrow">{definition.phase} / ENTREGABLE</span><h2 id="deliverable-title"><FileText size={19} />{definition.title}</h2></div><button className="icon-button" aria-label="Cerrar entregable" disabled={Boolean(busy)} onClick={onClose}><X size={19} /></button></header>
    <p className="deliverable-description">{definition.description}</p>
    <form onSubmit={event => void save(event)}><label className="sr-only" htmlFor="deliverable-body">Contenido del entregable</label><textarea id="deliverable-body" autoFocus rows={13} value={body} maxLength={7500} onChange={event => setBody(event.target.value)} placeholder={definition.placeholder} disabled={Boolean(busy)} />
      <div className="deliverable-ai"><Sparkles size={15} /><input aria-label="Instrucción para ajustar con IA" value={instruction} maxLength={1000} onChange={event => setInstruction(event.target.value)} placeholder={body ? '¿Qué querés ajustar con IA?' : 'Una indicación para tu cofounder (opcional)'} disabled={Boolean(busy)} /><button type="button" onClick={() => void generate()} disabled={Boolean(busy) || !ai}>{busy ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}{body ? 'Iterar con IA' : 'Preparar con IA'}</button></div>
      <footer><span className="artifact-save-hint">{note?.status === 'done' ? 'Versión aprobada · podés seguir iterando' : 'Borrador · tu OK cierra este entregable'}</span><div><button disabled={Boolean(busy) || !body.trim()} type="submit">Guardar borrador</button><button className="primary" disabled={Boolean(busy) || !body.trim()} type="button" onClick={event => void save(event, true)}><Check size={15} />Dar OK</button></div></footer>
    </form>
  </dialog>
}
