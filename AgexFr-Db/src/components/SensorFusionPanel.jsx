import { useEffect, useState } from 'react'
import { scenarios } from '../data/scenarios'
import { PanelHeader } from './PanelHeader'
import { Waveform } from './Waveform'

const severityStyle = {
  critical: 'text-crimson border-crimson/40 bg-crimson-dim',
  high: 'text-amber border-amber/40 bg-amber-dim',
}

export function SensorFusionPanel({ activeId, onSelect }) {
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    setLineIndex(0)
    const interval = setInterval(() => {
      setLineIndex((i) => (i + 1) % active.transcript.length)
    }, 4200)
    return () => clearInterval(interval)
  }, [active])

  return (
    <div className="flex h-full flex-col bg-panel">
      <PanelHeader label="Sensor Fusion Engine" sub="A" />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {scenarios.map((s) => {
          const isActive = s.id === active.id
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left rounded-md border px-3 py-2.5 transition-colors ${
                isActive
                  ? 'border-cyan/50 bg-cyan-dim'
                  : 'border-border bg-panel-raised hover:border-border-bright'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-slate-bright truncate">
                  {s.name}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${severityStyle[s.severity]}`}
                >
                  {s.severity}
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate">{s.region}</div>
            </button>
          )
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate">
            Voice Triage Module — Live
          </span>
        </div>

        <Waveform key={active.id} />

        <div className="mt-2 min-h-[36px] rounded bg-void/60 border border-border px-2.5 py-2">
          <p className="font-mono text-[11px] leading-snug text-slate-bright">
            {active.transcript[lineIndex]}
          </p>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {active.acousticTags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-amber/30 bg-amber-dim px-1.5 py-0.5 font-mono text-[10px] text-amber"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <Meter label="Victim Panic Rating" value={active.victimPanic} tone="crimson" />
          <Meter label="Biometric Stress Index" value={active.stressIndex} tone="amber" />
        </div>
      </div>
    </div>
  )
}

function Meter({ label, value, tone }) {
  const toneClass = tone === 'crimson' ? 'bg-crimson' : 'bg-amber'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate">
        <span>{label}</span>
        <span className="text-slate-bright">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${toneClass} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
