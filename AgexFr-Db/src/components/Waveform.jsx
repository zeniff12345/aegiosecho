import { useEffect, useRef } from 'react'

// Animated fake audio waveform — canvas-drawn bars that bounce continuously
// to sell the "live incoming call" feeling without any real audio input.
export function Waveform() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const barCount = 48
    const phases = Array.from({ length: barCount }, () => Math.random() * Math.PI * 2)
    let raf

    function draw(t) {
      ctx.clearRect(0, 0, width, height)
      const barWidth = width / barCount
      for (let i = 0; i < barCount; i++) {
        const speed = 0.0028 + (i % 5) * 0.0004
        const amp = 0.25 + 0.7 * Math.abs(Math.sin(t * speed + phases[i]))
        const h = Math.max(2, amp * height)
        const x = i * barWidth
        const y = (height - h) / 2
        ctx.fillStyle = i % 7 === 0 ? '#ff3b4e' : '#35c4e8'
        ctx.globalAlpha = 0.55 + amp * 0.45
        ctx.fillRect(x + 1, y, barWidth - 2, h)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="h-14 w-full rounded border border-border bg-void/60"
    />
  )
}
