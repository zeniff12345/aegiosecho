// Mock disaster scenarios — fully offline, scripted to make the dashboard feel alive.

export const scenarios = [
  {
    id: 'balkhu',
    name: 'Balkhu River Flash Flood',
    region: 'Kathmandu Valley, Sector 4',
    coords: '27.6939° N, 85.2933° E',
    severity: 'critical',
    victimPanic: 87,
    stressIndex: 91,
    lifeThreat: 'IMMEDIATE',
    acousticTags: ['Rushing water detected', 'Structural cracking (faint)', 'Multiple voices, distressed'],
    transcript: [
      "...I— I can hear the water, it's rising fast, we're on the roof—",
      '...there were six of us, now I only see four, please—',
      '...the current took the footbridge, we cannot cross—',
    ],
    mapHazards: [
      { id: 'h1', x: 38, y: 52, radius: 'lg', label: 'Flood surge' },
      { id: 'h2', x: 44, y: 58, radius: 'md', label: 'Debris field' },
    ],
    mapAssets: [
      { id: 'a1', type: 'drone', x: 30, y: 40, target: { x: 38, y: 52 } },
      { id: 'a2', type: 'ground', x: 55, y: 70, target: { x: 44, y: 58 } },
      { id: 'a3', type: 'marine', x: 20, y: 65, target: { x: 38, y: 52 } },
    ],
    debate: [
      { agent: 'triage', kind: 'request', text: 'Victim cluster confirmed, coords locked. Panic 87%, life threat IMMEDIATE. Requesting fastest extraction asset to grid B4.' },
      { agent: 'logistics', kind: 'reject', text: 'Rejecting drone-only extraction. Wind gust telemetry at 41 km/h over river corridor — exceeds hover-stability threshold for Recon-3.' },
      { agent: 'triage', kind: 'counter', text: 'Time-to-hypothermia estimate: 22 min in current water temp. Delay for ground unit reroute costs ~9 min. Flagging as acceptable risk window.' },
      { agent: 'logistics', kind: 'counter', text: 'Marine unit M-2 has clear approach from south bank, ETA 11 min, survives current wind profile. Ground team blocked — footbridge down.' },
      { agent: 'commander', kind: 'resolve', text: 'Arbitration: dispatch Marine-2 as primary extraction, Ground-1 rerouted to staging as backup. Drone Recon-3 holds for aerial spotting only, altitude capped at 30m.' },
      { agent: 'commander', kind: 'payload', text: 'PAYLOAD READY — Marine-2 → Grid B4 · Ground-1 → Staging Alpha · Recon-3 → Spot/Hold' },
    ],
  },
  {
    id: 'sindhupalchok',
    name: 'Sindhupalchok Landslide Blockage',
    region: 'Sindhupalchok District, Ridge Road 7',
    coords: '27.9513° N, 85.6836° E',
    severity: 'high',
    victimPanic: 64,
    stressIndex: 58,
    lifeThreat: 'URGENT',
    acousticTags: ['Rockfall (intermittent)', 'Wind noise, high', 'Single voice, calm'],
    transcript: [
      "...the road is gone, completely, there's no way around on foot—",
      "...I have supplies for maybe two days, I'm not hurt, just stuck—",
      '...I can see the ridge trail but it looks unstable up there—',
    ],
    mapHazards: [
      { id: 'h1', x: 62, y: 30, radius: 'lg', label: 'Slide debris' },
      { id: 'h2', x: 58, y: 22, radius: 'sm', label: 'Unstable ridge' },
    ],
    mapAssets: [
      { id: 'a1', type: 'drone', x: 70, y: 20, target: { x: 62, y: 30 } },
      { id: 'a2', type: 'ground', x: 75, y: 45, target: { x: 62, y: 30 } },
    ],
    debate: [
      { agent: 'triage', kind: 'request', text: 'Single victim, stable condition, life threat URGENT not IMMEDIATE. Supply window ~48h. Requesting standard-priority extraction.' },
      { agent: 'logistics', kind: 'reject', text: 'Ground route blocked by debris field, est. 14m depth. Ridge trail flagged unstable by seismic aftershock model — rockfall risk 68%.' },
      { agent: 'logistics', kind: 'counter', text: 'Recommend drone-delivered supply drop now, defer ground extraction 6-8h pending geo-stability recheck.' },
      { agent: 'triage', kind: 'counter', text: 'Concur — victim not in immediate danger. Revising priority tier to STANDARD, hold for stability window.' },
      { agent: 'commander', kind: 'resolve', text: 'Arbitration: authorize supply drop via Recon-3 immediately. Ground extraction deferred, re-evaluate stability at T+6h.' },
      { agent: 'commander', kind: 'payload', text: 'PAYLOAD READY — Recon-3 → Supply Drop (Grid E7) · Ground-1 → Hold / Standby' },
    ],
  },
  {
    id: 'chautara',
    name: 'Chautara District Hospital Collapse',
    region: 'Chautara, Central Block',
    coords: '27.7883° N, 85.7166° E',
    severity: 'critical',
    victimPanic: 95,
    stressIndex: 97,
    lifeThreat: 'IMMEDIATE',
    acousticTags: ['Structural cracking (severe)', 'Alarm sirens', 'Multiple voices, panicked'],
    transcript: [
      "...the east wing came down, there are people under it, we hear them—",
      '...the generator room is on fire, smoke is getting into the stairwell—',
      "...we don't have enough hands, please send anyone—",
    ],
    mapHazards: [
      { id: 'h1', x: 48, y: 44, radius: 'lg', label: 'Structural collapse' },
      { id: 'h2', x: 52, y: 40, radius: 'md', label: 'Active fire' },
    ],
    mapAssets: [
      { id: 'a1', type: 'ground', x: 30, y: 30, target: { x: 48, y: 44 } },
      { id: 'a2', type: 'ground', x: 60, y: 60, target: { x: 48, y: 44 } },
      { id: 'a3', type: 'drone', x: 40, y: 20, target: { x: 52, y: 40 } },
    ],
    debate: [
      { agent: 'triage', kind: 'request', text: 'Mass casualty event, panic 95%, multiple trapped. Requesting all-available ground teams, priority MAXIMUM.' },
      { agent: 'logistics', kind: 'reject', text: 'Fire in generator room risks secondary structural failure. Full team commit exceeds safe-egress margin — recommend staged entry.' },
      { agent: 'triage', kind: 'counter', text: 'Trapped victim count rising in audio feed. Staged entry adds est. 6-10 min per wave — acceptable only if fire is contained first.' },
      { agent: 'logistics', kind: 'counter', text: 'Ground-1 diverted to suppress generator fire before entry. Ground-2 stages at east wing perimeter, holds for clearance signal.' },
      { agent: 'commander', kind: 'resolve', text: 'Arbitration: Ground-1 → fire suppression priority. Ground-2 → staged entry on clearance. Drone overwatch for real-time structural monitoring.' },
      { agent: 'commander', kind: 'payload', text: 'PAYLOAD READY — Ground-1 → Suppress/Contain · Ground-2 → Staged Entry (on signal) · Recon-3 → Structural Overwatch' },
    ],
  },
]

export const agentMeta = {
  triage: { label: 'SEMANTIC TRIAGE NODE', short: 'TRIAGE', color: 'cyan' },
  logistics: { label: 'KINEMATIC LOGISTICS ROUTER', short: 'LOGISTICS', color: 'amber' },
  commander: { label: 'COMMAND ARBITRATION AGENT', short: 'COMMANDER', color: 'crimson' },
}
