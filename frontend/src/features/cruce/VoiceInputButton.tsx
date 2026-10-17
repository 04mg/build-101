import { Mic, Square } from 'lucide-react'
import type { useVoiceInput } from './useVoiceInput'

export function VoiceInputButton({ voice, disabled }: { voice: ReturnType<typeof useVoiceInput>; disabled: boolean }) {
  return <button type="button" className={`voice-input-button ${voice.listening ? 'listening' : ''}`} aria-label={voice.listening ? 'Detener dictado' : 'Dictar con el micrófono'} title={voice.listening ? 'Detener dictado' : 'Dictar con el micrófono'} aria-pressed={voice.listening} disabled={disabled} onClick={voice.toggle}>{voice.listening ? <Square size={16} /> : <Mic size={18} />}</button>
}
