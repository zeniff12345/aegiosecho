# Aegis Echo — Resource-and-Dispatch Command

## How to run it
1. Open this folder in VS Code (File > Open Folder).
2. Install the "Live Server" extension in VS Code.
3. Right-click `dashboard.html` > "Open with Live Server". It opens in your browser and auto-refreshes on save.
4. Click a case in the left panel — watch the Agentic Command Core (Panel C) debate it live and the Resource & Logistics Inventory update the moment you approve a dispatch.

## What this project is now

Aegis Echo is a post-disaster **Resource-and-Dispatch Command** dashboard for
Nepal, built around three cases the project is grounded in (see
`RASUWA_CASCADE_ANALYSIS.md` and `CASCADE_PROJECT_BRIEF.md`): flooding and
landslides don't happen as single isolated events — they cascade (Source →
Mobilization → River → Infra → Human/Logistics), and a real response has to
decide, continuously and under scarcity, **what** to send, **where**, and
**why that site over another one**.

The dashboard doesn't just recommend an action — it runs three specialized
AI agents that actively **negotiate** over a shared, live resource pool, and
puts a human in the loop before anything is authorized.

## The Agentic Command Core

1. **Needs & Impact Agent** (`js/needsImpactAgent.js`) — reads the incoming
   field signal (transcript, hazard tag, stress index) and turns it into a
   comparable **priority score**:

   ```
   Priority = (0.65·SeverityLife + 0.35·SeverityExposure)
              × (1 + 1.4·CascadeProbability)
              × PopulationAtRisk
              / AccessFeasibilityEstimate
   ```

   It also derives a concrete resource **demand** (how many trauma kits,
   boats, helicopters, engineers, etc. this case actually needs) and a
   cascade-risk note grounded in the five-link chain from the Rasuwa
   analysis.

2. **Resource & Logistics Agent** (`js/resourceLogisticsAgent.js`) — checks
   that demand against the live depot (`data/resources.json`: trauma kits,
   food, water, tents, fuel, ambulances, boats, drones, helicopters, field
   hospitals, SAR teams, engineers, volunteers — each tracked as
   Available / Deployed / Reserved / Low) and against a feasibility matrix
   (road/bridge access, terrain, weather, river conditions, comms). If it
   can fully deliver, it confirms. If it can't — depot running low, route
   marginal — it issues a **CHALLENGE** with a concrete counter-proposal
   (substitute asset, partial allocation, or a hold-for-clearance delay).

3. **Command & Prioritization Agent** (`js/commandAgent.js`) — resolves any
   disagreement between the two (urgency vs. scarcity), and emits one
   structured **dispatch plan** (target sector, cascade risk profile,
   allocations, transit route, risk assessment, and a
   `human_approval_gate` that starts at `PENDING_COMMANDER_SIGN_OFF`).
   Nothing is ever auto-executed — Approve / Deny / Hold in Panel C is what
   signs that gate.

`js/debateEngine.js` orchestrates the three into the on-screen "DEMAND →
CHALLENGE → RESOLVE" script you watch play out in the Deliberation Log, and
`js/aiAgent.js` can optionally replace the scripted lines with real Claude
API calls (see below) without changing any of the underlying scoring.

Because the resource pool is shared and persists across every case you
approve in a session, this isn't a fixed per-incident calculation — approve
enough critical cases in a row and you'll watch the depot actually run low,
and later cases start getting `APPROVED WITH MODIFICATIONS` (a substitution)
or `STANDBY` instead of a clean `APPROVED`. That's the point: prioritization
under real scarcity, not a scripted demo.

## Tactical Grid Map (Panel B)

Panel B is a **pannable, zoomable grid map of the whole of Nepal**, rendered
as pure inline SVG — no external map tiles, no mapping library, no runtime
network call. That's a deliberate choice, not a limitation: it's the same
"100% OFFLINE / GRID-DOWN READY" pitch as the rest of the dashboard. You can
drag to pan, scroll/pinch to zoom toward your cursor, use the +/−/RESET
controls, and toggle map layers (hazards, cascade risk, depots, routes,
labels, grid) from the sidebar. Selecting a case auto-zooms the map into
that incident's area while keeping the rest of the country reachable by
zooming back out — the whole map is always there, you're just framing a
piece of it.

**Coordinate system**: every incident (`data/scenarios.json`) and depot
(`data/depots.json`) carries a real-world-ish `lat`/`lon`, which is
projected into a fixed `1000 × 430` SVG grid space with a simple
equirectangular projection against Nepal's real bounding box
(80.05–88.20°E, 26.35–30.45°N):

```
x = (lon - 80.05) / (88.20 - 80.05) * 1000
y = (30.45 - lat) / (30.45 - 26.35) * 430   // flipped so north = smaller y
```

**Country outline — now real GeoJSON data**: the outline drawn on the map
is Nepal's actual national boundary polygon (577 points), pulled from the
[`georgique/world-geojson`](https://github.com/georgique/world-geojson)
project on GitHub and reprojected into this map's grid with the same
formula as everything else. This build environment doesn't have
`git clone`/`curl` access to GitHub, so the file couldn't be downloaded in
one shot — it was retrieved through several `WebFetch` calls, each
requesting an explicit, verifiable slice of the coordinate array, with
every segment boundary cross-checked byte-for-byte against its neighbor
before being stitched back into one closed ring (see `js/mapEngine.js`'s
comment above `NEPAL_OUTLINE_D` for the exact process). Every one of the 28
incident coordinates and all 3 depot coordinates were checked with a
point-in-polygon test against this real boundary and land inside it.
**License note**: `world-geojson` is GPL-3.0-licensed — if you plan to
publish/distribute this project, that's worth knowing before you ship the
outline data as-is.

**Incident/depot coordinates — still approximate**: individual incident
and depot `lat`/`lon` values are real-relative-position approximations
from general geographic knowledge (Kathmandu, Pokhara, Biratnagar, and the
Rasuwa sites all sit roughly where they should relative to each other and
the real border), not survey-precision geocoding — there was no reliable
way to look up exact coordinates for the fictional incident scenarios.
Swapping in real geocoded values for `lat`/`lon` in `data/scenarios.json`
and `data/depots.json` is a drop-in upgrade; the projection math and
rendering don't need to change.

**Cascade Watch zones**: the map doesn't hardcode "Rasuwa" as special.
Instead, `computeCascadeWatchZones()` in `js/mapEngine.js` groups scenarios
by their id prefix (all `rasuwa-flood-0N` cases share the `rasuwa` prefix)
and draws a labeled dashed-ring callout around any cluster that has **3 or
more incidents AND an explicit, grounded `cascadeProbability` of 0.3 or
higher** — no estimated/heuristic risk counts toward this, only numbers the
scenario data explicitly states. Right now that rule surfaces exactly one
zone — Rasuwa — because that's the one region the underlying data actually
supports as a multi-site, high-future-risk cluster. A softer, per-incident
version of the same signal (`renderCascadeGlow()`) draws a red glow behind
every individual high-cascade-probability incident, watch-zone or not.

**Province bands**: the map also shades 7 west-to-east column regions
(Sudurpashchim, Karnali, Lumbini, Gandaki, Bagmati, Koshi, plus a Terai-only
Madhesh strip along the south) so the country reads as distinct areas
rather than one flat shape, matching the "separated regions" look of the
reference layout. Same honesty rule as the outline: these are simplified
rectangular bands clipped to the country outline, **not** precise
administrative boundaries — real province borders are far more irregular
than a set of straight columns. Toggle them off from the "Provinces" layer
checkbox if you just want the plain outline.

**Nearest-depot dispatch**: `data/depots.json` defines three resource
depots (Kathmandu HQ, Pokhara Regional, Biratnagar Regional). The Command &
Prioritization Agent (`js/commandAgent.js`) now picks whichever depot is
geographically closest to a given incident for that dispatch plan's
`source_depot_id` — flat lat/lon distance is close enough at Nepal's scale,
so there's no need for great-circle math. The animated asset marker on the
map flies from that same real depot location, not a fixed corner of the
screen.

## Field Data Ingestion Engine

`js/fieldIngestion.js` renders a standalone raw multi-source feed panel
(satellite, drone, weather, hospitals, field teams, citizen reports) at the
top of Panel A, matching the architecture doc's ingestion layer. It is
intentionally **not wired into** the Agentic Command Core above — it's a
display-only preview of what a real multi-source ingestion pipeline would
look like feeding this system; the three agents still work entirely off
`data/scenarios.json`.

## File structure and who owns what

```
aegis-echo/
  dashboard.html            <- the actual command dashboard app
  index.html                <- landing page
  how-it-works.html         <- landing page
  css/
    style.css               <- dashboard visual styling / theme / animations
    landing.css              <- landing page styling
  js/
    main.js                   <- wires everything together, handles clicks, owns resourceInventory
    mapEngine.js                <- pannable/zoomable SVG grid map of Nepal: outline, hazard rings, cascade watch zones, depot markers, asset marker movement
    needsImpactAgent.js           <- Needs & Impact Agent (priority score, demand, cascade read)
    resourceLogisticsAgent.js       <- Resource & Logistics Agent (feasibility matrix, live inventory checks)
    commandAgent.js                   <- Command & Prioritization Agent (resolution + dispatch plan JSON)
    debateEngine.js                     <- orchestrates the three agents into the on-screen debate
    aiAgent.js                            <- optional real-AI mode (Claude API), same line format as rule-based
    fieldIngestion.js                       <- standalone Field Data Ingestion Engine feed panel
    audio.js                                  <- confirmation sound effects
  data/
    scenarios.json           <- 28 mock incident scenarios (20 general Nepal + 8 grounded Rasuwa cascade cases), now with lat/lon/gridX/gridY
    resources.json           <- the live resource depot (13 categories, Available/Deployed/Reserved/Low)
    depots.json               <- 3 resource depots (Kathmandu HQ, Pokhara Regional, Biratnagar Regional) with lat/lon/gridX/gridY
  assets/                     <- icons/images
  RASUWA_CASCADE_ANALYSIS.md  <- ground-truth source data on two real Rasuwa cascade events
  CASCADE_PROJECT_BRIEF.md    <- earlier project-pivot notes (cascade-chain framework)
  README.md
```

`js/triageAgent.js`, `js/logisticsAgent.js`, and `js/commanderAgent.js` are
left in place as deprecated stubs (their logic now lives in the three files
above) — they're no longer loaded by `dashboard.html` and are safe to delete.

## What's implemented now
- Clickable case list (Panel A) with search/sort/filter, loading a scenario's transcript, hazard tag, and stress bar
- A standalone Field Data Ingestion Engine feed (Panel A) showing a live-looking multi-source signal stream
- A pannable, zoomable SVG grid map of the whole of Nepal (Panel B) — drag to pan, scroll to zoom, +/−/RESET controls, and a layer-filter sidebar (hazards/cascade risk/depots/routes/labels/grid)
- Pulsing hazard ring on the map at each scenario's location — turns red if stress index > 85
- Data-driven "Cascade Watch" callout zones (currently surfaces Rasuwa) drawn around any 3+ incident cluster with a grounded cascade probability ≥ 0.3, plus a softer per-incident cascade glow
- Three resource depot markers on the map (`data/depots.json`); every dispatch plan's asset now originates from whichever depot is geographically nearest to the incident
- A live Resource & Logistics Inventory panel (Panel C) — 13 resource categories, color-flagged Low/Critical
- Full adversarial debate loop (Panel C): Needs & Impact issues a demand → Resource & Logistics confirms or CHALLENGEs it against the live depot and feasibility matrix → Command & Prioritization resolves it into one dispatch plan
- A "JSON" button in the debate toolbar that copies that case's full structured dispatch plan to the clipboard
- Clickable Infrastructure Core Toggle (top bar) that switches between "Cloud Dependent" and "Decentralized Edge — 100% Offline" modes
- Clicking Approve commits the plan's allocations against the shared inventory, signs the dispatch plan's human-approval gate, and animates the rescue asset moving across the map
- 28 mock disaster scenarios — 20 general Nepal incidents plus 8 scenarios grounded in the Rasuwa cascade analysis, each with an explicit population-at-risk and cascade-probability estimate

## Optional: real AI mode

**🧠 AI Mode toggle** — switches from rule-based logic (default, always
works, fully offline) to real Claude API calls for the three agents'
debate text. Requires:
- Your own Anthropic API key (get one at console.anthropic.com)
- Internet access
- Small per-call cost (a few cents per debate at most)

Click it, paste in your key when prompted (never commit this key to GitHub —
it's only kept in memory for that browser session). If the API call fails
for any reason — no internet, bad key, rate limit — the app **automatically
falls back to rule-based logic**, so this is safe to enable without risking
your live demo. The underlying priority score, feasibility matrix, live
inventory, and dispatch-plan JSON are always computed by the rule-based
agents regardless of this toggle — AI Mode only changes the wording of the
three debate lines you see typed out.

Note: the earlier Live Voice Intake and speak-aloud (text-to-speech)
features have been removed; all incidents load from `data/scenarios.json`.

## Optional: Groq dispatch agents (`js/groqAgent.js`)

**⚡ GROQ AGENTS toggle** — a second, alternative real-AI backend for the
same three debate lines, built to the letter of the team's
`GROQ_DISPATCH_AGENTS_ROUTING.json` spec. Only one AI provider drives the
debate text at a time — turning this on turns the Claude toggle above off,
and vice versa. Requires your own Groq API key (console.groq.com) and
internet access.

**No new backend.** Every routing-file constraint that mattered is a
frontend-only decision — the spec explicitly forbids a server file, proxy,
API folder, queue worker, or new backend project, so `js/groqAgent.js` is
one more plain script next to `aiAgent.js`, calling
`https://api.groq.com/openai/v1/chat/completions` directly from the browser
with `fetch()`, exactly like the existing Claude path already calls
`api.anthropic.com` directly. Nothing routes through a server this project
doesn't already not-have.

**Key handling.** The routing spec's own storage rules say "never paste
actual key value into project file, screenshot, ticket, or chat log" — so
clicking the toggle prompts for the key at runtime (same pattern as the
Claude toggle) and keeps it in the `GROQ_API_KEY` variable for that browser
tab's session only. It is never written to disk, `localStorage`, or the
dispatch-plan JSON. Only the **model name** (not a secret) is remembered in
`localStorage` under `aegisGroqModel`, defaulting to
`llama-3.3-70b-versatile`. A second prompt lets you override the model —
the spec asks for "one Groq-hosted chat model name for all three agents,"
so the same `GROQ_MODEL` value backs every call.

**⚠️ About the key you pasted into this chat**: the routing file you
provided explicitly warns never to paste a real key into a chat log — since
that's exactly what happened when it was shared here, treat it as exposed
and rotate/regenerate it in your Groq console once you're done testing.
It was never written into any file in this project.

**The 3-call sequence**, exactly matching `routing_method.sequence`:
1. **Needs & Impact** — takes the selected zone's transcript plus up to 3
   relevant, *verified* live-feed items (CITIZEN-sourced reports are always
   dropped before the request is built — the spec says to treat
   cross-border/citizen telemetry as unverified unless explicitly approved,
   and there's no per-round approval control for that yet, so the safe
   default is always-exclude). Renders into the ingestion panel (Panel A)
   as a labeled "ZONE SYNTHESIS" block, and as the top row of the bottom
   deliberation log.
2. **Resource & Logistics** — takes that Needs text plus *only* the depot
   rows the zone's own computed demand actually references (never the full
   13-category inventory — `model_settings.exclude` calls out "full
   national inventory" specifically). Renders into the Resource &
   Logistics Inventory panel (Panel C) as a "STOCK VS DEPLOY" block, and as
   the middle row of the bottom log.
3. **Command & Prioritization** — takes both prior texts and produces the
   final draft line, always suffixed "draft recommendation pending
   commander sign-off" per `dashboard_routing.approval_gate.marking`.
   Renders as the bottom log's resolution row; the existing Approve/Deny/
   Hold controls are the only way anything actually dispatches — Groq only
   ever supplies text.

Every rendered Groq block shows a provenance line (`model_settings.
provenance_required`): exactly which feed items or depot rows were sent
and when they were captured, plus an "AI DRAFT, not live" marker. As with
Claude mode, **the math never moves** — `runAgenticCommandCore()` still
computes the real priority score, feasibility index, and dispatch-plan
JSON regardless of which text backend is active; Groq only supplies the
human-readable narrative layered on top (`step_cascade_scoring_support`:
"math stays in frontend, Groq only explains ranking").

**Offline behavior** (`offline_behavior` in the spec): the toggle disables
itself while `navigator.onLine` is false, a listener flips it back on when
the connection returns, and a failed or offline call for the current round
falls back to local rule-based text with a system-log notice — it's never
queued for automatic retry. The rest of the dashboard (cached feed, map,
depot table, manual approvals) was already 100% local before this feature
existed and keeps working exactly the same with Groq mode on, off, or
failing.

One thing the spec asks for that this build interprets loosely: "record
chosen Groq model name and date in operator runbook" isn't something a
static frontend can write to an external file, so enabling the toggle logs
that line into the bottom deliberation log instead (`[SYSTEM] Groq
dispatch agents enabled — model: ... (recorded ...)`) as the closest
in-app equivalent — copy it into your actual runbook by hand.

## Why no backend or database folder
You don't need one. `scenarios.json` and `resources.json` ARE your database
for this demo — they're just files read into the browser. This keeps you
from needing to run/deploy a server, manage a login system, or debug network
issues on stage. If you later want the agents to make REAL AI calls (e.g. to
Claude) during the "online" part of your demo, that's the only reason you'd
add a backend — and even then, it can be a tiny one, added last, only if
time allows.

## Collaboration workflow
- Use Live Share when 2+ of you are actively working on the SAME file
  together (e.g. wiring up `debateEngine.js`).
- Use Git/GitHub for everything else — commit and push often, pull before
  you start working each session, so you don't overwrite each other's work.
