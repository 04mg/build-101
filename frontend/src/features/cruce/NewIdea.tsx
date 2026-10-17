import { useState, type FormEvent } from 'react'
import { ArrowUp, LoaderCircle } from 'lucide-react'

export function NewIdea({ busy, onSubmit }: { busy: string; onSubmit: (idea: string) => Promise<boolean> }) {
  const [idea, setIdea] = useState('')
  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!busy && idea.trim()) await onSubmit(idea.trim())
  }
  return <div className="new-idea-page">
    <form className="new-idea-center" onSubmit={event => void submit(event)}>
      <h1>Contanos tu idea</h1>
      <p>Algo que te frustra, un problema que viste de cerca o una intuición. Vamos a encontrar el problema detrás.</p>
      <div className="idea-input"><textarea autoFocus aria-label="Tu idea" maxLength={2800} rows={3} value={idea} onChange={event => setIdea(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit() } }} placeholder="Ej: los kinesiólogos pierden horas coordinando turnos por WhatsApp…" disabled={Boolean(busy)} />
        <button className="assistant-send" aria-label="Empezar" disabled={Boolean(busy) || !idea.trim()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}</button></div>
    </form>
  </div>
}
