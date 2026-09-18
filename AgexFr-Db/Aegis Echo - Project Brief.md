# Aegis Echo — Project Brief

**Full name:** Aegis Echo: Decentralized Multi-Agent Triage Network for Grid-Down Environments

**Tagline:** Multimodal AI Sentinel Command for Grid-Down Disaster Response

## 1. What We're Building (The Problem → The Solution)

### Problem

In major disasters (floods, earthquakes, landslides), two things happen at once:

- Cell towers / internet collapse → total grid blackout
- Human dispatchers get cognitive overload from thousands of chaotic, unverified distress signals
- Standard cloud-based AI apps become useless the moment the grid dies

### Solution

A tactical software hub that runs 100% offline, at the local edge (rugged laptop, field server, mesh network — no internet needed). It uses a Multi-Agent Orchestration Framework: three specialized AI "nodes" that ingest chaotic data (voice, text, sound), debate the best action, and hand a human a single one-click decision.

## 2. The Three AI Agents ("Softbot" Nodes)

| Node | Real name | Job (Algorithmic Objective) | What it does |
|------|-----------|------------------------------|--------------|
| Triage Bot | Semantic Triage Node | NLP + Audio Biometric Assessment | Reads raw text / SMS / radio voice transcripts. Extracts Victim Panic Rating, Life Threat Classification, and location coordinates. Also parses audio for background hazard sounds (rushing water, structural cracking) and stress %. |
| Logistics Bot | Kinematic Logistics Router | Spatial Reasoning + Pathfinding | Checks real-world constraints: weather (wind speed, rain), road / bridge closures. Validates whether a rescue asset (boat, drone, ground team) can physically survive the mission. |
| Commander Bot | Command Arbitration Agent | Conflict Resolution + Deterministic Payload Generation | Watches the other two. When they disagree, it runs the Adversarial Consensus Loop (a live "debate") to find a safe compromise, then packages the final plan into a strict format for a human to approve / deny with one click. |

**Key term — Adversarial Consensus Loop:** the visible back-and-forth where Triage requests an action, Logistics rejects / flags a risk, they counter-argue, and Commander resolves it with a final instruction.

**Key term — HITL (Human-in-the-Loop):** AI never takes the final physical-world action itself — it always ends with a human clicking "Approve."

## 3. The Interface (3-Panel Dashboard)

**Theme:** deep cyber-black / slate-gray, with neon amber (warning), emerald green (safe), crimson (critical) accents.

- **Panel A (Left) – Sensor Fusion Feed:** scrolling list of incoming distress calls; a "Voice Triage Module" with an animated waveform, live transcript, acoustic hazard tags, and a stress-level meter.
- **Panel B (Center) – Tactical Map:** dark tactical map; big banner reading SYSTEM STATUS: LOCAL EDGE OPERATIONS — 100% OFFLINE; amber circles = hazard zones, green arrows = rescue teams moving.
- **Panel C (Right) – Swarm Debate Terminal:** looks like a live secure chatroom between the 3 bots, showing them argue / resolve in real time, ending in a big red "AUTHORIZE CRITICAL SWARM PAYLOAD" button.

> #1 priority feature (put 90% of effort here): Panel C must look like a live execution loop, not a static script — visibly moving through: (1) ingest & score data → (2) conflict / "Debate Protocol" if agents disagree → (3) final deterministic payload awaiting Approve / Deny.

## 4. The Pitch Framing

Position it as B2G SaaS: municipal governments, Red Cross, UN license it to cut emergency response times.

3 pillars to hit in the pitch:

1. **The Cloud Fallacy** — everyone else depends on internet; grid dies first in a disaster; Aegis Echo runs fully offline.
2. **Cognitive Overload** — multi-agent system filters chaos into safe action in milliseconds.
3. **HITL Safety** — AI does the thinking, human makes the final call.

**Demo hook:** literally unplug the internet on stage, show the agents still running / debating locally.

## 5. Team Roadmap (4-Person Split)

| Person | Role | Tools | What they build |
|--------|------|-------|-----------------|
| 1 | Frontend / UI Lead | Bolt.new, Lovable.dev, or v0.dev | The 3-panel dashboard (skeleton first, then polish). Success = looks like military-grade software. |
| 2 | Agent Architect | Dify.ai, Flowise, or a Claude / OpenAI project workspace | Writes the system prompts for Triage, Logistics, and Commander bots so they parse input and output correctly. |
| 3 | Data / Simulation Lead | ChatGPT or Claude | Generates ~20 mock disaster scenarios (transcripts, coordinates, hazard data) to feed the UI so it looks "alive" in the demo. |
| 4 | Pitch / Deck Lead | Canva or Google Slides | Builds the slide deck around the "grid-down" problem, writes and rehearses the live demo script. |

## 6. Execution Order

1. Person 1 starts the UI skeleton immediately (front-end prompt is the long block already drafted for Bolt / Lovable).
2. Persons 2 & 3 work in parallel: agent system prompts + mock scenario data.
3. Plug Person 3's data into Person 1's UI so the demo behaves like a live app.
4. Person 4 builds the deck once the concept and demo flow are locked, and rehearses the "unplug the internet" moment.
5. Final check before presenting: Panel C debate loop must run start-to-finish and end on the Approve / Deny button.
