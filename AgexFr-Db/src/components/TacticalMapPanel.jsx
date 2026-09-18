import { scenarios } from '../data/scenarios'
import { PanelHeader } from './PanelHeader'

const assetIcon = { drone: '▲', ground: '■', marine: '●' }
const radiusPx = { sm: 40, md: 70, lg: 110 }

export function TacticalMapPanel({ activeId, edgeMode, onToggleEdge }) {
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]

  return (
    <div className="flex h-full flex-col bg-panel">
      <PanelHeader
        label="Spatial Telemetry & Grid Mapping"
        sub="B"
        right={
          <button
            onClick={onToggleEdge}
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider transition-colors ${
              edgeMode
                ? 'border-emerald/50 bg-emerald-dim text-emerald'
                : 'border-cyan/50 bg-cyan-dim text-cyan'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${edgeMode ? 'bg-emerald animate-pulse' : 'bg-cyan'}`}
            />
            {edgeMode ? 'Decentralized Edge · 100% Offline' : 'Cloud Dependent Mode'}
          </button>
        }
      />

      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="font-mono text-[11px] text-slate">
          {active.name} — {active.coords}
        </div>
        <div className="font-mono text-[10px] text-slate">
          SYSTEM STATUS:{' '}
          <span className={edgeMode ? 'text-emerald' : 'text-cyan'}>
            {edgeMode ? 'LOCAL EDGE OPERATIONS' : 'CLOUD LINK ACTIVE'}
          </span>
        </div>
      </div>

      <div className="relative m-3 flex-1 overflow-hidden rounded-md border border-border bg-void">
        <GridBackdrop />

        {active.mapHazards.map((h) => (
          <div
            key={h.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber/50"
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: radiusPx[h.radius],
              height: radiusPx[h.radius],
              background:
                'radial-gradient(circle, rgba(255,176,32,0.18) 0%, rgba(255,176,32,0.04) 70%, transparent 100%)',
            }}
          >
            <span className="absolute -translate-x-1/2 -translate-y-full left-1/2 -top-1 whitespace-nowrap rounded bg-void/80 px-1.5 py-0.5 font-mono text-[9px] text-amber">
              {h.label}
            </span>
            <div className="absolute inset-0 rounded-full border border-amber/30 animate-ping" />
          </div>
        ))}

        {active.mapAssets.map((a) => (
          <AssetMarker key={a.id} asset={a} />
        ))}
      </div>

      <div className="flex items-center gap-4 border-t border-border px-3 py-2 font-mono text-[10px] text-slate">
        <Legend icon="▲" label="Drone" />
        <Legend icon="■" label="Ground Team" />
        <Legend icon="●" label="Marine Unit" />
        <span className="ml-auto flex items-center gap-1.5 text-amber">
          <span className="h-2 w-2 rounded-full border border-amber/60" /> Hazard Zone
        </span>
      </div>
    </div>
  )
}

function AssetMarker({ asset }) {
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
        <line
          x1={`${asset.x}%`}
          y1={`${asset.y}%`}
          x2={`${asset.target.x}%`}
          y2={`${asset.target.y}%`}
          stroke="#22d38a"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.5"
        />
      </svg>
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
        style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald/60 bg-emerald-dim text-[10px] text-emerald">
          {assetIcon[asset.type]}
        </span>
      </div>
    </>
  )
}

function Legend({ icon, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-emerald">{icon}</span> {label}
    </span>
  )
}

function GridBackdrop() {
  return (
    <div
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          'linear-gradient(#1c2028 1px, transparent 1px), linear-gradient(90deg, #1c2028 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  )
}
