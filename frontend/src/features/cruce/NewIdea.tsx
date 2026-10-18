import { useState, type FormEvent } from 'react'
import { ArrowUp, LoaderCircle } from 'lucide-react'
import { useVoiceInput } from './useVoiceInput'
import { VoiceInputButton } from './VoiceInputButton'
import { IntakeMicButton, IntakeVoiceStage, type IntakeVoice } from './IntakeVoice'

export function NewIdea({ busy, voice: realtime, onSubmit }: { busy: string; voice: IntakeVoice; onSubmit: (idea: string) => Promise<boolean> }) {
  const [idea, setIdea] = useState('')
  const voice = useVoiceInput({ value: idea, onChange: setIdea, disabled: Boolean(busy), maxLength: 2800 })
  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const text = voice.stop().trim()
    if (!busy && text) await onSubmit(text)
  }
  return <div className="new-idea-page">
    <form className="new-idea-center" onSubmit={event => void submit(event)}>
      <h1>Contanos tu idea</h1>
      <p>Algo que te frustra, un problema que viste de cerca o una intuición. Vamos a encontrar el problema detrás.</p>
      {/* By voice: the orb and the mic only, nothing to type or read. */}
      {realtime.enabled && realtime.voice ? <><IntakeVoiceStage voice={realtime} compact /><div className="intake-stage-controls"><IntakeMicButton voice={realtime} disabled={Boolean(busy)} /></div></> : <>
      <div className={`idea-input ${voice.listening ? 'voice-active' : ''}`}><textarea autoFocus aria-label="Tu idea" aria-live={voice.listening ? 'polite' : 'off'} maxLength={2800} rows={3} value={idea} onChange={event => { voice.stop(); setIdea(event.target.value) }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit() } }} placeholder={voice.listening ? 'Te escucho…' : 'Contanos qué tenés en mente, escribiendo o con tu voz…'} disabled={Boolean(busy)} />
        {realtime.enabled ? <IntakeMicButton voice={realtime} disabled={Boolean(busy)} /> : <VoiceInputButton voice={voice} disabled={Boolean(busy)} />}
        <button className="assistant-send" aria-label="Empezar" disabled={Boolean(busy) || !idea.trim()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}</button></div></>}
      {voice.listening && <p className="voice-input-status" role="status">Escuchando · el texto aparece en vivo.</p>}{(realtime.error || voice.error) && <p className="voice-input-status error" role="alert">{realtime.error || voice.error}</p>}
    </form>
  </div>
}
