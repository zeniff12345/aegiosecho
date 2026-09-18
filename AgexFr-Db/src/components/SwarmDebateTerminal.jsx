import { useEffect, useState } from 'react'
import { agentMeta, scenarios } from '../data/scenarios'
import { useDebateSequence } from '../hooks/useDebateSequence'
import { PanelHeader } from './PanelHeader'

const agentColor = {
  cyan: { text: 'text-cyan', border: 'border-cyan/40', bg: 'bg-cyan-dim' },
  amber: { text: 'text-amber', border: 'border-amber/40', bg: 'bg-amber-dim' },
  crimson: { text: 'text-crimson', border: 'border-crimson/40', bg: 'bg-crimson-dim' },
}

const kindBadge = {
  request: { label: 'REQUEST', tone: 'cyan' },
  reject: { label: 'FLAG / REJECT', tone: 'crimson' },
  counter: { label: 'COUNTER', tone: 'amber' },
  resolve: { label: 'RESOLVE', tone: 'crimson' },
  payload: { label: 'PAYLOAD', tone: 'crimson' },
}

const phaseLabel = {
  ingest: 'INGEST & SCORE DATA',
  debate: 'DEBATE PROTOCOL — CONFLICT DETECTED',
  resolved: 'DETERMINISTIC PAYLOAD READY',
}

export function SwarmDebateTerminal({ activeId }) {
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]
  const { visibleCount, typedText, phase } = useDebateSequence(active.debate)
  const [decision, setDecision] = useState(null) // null | 'approved' | 'denied'

  useEffect(() => setDecision(null), [activeId])

  const messages = active.debate.slice(0, visibleCount)
  const isTyping = visibleCount > 0 && visibleCount <= active.debate.length
  const lastMsg = active.debate[visibleCount - 1]
  const showAuthorize = phase === 'resolved' && lastMsg?.kind === 'payload'

  return (
    <div className="flex h-full flex-col bg-panel">
      <PanelHeader
        label="Adversarial Consensus Engine"
        sub="C"
        right={<PhaseBadge phase={phase} />}
      />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.map((msg, i) => {
          const meta = agentMeta[msg.agent]
          const colors = agentColor[meta.color]
          const isLast = i === messages.length - 1
          const text = isLast && isTyping ? typedText : msg.text
          const badge = kindBadge[msg.kind]

          return (
            <div key={i} className={`rounded-md border px-3 py-2 ${colors.border} ${colors.bg}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
                  {meta.short}
                </span>
                <span className="rounded border border-border-bright px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate">
                  {badge.label}
                </span>
              </div>
              <p className="font-mono text-[11.5px] leading-snug text-slate-bright">
                {text}
                {isLast && isTyping && text.length < msg.text.length && (
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-slate-bright align-middle" />
                )}
              </p>
            </div>
          )
        })}

        {visibleCount === 0 && (
          <div className="flex h-full items-center justify-center py-10">
            <span className="font-mono text-[11px] text-slate">Initializing node stream…</span>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {decision === null && (
          <button
            disabled={!showAuthorize}
            onClick={() => setDecision('approved')}
            className={`w-full rounded-md border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
              showAuthorize
                ? 'border-crimson bg-crimson-dim text-crimson shadow-[0_0_18px_rgba(255,59,78,0.35)] hover:bg-crimson/20 animate-pulse cursor-pointer'
                : 'border-border bg-panel-raised text-slate cursor-not-allowed opacity-60'
            }`}
          >
            Authorize Specific Critical Swarm Actions
          </button>
        )}

        {showAuthorize && decision === null && (
          <button
            onClick={() => setDecision('denied')}
            className="mt-2 w-full rounded-md border border-border-bright px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate hover:text-slate-bright"
          >
            Deny Payload
          </button>
        )}

        {decision === 'approved' && (
          <div className="rounded-md border border-emerald/40 bg-emerald-dim px-3 py-2.5 text-center font-mono text-xs font-semibold uppercase tracking-wider text-emerald">
            ✓ Swarm Actions Authorized — Executing
          </div>
        )}
        {decision === 'denied' && (
          <div className="rounded-md border border-crimson/40 bg-crimson-dim px-3 py-2.5 text-center font-mono text-xs font-semibold uppercase tracking-wider text-crimson">
            ✕ Payload Denied — Returned to Queue
          </div>
        )}
      </div>
    </div>
  )
}

function PhaseBadge({ phase }) {
  const tone = phase === 'resolved' ? 'text-emerald border-emerald/40 bg-emerald-dim' : phase === 'debate' ? 'text-amber border-amber/40 bg-amber-dim' : 'text-cyan border-cyan/40 bg-cyan-dim'
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${tone}`}>
      {phaseLabel[phase]}
    </span>
  )
}
