import { useEffect, useState } from 'react'

export function TopBar({ edgeMode }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-border bg-panel px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_8px_rgba(34,211,138,0.7)]" />
        <span className="font-mono text-sm font-bold uppercase tracking-widest text-slate-bright">
          Aegis Echo
        </span>
        <span className="hidden font-mono text-[11px] text-slate sm:inline">
          Decentralized Multi-Agent Triage Network
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            edgeMode
              ? 'border-emerald/40 bg-emerald-dim text-emerald'
              : 'border-cyan/40 bg-cyan-dim text-cyan'
          }`}
        >
          {edgeMode ? 'Grid-Down Ready' : 'Cloud Link'}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-slate">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </header>
  )
}
