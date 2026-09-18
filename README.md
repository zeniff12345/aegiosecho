# Aegis Echo — Starter Scaffold

## How to run it
1. Open this folder in VS Code (File > Open Folder).
2. Install the "Live Server" extension in VS Code.
3. Right-click `index.html` > "Open with Live Server". It opens in your browser and auto-refreshes on save.
4. Click a case in the left panel — watch Panel C "debate" and light up.

## File structure and who owns what

```
aegis-echo/
  index.html          <- Person 1: page structure (the 3 panels, toggle button, asset marker)
  css/
    style.css         <- Person 1: all visual styling / theme / animations
  js/
    main.js            <- Person 1: wires everything together, handles clicks
    waveform.js         <- Person 1: generates the animated audio waveform bars
    mapEngine.js         <- Person 1 + Person 2: hazard ring + asset marker movement
    triageAgent.js        <- Person 2: Triage Bot logic (edit the scoring rules here)
    logisticsAgent.js     <- Person 2: Logistics Bot logic (edit feasibility rules here)
    commanderAgent.js     <- Person 2: Commander Bot logic (edit conflict resolution here)
    debateEngine.js        <- Person 2 + Person 1 together: THE feature to polish most
  data/
    scenarios.json          <- Person 3: 20 mock scenarios (add more / tweak freely)
  assets/                     <- icons/images go here if needed
  README.md
```

## What's implemented now
- Clickable case list (Panel A) that loads a scenario's transcript, hazard tag, and stress bar
- Animated audio waveform (24 bars, randomized timing so it looks organic)
- Pulsing hazard ring on the map (Panel B) at each scenario's location — turns red if stress index > 85
- Clickable Infrastructure Core Toggle (top bar) that switches between "Cloud Dependent" and "Decentralized Edge — 100% Offline" modes
- Full debate loop in Panel C: Triage proposes → Logistics objects (or confirms) → Commander resolves → Approve button unlocks
- Clicking Approve animates the rescue asset marker moving across the map to the hazard site
- 20 mock disaster scenarios across floods, landslides, fires, earthquakes, avalanches, and structural collapses

## New: real voice + real AI features (optional, read the caveats)

**🔊 Speak button** — plays the transcript aloud using the browser's built-in
text-to-speech. Works offline in most browsers/OS. Fully safe to use in your
offline demo.

**🎙 Live Voice Intake** — click it, allow microphone access, speak a mock
distress call, and it creates a real new case from what you said (with a
rough auto-estimated stress score based on keywords). **This requires
internet** — Chrome sends the audio to Google's servers to transcribe it —
so only use this as a separate "look, it can take live input" showcase, NOT
during the "unplug the internet" moment.

**🧠 AI Mode toggle** — switches from rule-based logic (default, always
works, fully offline) to real Claude API calls for the debate reasoning.
Requires:
- Your own Anthropic API key (get one at console.anthropic.com)
- Internet access
- Small per-call cost (a few cents per debate at most)

Click it, paste in your key when prompted (never commit this key to GitHub —
it's only kept in memory for that browser session). If the API call fails
for any reason — no internet, bad key, rate limit — the app **automatically
falls back to rule-based logic**, so this is safe to enable without risking
your live demo. Recommendation: keep this OFF during your actual offline
demo moment, and only turn it on afterward to show judges "and here's what
it looks like with a real model behind it."

## Why no backend or database folder
You don't need one. `scenarios.json` IS your database for this demo — it's just a
file that gets read into the browser. This keeps you from needing to run/deploy
a server, manage a login system, or debug network issues on stage. If you later
want the agents to make REAL AI calls (e.g. to Claude or OpenAI) during the
"online" part of your demo, that's the only reason you'd add a backend — and
even then, it can be a tiny one, added last, only if time allows.

## Task split (4 people) — tools, files, and exactly what to do

**Person 1 — Frontend/UI Lead**
Tools: VS Code + Live Server extension. Files you own: `index.html`, `css/style.css`, `js/waveform.js`.
What to do:
1. Open `index.html` and get comfortable with the 3 `<section>` panels — that's your whole layout.
2. In `style.css`, tweak colors, spacing, fonts to make it look sharper (the CSS variables at the top of the file control the whole color scheme — change those first for quick wins).
3. Improve the map's visual polish in `.map-area` / `.hazard-ring` — maybe add a subtle background texture or grid glow.
4. Test constantly by clicking "Go Live" and clicking through the case list in the browser.

**Person 2 — Agent Architect**
Tools: VS Code (plain JavaScript, no external libraries needed). Files you own: `js/triageAgent.js`, `js/logisticsAgent.js`, `js/commanderAgent.js`, `js/debateEngine.js`.
What to do:
1. Open `triageAgent.js` first — it's the shortest, get familiar with how a scenario object flows in and a result object flows out.
2. Improve the wording in `debateEngine.js`'s `lines` array so the debate reads more like real negotiation, not robotic templates.
3. This is the single most important file for your demo (Panel C) — spend the most hours here. Try adding a 4th line type, like Logistics proposing an alternate asset instead of just objecting.

**Person 3 — Data/Simulation Lead**
Tools: any text editor, or ChatGPT/Claude to help draft realistic transcripts. File you own: `data/scenarios.json`.
What to do:
1. Open the file, notice the pattern: each entry needs `id`, `name`, `transcript`, `hazardTag`, `stressIndex`, `mapX`/`mapY` (0-100, position on the map), `logisticsRisk`, `assetSurvivable` (true/false).
2. You already have 20 — read through them and rewrite any that feel repetitive or unrealistic, in your own voice.
3. Coordinate with Person 4 on transcript wording so it matches the pitch's tone.

**Person 4 — Pitch/Deck Lead**
Tools: Canva or Google Slides. No code files.
What to do:
1. Build the deck around the 3 pillars in the original brief: The Cloud Fallacy, Cognitive Overload, HITL Safety.
2. Write and rehearse the live demo script — specifically the "unplug the internet, click the toggle" moment, timed against Panel C's debate loop.
3. Once the app is stable, help Person 3 polish transcript text for realism.

## Collaboration workflow
- Use Live Share when 2+ of you are actively working on the SAME file together
  (e.g. Person 1 + Person 2 wiring up debateEngine.js).
- Use Git/GitHub for everything else — commit and push often, pull before you
  start working each session, so you don't overwrite each other's work.
