# Aegis Echo — Cascade Chain Pivot (Project Brief v2)

**Status:** planning / spec only. No code has been changed to implement this —
this file replaces the old Live Voice Intake concept as the project's next
direction, on paper, until you decide what to build.

## Why the pivot

The old pitch's signal-ingestion story was a single live microphone call —
good for a stage demo, but it modeled exactly one victim at a time and
needed real hardware audio input to look convincing. The new direction
ingests a **JSON event payload** describing a real, verified regional
disaster chain instead: broader in scope, fully reproducible offline with no
mic/browser permission dependency, and grounded in two real, documented
events in the same river corridor rather than a mocked transcript.

## Ground truth: the Rasuwa corridor, two events

Full sourcing lives in `RASUWA_CASCADE_ANALYSIS.md` (uploaded alongside this
brief) — treat that file as the canonical reference for demo data. Summary:

**Event 1 — 8 July 2025 (GLOF, smaller, the warning shot).** A supraglacial
lake on the Purepu Glacier in Tibet drained into the Lhende River and down
into the Bhotekoshi. It swept the Miteri/Friendship Bridge, flooded the
Timure customs yard, killed 9 (19 missing), cut 16km of the
Syaphrubesi–Rasuwagadhi road, knocked out 10+ hydropower stations
(~250MW), and blacked out power and communications. One-way traffic
resumed after 13 days, then the route was re-blocked three weeks later.
The lesson the report draws out explicitly: even with the lake being
monitored, there was still no cross-border early warning in time.

**Event 2 — 26 August 2026, ~09:38 (rock-ice avalanche → debris flood,
catastrophic).** Not a GLOF, not triggered by rain — on a clear day, roughly
100 million m³ of bedrock and glacial ice broke off Langtang Lirung at
~5200m, fell 2000m, and hit the Lhende River at an estimated 160 km/h. The
impact energy melted ice and entrained rock and sediment into the flow. It
blocked the river for 18–19 hours before bursting the next morning, then
ran down the same Bhotekoshi/Trishuli corridor through Rasuwa and Nuwakot,
destructive even 100km downstream because of the canalized canyon. It's the
deadliest extreme-flow event on record in Nepal, destroying the same
bridges, hydropower stations, substations, and trade infrastructure Event 1
had already hit — plus more. Two new barrier lakes have since formed
upstream and could plausibly breach again, and the monsoon isn't over.

**Why this matters for design:** the same warning-time problem repeated
across both events despite different triggers (GLOF vs. avalanche). That's
the actual gap this pivot should target — not "detect one call," but "fuse
signals fast enough up the whole chain, twice, in the same place."

## The 5-link cascade chain to model

```
1. SOURCE: glacier/slope instability (satellite + temperature + seismic tremor)
   → 2. MOBILIZATION: avalanche volume + velocity + sediment entrainment
   → 3. RIVER: blockage / surge height + travel time downstream
   → 4. INFRA: bridges, roads, hydros, grid, comms, dry port (interdependent)
   → 5. HUMAN/LOGISTICS: stranded people, casualties, warehouses, convoys,
        landing zones, relief gap
```

Each link has a different lead time, which is the actual design constraint:

| Link | Lead time | What it demands |
|---|---|---|
| 1. Source | days–weeks | Monitoring |
| 2–3. Mobilization / River | minutes–hours | Warning |
| 4–5. Infra / Human-Logistics | hours–days | Response & sustainment |

Conventional downstream rain gauges only ever see links 4–5 — they miss the
two upstream links (1–2) entirely, which is exactly what happened in both
real events. A dashboard fusing satellite + tremor + lake-area + river
sensors + live infra status into one timeline is the gap this pivot is
meant to close.

## New data flow / architecture

This matches the flow diagram already sketched for the pivot:

```
[ HUMAN OPERATOR ]  (Nepal Army Command)
        |
        | 1. Selects / feeds a JSON event payload
        v
+------------------------------------------------------------------+
|                     AEGIS ECHO AGENT ENGINE                      |
|                                                                    |
|  [ Triage AI ]     -> Parses impact severity & casualty priorities|
|         |              from event metrics.                        |
|         v                                                          |
|  [ Logistics AI ]  -> Evaluates terrain blockages, bridge outages, |
|         |              computes viable rescue corridors.           |
|         v                                                          |
|  [ Commander AI ]  -> Arbitrates resource bottlenecks, resolves    |
|                        deadlocks, forms final consensus.           |
+------------------------------------------------------------------+
        |
        | 2. Outputs a consensus mission plan
        v
[ OPERATOR DASHBOARD ]  (Actionable orders & human approval gate)
```

The core shape doesn't actually change from what's already built: Triage →
Logistics → Commander → human-approval gate is the same three-agent debate
architecture already in `js/triageAgent.js`, `js/logisticsAgent.js`,
`js/commanderAgent.js`, and `js/debateEngine.js`. What changes is the
**input model** — instead of one free-text transcript from a live call, the
input becomes a structured JSON payload describing where a given scenario
sits across all 5 cascade links at once, and each agent reads the slice of
that payload relevant to its job:

- **Triage AI** reads link 1–2 fields (source instability signals,
  mobilization volume/velocity) plus casualty/impact metrics to score
  severity — this is a superset of what `triageAgent.js` already does with
  `hazardTag` and `stressIndex`.
- **Logistics AI** reads link 3–4 fields (surge/travel-time, bridge/road/
  hydro status) to compute which rescue corridors are actually physically
  viable — this is what `logisticsAgent.js`'s `logisticsRisk` check already
  approximates, just fed richer structured data instead of one text string.
- **Commander AI** reads link 5 (stranded people, casualties, relief gap)
  alongside both other agents' outputs to arbitrate and produce the final
  consensus plan — the same role `commanderAgent.js` plays today.

## Sketch: what a cascade JSON event payload could look like

Not implemented — for discussion only, to show how the 5 links could map to
fields an operator would actually select/feed in:

```json
{
  "eventId": "rasuwa-cascade-2026-08-26",
  "corridor": "Lhende / Bhotekoshi-Trishuli",
  "source": {
    "instabilityDetected": true,
    "elevationM": 5200,
    "seismicTremorMs": 5.2,
    "leadTimeWindow": "days-weeks"
  },
  "mobilization": {
    "trigger": "rock-ice avalanche",
    "volumeM3": 100000000,
    "velocityKmh": 160,
    "sedimentEntrainment": "high"
  },
  "river": {
    "blockageHours": 18.5,
    "surgeHeightM": null,
    "travelTimeDownstreamMin": null
  },
  "infra": {
    "bridgesOut": ["Miteri / Friendship Bridge"],
    "roadsCutKm": 16,
    "hydropowerOfflineMw": 250,
    "commsBlackout": true,
    "dryPortStatus": "crippled"
  },
  "humanLogistics": {
    "strandedEstimate": "~X (simulated)",
    "casualtiesConfirmed": "~X (simulated)",
    "reliefGap": "warehouses/convoys/LZs unreachable"
  }
}
```

## What's intentionally left open

- Whether the existing `dashboard.html` UI gets a new panel for the 5-link
  timeline, or the cascade data feeds into the existing 3-panel layout, is
  not decided here.
- Whether `data/scenarios.json` gets restructured to this shape, or a new
  cascade-specific data file sits alongside it, is not decided here.
- No files under `js/`, `css/`, or `*.html` were touched to produce this
  brief — this is documentation only, per your instruction.
