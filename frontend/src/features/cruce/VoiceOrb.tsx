import { useEffect, useRef } from 'react'

export type OrbState = 'connecting' | 'listening' | 'hearing' | 'thinking' | 'speaking'

// Per state: swirl speed (deg/s), breathing period (s) and energy (glow 0–1).
const motion: Record<OrbState, { spin: number; breath: number; energy: number }> = {
  connecting: { spin: 18, breath: 1.6, energy: .15 },
  listening: { spin: 22, breath: 4, energy: .3 },
  hearing: { spin: 40, breath: 4, energy: .6 },
  thinking: { spin: 95, breath: 1.8, energy: .5 },
  speaking: { spin: 55, breath: 3, energy: .8 },
}

// A living orb for the voice conversation: it breathes while it listens, follows
// the founder's voice while they talk and the cofounder's voice while it answers.
// Every value is integrated here and written to CSS variables each frame, so a
// state change only eases speeds: the rotation never restarts or jumps.
export function VoiceOrb({ levels, state, size = 'large', onState }: {
  levels: () => { input: number; output: number }; state: OrbState; size?: 'large' | 'mini'; onState?: (state: OrbState) => void
}) {
  const orb = useRef<HTMLDivElement>(null)
  const base = useRef(state), report = useRef(onState)
  useEffect(() => { base.current = state; report.current = onState })
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0, last = performance.now(), shown: OrbState | null = null
    let level = 0, angle = 0, phase = 0, spin = motion[base.current].spin, breath = motion[base.current].breath, energy = motion[base.current].energy
    // Voices flicker around their thresholds; holding the state a moment keeps it steady.
    let voiceAt = -Infinity, micAt = -Infinity
    const tick = (now: number) => {
      const dt = Math.min(.05, (now - last) / 1000)
      last = now
      const { input, output } = levels()
      if (output > .03) voiceAt = now
      if (input > .08) micAt = now
      const live: OrbState = now - voiceAt < 450 ? 'speaking' : base.current === 'listening' && now - micAt < 350 ? 'hearing' : base.current
      const target = live === 'speaking' ? output : live === 'hearing' ? input : 0
      level += (target - level) * (1 - Math.exp(-dt * (target > level ? 18 : 6)))
      const goal = motion[live], ease = 1 - Math.exp(-dt * 2.5)
      spin += (goal.spin - spin) * ease; breath += (goal.breath - breath) * ease; energy += (goal.energy - energy) * ease
      if (!still) { angle = (angle + spin * dt) % 360; phase = (phase + dt * Math.PI * 2 / breath) % (Math.PI * 2) }
      const style = orb.current?.style
      if (style) {
        style.setProperty('--level', level.toFixed(3))
        style.setProperty('--energy', energy.toFixed(3))
        style.setProperty('--spin', `${angle.toFixed(2)}deg`)
        // Breathing fades out while a voice drives the size.
        style.setProperty('--scale', (.86 + (still ? 0 : Math.sin(phase) * .025 * (1 - level)) + level * .2).toFixed(4))
      }
      if (live !== shown) { shown = live; if (orb.current) orb.current.dataset.state = live; report.current?.(live) }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [levels])
  return <div ref={orb} className={`voice-orb ${size}`} data-state={state} aria-hidden="true">
    <span className="orb-ring" /><span className="orb-ring late" />
    <span className="orb-glow" />
    <span className="orb-body"><span className="orb-swirl" /><span className="orb-swirl second" /><span className="orb-core" /><span className="orb-sheen" /></span>
  </div>
}
