// GROQ DISPATCH AGENTS — optional real reasoning for the three dispatch
// agents, routed straight from this frontend to Groq's chat completion
// API. Built to the letter of GROQ_DISPATCH_AGENTS_ROUTING.json the team
// supplied. Key decisions and where each routing-file rule landed:
//
// - "extra_backend_allowed: false" / forbidden: server file, proxy
//   service, API folder, queue worker, new backend project -- so this is
//   ONE plain script added to the existing js/ folder, calling
//   api.groq.com directly with fetch(). No new server, no new folder.
// - storage rules ("never paste actual key value into project file...")
//   -- the key is entered at runtime via the SAME prompt() pattern
//   js/aiAgent.js already uses for the Claude key: it lives only in the
//   GROQ_API_KEY variable below for this browser tab's session and is
//   never written to any file, localStorage, or the dispatch-plan JSON.
//   Only the MODEL NAME (not a secret) is remembered in localStorage.
// - routing_method.pattern ("existing panel to Groq to same panel, no
//   custom endpoint between panel and Groq") -- every call below goes
//   straight from this file to https://api.groq.com, then the response
//   is rendered directly into the existing dashboard panels.
// - sequence ("Needs demand first, then Logistics challenge, then Command
//   resolution... each step a separate direct call") -- buildGroqLines()
//   below makes exactly 3 sequential calls in that order, each one
//   depending on the previous step's text, same as the JSON's
//   per_agent_calls.*.input fields describe.
// - model_settings.exclude ("full national inventory", "personal
//   identifiers") -- pickRelevantDepotRows() only sends the depot lines
//   that this scenario's OWN computed demand actually needs (usually 1-3
//   of the 13 categories), never the whole resourceInventory dump. There
//   are no personal-identifier fields anywhere in this project's data.
// - safety_rules ("treat cross-border and citizen telemetry as unverified,
//   exclude unless explicitly approved") -- pickRelevantFeedItems() always
//   drops CITIZEN-sourced ingestion items before anything is sent, since
//   there's no per-round approval UI for that yet.
// - provenance_required -- every rendered Groq block shows exactly which
//   feed items / depot rows were sent and their timestamps, via
//   buildProvenanceLine().
// - "math stays in frontend, Groq only explains ranking" -- the actual
//   dispatch plan, feasibility numbers, and inventory deduction on Approve
//   still come from runAgenticCommandCore() (unchanged). Groq only
//   supplies the human-readable narrative text layered on top, exactly
//   like the existing Claude "Real AI" path in aiAgent.js already does.
// - offline_behavior ("agent_panels require internet, disable buttons and
//   show offline notice... never queue AI call for later auto dispatch")
//   -- see refreshGroqAvailability() and the online/offline listeners at
//   the bottom of this file. A failed/offline call always falls back to
//   rule-based text (debateEngine.js) rather than retrying or queuing.

let GROQ_API_KEY = null;
let USE_GROQ = false;
let GROQ_MODEL = localStorage.getItem("aegisGroqModel") || "llama-3.3-70b-versatile";
let groqRoundCounter = 0;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

async function groqChat(messages, maxTokens = 150) {
  if (!GROQ_API_KEY) throw new Error("No Groq API key set");
  if (!navigator.onLine) throw new Error("Offline — Groq agents require internet");

  const res = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages
    })
  });

  if (!res.ok) throw new Error(`Groq request failed: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq response had no content");
  return text.trim();
}

// ---- Scoped input selection (per model_settings.exclude / scope_per_call) --

// Only ever the current zone's own items — never the full national feed —
// and CITIZEN-sourced reports are always dropped (safety_rules: "treat
// cross-border and citizen telemetry as unverified, exclude unless
// explicitly approved for that round"; there's no per-round approval
// control for that yet, so the safe default is always-exclude).
function pickRelevantFeedItems(scenario, max = 3) {
  if (typeof INGESTION_FEED === "undefined") return [];
  const verified = INGESTION_FEED.filter((entry) => entry.source !== "CITIZEN");
  const keyword = String(scenario.region || scenario.hazardTag || scenario.name || "")
    .toLowerCase()
    .split(/\s+/)[0];
  const matched = keyword ? verified.filter((entry) => entry.message.toLowerCase().includes(keyword)) : [];
  return (matched.length ? matched : verified).slice(0, max);
}

// Only the depot rows this scenario's OWN demand actually references
// (never the full 13-category inventory dump).
function pickRelevantDepotRows(localNeeds) {
  const types = new Set((localNeeds.demand || []).map((d) => d.type));
  if (typeof resourceInventory === "undefined") return [];
  return resourceInventory.filter((item) => types.has(item.id));
}

function buildProvenanceLine(feedItems, depotRows, capturedAt) {
  const feedPart = feedItems.length
    ? `${feedItems.length} feed item${feedItems.length === 1 ? "" : "s"} (latest ${feedItems[0].time})`
    : "no matching feed items";
  const depotPart = depotRows.length
    ? `${depotRows.length} depot line${depotRows.length === 1 ? "" : "s"} (${depotRows.map((d) => d.label).join(", ")})`
    : "no depot lines matched yet";
  return `Sent: ${feedPart} · ${depotPart} · captured ${capturedAt} · AI DRAFT, not live`;
}

// ---- The 3 sequential per-agent calls (routing_method.per_agent_calls) -----

async function groqNeedsImpact(scenario, feedItems) {
  const feedText = feedItems.length
    ? feedItems.map((f) => `[${f.time} ${f.source}] ${f.message}`).join(" | ")
    : "No matching live feed items for this zone.";
  const messages = [
    {
      role: "system",
      content: "You are the Needs & Impact Agent in a Nepal disaster-response command dashboard. " +
        "Reply in ONE short sentence, max 30 words. This is a draft recommendation for a human " +
        "commander, not a final decision. Never reference citizen reports or cross-border data."
    },
    {
      role: "user",
      content: `Zone: ${scenario.name} (${scenario.hazardTag}). Stress index: ${scenario.stressIndex}/100. ` +
        `Field transcript: "${scenario.transcript}". Recent verified signals for this zone: ${feedText}. ` +
        `Give: severity tier (LOW/MODERATE/HIGH/CRITICAL), a rough population/injury/isolation estimate, ` +
        `the predicted cascade direction, and the top resource request with a rough timeline.`
    }
  ];
  return groqChat(messages, 140);
}

async function groqLogistics(scenario, needsText, depotRows) {
  const depotText = depotRows.length
    ? depotRows.map((d) => `${d.label}: ${d.available}/${d.total} available, ${d.deployed} already deployed`).join("; ")
    : "No depot line matched this demand yet — treat as unconstrained.";
  const messages = [
    {
      role: "system",
      content: "You are the Resource & Logistics Agent. Reply in ONE short sentence, max 30 words. " +
        "This is a draft recommendation for a human commander, not a final decision."
    },
    {
      role: "user",
      content: `Needs & Impact requested: "${needsText}". Relevant depot stock: ${depotText}. ` +
        `Corridor/transport status: ${scenario.logisticsRisk || "not specified"}. ` +
        `Rescue-asset survivability flag: ${scenario.assetSurvivable === false ? "NOT survivable at current conditions" : "survivable"}. ` +
        `Either confirm the allocation is feasible, or raise a CHALLENGE with the specific blocking ` +
        `reason and a counter-proposal (alternate depot, alternate route, or partial allocation with a revised ETA).`
    }
  ];
  return groqChat(messages, 140);
}

async function groqCommand(needsText, logisticsText) {
  const messages = [
    {
      role: "system",
      content: "You are the Command & Prioritization Agent, resolving a disagreement between two other " +
        "agents. Reply in ONE short sentence, max 30 words. You only ever produce draft recommendation " +
        "text — you never dispatch anything yourself. A human Incident Commander must approve, amend, " +
        "or reject it before anything moves."
    },
    {
      role: "user",
      content: `Needs & Impact said: "${needsText}". Resource & Logistics said: "${logisticsText}". ` +
        `Give the final draft dispatch decision: the primary action, a fallback/contingency corridor, ` +
        `and the single most important impact or risk note.`
    }
  ];
  return groqChat(messages, 150);
}

// ---- Rendering into the panels the routing file names -----------------

// needs_impact_agent.output_shows_in: "left feed synthesis area ..."
function renderGroqFeedSynthesis(text, provenance, round) {
  const block = document.getElementById("groq-feed-synthesis");
  if (!block) return;
  block.hidden = false;
  block.innerHTML = `
    <div class="groq-synthesis-header">
      <span class="groq-draft-badge">AI DRAFT</span>
      <span>ZONE SYNTHESIS · ROUND ${round} · ${GROQ_MODEL}</span>
    </div>
    <p class="groq-synthesis-text"></p>
    <p class="groq-provenance"></p>`;
  block.querySelector(".groq-synthesis-text").textContent = text;
  block.querySelector(".groq-provenance").textContent = provenance;
}

// logistics_agent.output_shows_in: "right inventory panel support text ..."
function renderGroqInventoryNote(text, provenance, round) {
  const block = document.getElementById("groq-inventory-note");
  if (!block) return;
  block.hidden = false;
  block.innerHTML = `
    <div class="groq-synthesis-header">
      <span class="groq-draft-badge">AI DRAFT</span>
      <span>STOCK VS DEPLOY · ROUND ${round} · ${GROQ_MODEL}</span>
    </div>
    <p class="groq-synthesis-text"></p>
    <p class="groq-provenance"></p>`;
  block.querySelector(".groq-synthesis-text").textContent = text;
  block.querySelector(".groq-provenance").textContent = provenance;
}

function clearGroqPanels() {
  ["groq-feed-synthesis", "groq-inventory-note"].forEach((id) => {
    const block = document.getElementById(id);
    if (block) block.hidden = true;
  });
}

// ---- Orchestration: the 3 sequential calls, in routing-file order --------
//
// command_prioritization_agent.output_shows_in: "bottom deliberation log
// resolution row and action required bar with approve amend reject
// controls" -- that's just the existing debate-log + approve/deny/hold
// buttons, so the Command line below is returned like every other line
// and rendered by the SAME playback code every other mode already uses.
async function buildGroqLines(scenario) {
  groqRoundCounter++;
  const round = groqRoundCounter;
  const capturedAt = new Date().toLocaleTimeString([], { hour12: false });

  const feedItems = pickRelevantFeedItems(scenario);
  const needsText = await groqNeedsImpact(scenario, feedItems);
  renderGroqFeedSynthesis(needsText, buildProvenanceLine(feedItems, [], capturedAt), round);

  // Reuse the rule-based Needs & Impact Agent purely to learn WHICH resource
  // types this zone actually demands (deriveResourceDemand's math) so we
  // only ever send the relevant depot rows, never the full inventory --
  // stay_local_no_key keeps "depot math and ETA math" local either way.
  const localNeeds = needsImpactAssess(scenario);
  const depotRows = pickRelevantDepotRows(localNeeds);
  const logisticsText = await groqLogistics(scenario, needsText, depotRows);
  renderGroqInventoryNote(logisticsText, buildProvenanceLine([], depotRows, capturedAt), round);

  const commandText = await groqCommand(needsText, logisticsText);

  return [
    { cls: "triage", text: `[NEEDS AGENT · ROUND ${round}] ${needsText}` },
    { cls: "logistics", text: `[LOGISTICS AGENT · ROUND ${round}] ${logisticsText}` },
    {
      cls: "commander",
      text: `[COMMAND AGENT · ROUND ${round}] ${commandText} — draft recommendation pending commander sign-off (${GROQ_MODEL}).`
    }
  ];
}

// ---- Offline handling (offline_behavior) ----------------------------------
//
// "require internet, disable buttons and show offline notice in bottom log
// when offline" + "never queue AI call for later auto dispatch, re-run
// fresh when back online" -- so this only ever flips a button's disabled
// state and drops a system line; it never stores a call to retry later.
function refreshGroqAvailability() {
  const btn = document.getElementById("groq-mode-toggle");
  if (!btn) return;
  const offline = !navigator.onLine;
  btn.disabled = offline && !USE_GROQ; // still allow turning OFF while offline
  if (offline && USE_GROQ) {
    btn.title = "Offline — Groq dispatch agents need internet. Next round falls back to local logic.";
  } else {
    btn.title = "";
  }
}

window.addEventListener("online", refreshGroqAvailability);
window.addEventListener("offline", () => {
  refreshGroqAvailability();
  if (USE_GROQ && typeof appendDecisionLog === "function") {
    appendDecisionLog("[SYSTEM] Connection lost — Groq dispatch agents offline. Reverting to local rule-based logic until back online.");
  }
});
