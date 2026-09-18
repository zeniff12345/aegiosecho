import { useState } from 'react'
import { SensorFusionPanel } from './components/SensorFusionPanel'
import { SwarmDebateTerminal } from './components/SwarmDebateTerminal'
import { TacticalMapPanel } from './components/TacticalMapPanel'
import { TopBar } from './components/TopBar'
import { scenarios } from './data/scenarios'

function App() {
  const [activeId, setActiveId] = useState(scenarios[0].id)
  const [edgeMode, setEdgeMode] = useState(true)

  return (
    <div className="flex h-screen flex-col bg-void">
      <TopBar edgeMode={edgeMode} />

      <main className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-border lg:grid-cols-[minmax(0,320px)_1fr_minmax(0,360px)]">
        <div className="min-h-0 overflow-hidden">
          <SensorFusionPanel activeId={activeId} onSelect={setActiveId} />
        </div>
        <div className="min-h-0 overflow-hidden">
          <TacticalMapPanel
            activeId={activeId}
            edgeMode={edgeMode}
            onToggleEdge={() => setEdgeMode((v) => !v)}
          />
        </div>
        <div className="min-h-0 overflow-hidden">
          <SwarmDebateTerminal activeId={activeId} />
        </div>
      </main>
    </div>
  )
}

export default App
