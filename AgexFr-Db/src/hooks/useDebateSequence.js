import { useEffect, useRef, useState } from 'react'

const STAGE_DELAY_MS = 1400
const TYPE_SPEED_MS = 14

// Plays a scenario's debate script as a scripted "live" sequence: messages
// appear one at a time, each typed out character-by-character, so Panel C
// reads as an execution loop rather than a static transcript.
export function useDebateSequence(script) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [phase, setPhase] = useState('ingest') // ingest | debate | resolved
  const timers = useRef([])

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setVisibleCount(0)
    setTypedText('')
    setPhase('ingest')

    if (!script || script.length === 0) return

    let cumulative = 600

    script.forEach((msg, i) => {
      const revealTimer = setTimeout(() => {
        setVisibleCount(i + 1)
        setTypedText('')
        setPhase(msg.kind === 'payload' ? 'resolved' : i === 0 ? 'ingest' : 'debate')

        let charIndex = 0
        const typeInterval = setInterval(() => {
          charIndex += 1
          setTypedText(msg.text.slice(0, charIndex))
          if (charIndex >= msg.text.length) clearInterval(typeInterval)
        }, TYPE_SPEED_MS)
        timers.current.push(typeInterval)
      }, cumulative)
      timers.current.push(revealTimer)

      cumulative += msg.text.length * TYPE_SPEED_MS + STAGE_DELAY_MS
    })

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current.forEach(clearInterval)
    }
  }, [script])

  return { visibleCount, typedText, phase }
}
