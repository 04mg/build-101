import { LoaderCircle, Mic } from 'lucide-react'
import type { useRealtimeIntake } from './useRealtimeIntake'
import { VoiceOrb, type OrbState } from './VoiceOrb'

// Voice controls for the Discover grill on GPT-Realtime, shared by the idea
// input and the problem chat. They replace the browser dictation when enabled.
export type IntakeVoice = ReturnType<typeof useRealtimeIntake>

export function intakeOrbState(voice: IntakeVoice): OrbState {
  return voice.status === 'connecting' ? 'connecting' : voice.phase === 'saving' || voice.phase === 'framing' ? 'thinking' : 'listening'
}

export function intakeVoiceLabel(voice: IntakeVoice) {
  return voice.status === 'connecting' ? 'Conectando con tu cofounder…' : voice.phase === 'saving' ? 'Anotando en tu mapa…' : voice.phase === 'framing' ? 'Pensando…' : voice.phase === 'speaking' ? 'Tu cofounder te está hablando' : 'Te escucho'
}

export function IntakeMicButton({ voice, disabled }: { voice: IntakeVoice; disabled: boolean }) {
  const live = voice.voice
  return <button type="button" className={`assistant-mic ${live ? 'live' : ''}`} aria-label={live ? 'Terminar conversación por voz' : 'Hablar con tu cofounder'} title={live ? 'Terminar conversación por voz' : 'Hablar con tu cofounder'} aria-pressed={live} disabled={disabled || voice.status === 'connecting'} onClick={() => void voice.toggleVoice()}>
    {live ? <VoiceOrb levels={voice.levels} state={intakeOrbState(voice)} size="mini" /> : voice.status === 'connecting' ? <LoaderCircle size={17} className="spin" /> : <Mic size={18} />}
  </button>
}

/** A voice conversation shows no text: the orb and what it is doing (listening, thinking, speaking). */
export function IntakeVoiceStage({ voice, compact = false }: { voice: IntakeVoice; compact?: boolean }) {
  return <div className={compact ? 'intake-voice' : 'intake-stage'}>
    <VoiceOrb levels={voice.levels} state={intakeOrbState(voice)} />
    <p className="assistant-voice-state" role="status">{intakeVoiceLabel(voice)}</p>
  </div>
}
