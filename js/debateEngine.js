// DEBATE ENGINE — this is your #1 priority feature.
// It makes Panel C look like a LIVE execution loop, not a static script.
// Flow: (1) Needs & Impact scores + demands -> (2) Resource & Logistics
// checks the live depot/feasibility and either confirms or CHALLENGEs ->
// (3) Command & Prioritization resolves any conflict into one dispatch plan.
//
// Supports TWO modes:
// - Rule-based (default, always works, fully offline): buildRuleLines()
// - Real AI (optional, needs API key + internet): buildAILines() in aiAgent.js
// If real AI mode is on but the call fails for any reason (no internet, bad
// key, rate limit), it automatically falls back to rule-based so the demo
// never breaks.
//
// NOTE on naming: the CSS/JS "cls" values below (triage/logistics/commander)
// are kept as internal plumbing from the original three-agent build — they
// map 1:1 onto the current agents (triage -> Needs & Impact, logistics ->
// Resource & Logistics, commander -> Command & Prioritization) so the
// existing styling and animation code didn't need a risky mass-rename.
// Every user-visible label below already reads "Needs & Impact" etc.

let debateGeneration = 0;
const debateTimers = new Set();
let activePlayback = null;
let playbackSpeed = 1;
const PLAYBACK_SPEEDS = [1, 2, 0.5];

// The most recent structured dispatch plan per scenario id, so a UI action
// (or a curious teammate in devtools) can inspect the exact JSON payload
// Command & Prioritization produced. Kept here since this is where it's
// computed on every case selection.
const latestDispatchPlans = {};

function cancelDebate() {
  debateGeneration++;
  debateTimers.forEach((timer) => clearTimeout(timer));
  debateTimers.clear();
  if (activePlayback) {
    activePlayback.timers.forEach((timer) => clearTimeout(timer));
    activePlayback.timers.clear();
    activePlayback.typingIndicator?.remove();
  }
  activePlayback = null;
}

function scheduleDebate(callback, delay, generation) {
  const timer = setTimeout(() => {
    debateTimers.delete(timer);
    if (generation === debateGeneration) callback();
  }, delay);
  debateTimers.add(timer);
}

function lineBadge(line, lineIndex) {
  if (line.cls === "system") return "";
  if (line.cls === "commander") return "RESOLVE";
  if (line.cls === "triage") return lineIndex === 0 ? "DEMAND" : "COUNTER";
  if (line.cls === "logistics") {
    return /CHALLENGE/i.test(line.text) ? "CHALLENGE" : "CONFIRM";
  }
  return "";
}

function playbackLines(lines) {
  return lines.filter((line) => !(
    line.cls === "logistics" && /No objections\.$/i.test(line.text)
  ));
}

function setDebateProgress(current, total, complete = false) {
  const progress = document.getElementById("debate-progress");
  if (!progress) return;
  progress.textContent = complete
    ? "CONSENSUS REACHED"
    : `AWAITING CONSENSUS... (${current}/${total})`;
}

function setPlaybackControls(state) {
  const pause = document.getElementById("debate-pause");
  const replay = document.getElementById("debate-replay");
  const speed = document.getElementById("debate-speed");
  const dispatchJson = document.getElementById("dispatch-json-btn");
  if (pause) {
    pause.disabled = state === "idle";
    pause.textContent = state === "paused" ? "RESUME" : "PAUSE";
  }
  if (replay) replay.disabled = state === "idle";
  if (speed) {
    speed.disabled = state === "idle";
    speed.textContent = `${playbackSpeed}x`;
  }
  if (dispatchJson) dispatchJson.disabled = state === "idle";
}

function createTypingIndicator(line) {
  const log = document.getElementById("debate-log");
  const indicator = document.createElement("div");
  indicator.className = `debate-typing ${line.cls}`;
  const prefix = line.text.match(/^\[([^\]]+)\]/);
  const label = prefix ? prefix[1] : line.cls.toUpperCase();
  indicator.innerHTML = `<strong>${label} TYPING</strong><span class="typing-indicator" aria-hidden="true"><i></i><i></i><i></i></span>`;
  log.appendChild(indicator);
  log.scrollTop = log.scrollHeight;
  return indicator;
}

function schedulePlayback(callback, delay) {
  if (!activePlayback || activePlayback.paused) return;
  const timer = setTimeout(() => {
    if (!activePlayback || activePlayback.paused) return;
    activePlayback.timers.delete(timer);
    callback();
  }, delay / playbackSpeed);
  activePlayback.timers.add(timer);
}

function renderPlaybackCard(line, lineIndex) {
  const log = document.getElementById("debate-log");
  const prefix = line.text.match(/^\[([^\]]+)\]\s*/);
  const label = prefix ? prefix[1] : line.cls.toUpperCase();
  const message = line.cls === "system" ? line.text : prefix ? line.text.slice(prefix[0].length) : line.text;
  const turn = String(lineIndex + 1).padStart(2, "0");
  const badge = lineBadge(line, lineIndex);
  const card = document.createElement("article");
  card.className = `debate-card ${line.cls}`;

  const header = document.createElement("div");
  header.className = "debate-card-header";
  const agentLabel = document.createElement("span");
  agentLabel.className = "debate-agent";
  agentLabel.textContent = `${label} · ${turn}${badge ? ` · ${badge}` : ""}`;
  const time = document.createElement("time");
  time.className = "debate-time";
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });
  header.append(agentLabel, time);

  const body = document.createElement("div");
  body.className = "debate-card-body";
  const messageNode = document.createElement("div");
  messageNode.className = "debate-message";
  body.appendChild(messageNode);
  card.append(header, body);
  log.appendChild(card);
  log.scrollTop = log.scrollHeight;
  return { card, message, messageNode };
}

function playNextLine() {
  if (!activePlayback || activePlayback.paused) return;
  if (activePlayback.lineIndex >= activePlayback.lines.length) {
    activePlayback.phase = "done";
    setDebateProgress(activePlayback.lines.length, activePlayback.lines.length, true);
    setPlaybackControls("done");
    const finalized = resolvedIds.has(activePlayback.scenario.id) || deniedIds.has(activePlayback.scenario.id);
    setDecisionControlsDisabled(finalized);
    playConfirm();
    return;
  }

  const lineIndex = activePlayback.lineIndex;
  const line = activePlayback.lines[lineIndex];
  activePlayback.phase = "indicator";
  activePlayback.typingIndicator = createTypingIndicator(line);
  schedulePlayback(() => {
    activePlayback.typingIndicator?.remove();
    activePlayback.typingIndicator = null;
    const rendered = renderPlaybackCard(line, lineIndex);
    activePlayback.card = rendered.card;
    activePlayback.messageNode = rendered.messageNode;
    activePlayback.message = rendered.message;
    activePlayback.character = 0;
    activePlayback.phase = "typing";
    typePlaybackMessage();
  }, 480);
}

function typePlaybackMessage() {
  if (!activePlayback || activePlayback.paused) return;
  const playback = activePlayback;
  playback.messageNode.textContent = playback.message.slice(0, playback.character);
  const log = document.getElementById("debate-log");
  log.scrollTop = log.scrollHeight;
  if (playback.character < playback.message.length) {
    playback.character++;
    schedulePlayback(typePlaybackMessage, 16);
    return;
  }
  playback.card.classList.add("is-visible");
  playback.phase = "waiting";
  playback.lineIndex++;
  setDebateProgress(playback.lineIndex, playback.lines.length);
  schedulePlayback(playNextLine, 420);
}

function startPlayback(scenario, lines) {
  const log = document.getElementById("debate-log");
  activePlayback = {
    scenario,
    lines: playbackLines(lines),
    lineIndex: 0,
    character: 0,
    message: "",
    messageNode: null,
    card: null,
    typingIndicator: null,
    phase: "playing",
    paused: false,
    timers: new Set()
  };
  log.innerHTML = "";
  setDebateProgress(0, activePlayback.lines.length);
  setPlaybackControls("playing");
  playNextLine();
}

function togglePlaybackPause() {
  if (!activePlayback || activePlayback.phase === "done") return;
  if (activePlayback.paused) {
    activePlayback.paused = false;
    setPlaybackControls("playing");
    if (activePlayback.phase === "typing") typePlaybackMessage();
    else if (activePlayback.phase === "indicator" || activePlayback.phase === "waiting") {
      if (activePlayback.phase === "indicator") {
        activePlayback.typingIndicator?.remove();
        activePlayback.typingIndicator = null;
      }
      playNextLine();
    }
    return;
  }
  activePlayback.paused = true;
  activePlayback.timers.forEach((timer) => clearTimeout(timer));
  activePlayback.timers.clear();
  setPlaybackControls("paused");
}

function replayDebate() {
  if (!activePlayback) return;
  const { scenario, lines } = activePlayback;
  activePlayback.timers.forEach((timer) => clearTimeout(timer));
  activePlayback.typingIndicator?.remove();
  startPlayback(scenario, lines);
}

function cyclePlaybackSpeed() {
  const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
  playbackSpeed = PLAYBACK_SPEEDS[(currentIndex + 1) % PLAYBACK_SPEEDS.length];
  setPlaybackControls(activePlayback ? (activePlayback.paused ? "paused" : activePlayback.phase === "done" ? "done" : "playing") : "idle");
}

document.getElementById("debate-pause").addEventListener("click", togglePlaybackPause);
document.getElementById("debate-replay").addEventListener("click", replayDebate);
document.getElementById("debate-speed").addEventListener("click", cyclePlaybackSpeed);

// Turns three already-computed structured agent results into the on-screen
// debate script: Needs & Impact issues its DEMAND, Resource & Logistics
// either CONFIRMs or CHALLENGEs it against the live depot + feasibility
// matrix, and (only when there's a challenge) Needs & Impact reasserts
// urgency before Command & Prioritization resolves it.
function buildRuleLines(needs, resources, command) {
  const lines = [
    {
      cls: "triage",
      text: `[NEEDS & IMPACT] ${needs.narrative} Priority score ${needs.priorityScore} — ${needs.populationAtRisk} at risk, ${Math.round(needs.cascadeProbability * 100)}% cascade risk.`
    }
  ];

  if (resources.fullyFeasible) {
    lines.push({
      cls: "logistics",
      text: `[RESOURCE & LOGISTICS] Feasibility ${Math.round(resources.accessFeasibilityIndex * 100)}%. Allocated: ${summarizeAllocations(resources.allocations)}. No objections.`
    });
  } else {
    lines.push({
      cls: "logistics",
      text: `[RESOURCE & LOGISTICS] CHALLENGE: ${resources.constraint || "resourcing constraint"} — ${resources.counterProposal.summary}.`
    });
    lines.push({ cls: "triage", text: `[NEEDS & IMPACT] ${urgentReassertion(needs)}` });
    lines.push({ cls: "system", text: `[SYSTEM] Cross-referencing live inventory and feasibility matrix...` });
  }

  lines.push({ cls: "commander", text: `[COMMAND & PRIORITIZATION] ${command.finalPlan}` });
  return lines;
}

function urgentReassertion(needs) {
  const urgent = needs.panicRating >= 90 || needs.lifeThreat === "CRITICAL";
  return urgent
    ? `Life threat ${needs.lifeThreat}, priority score ${needs.priorityScore} — requesting controlled override; time-critical.`
    : `Priority score ${needs.priorityScore}, life threat ${needs.lifeThreat} — urgency noted, but the constraint remains active.`;
}

function summarizeAllocations(allocations) {
  const granted = allocations.filter((a) => a.granted > 0);
  if (!granted.length) return "no additional resources required";
  return granted.map((a) => `${a.granted} ${a.label || a.type.replace(/_/g, " ")}`).join(", ");
}

function renderVerdictSummary(log, needs, resources, command) {
  const existing = log.parentElement.querySelector(".verdict-summary");
  if (existing) existing.remove();

  const truncate = (text, maxLength = 96) => {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;
  };

  const needsSummary = `${needs.lifeThreat} threat, priority ${needs.priorityScore} (${needs.populationAtRisk} at risk, ${Math.round(needs.cascadeProbability * 100)}% cascade)`;
  const resourceSummary = resources.fullyFeasible
    ? `Feasibility ${Math.round(resources.accessFeasibilityIndex * 100)}% — ${summarizeAllocations(resources.allocations)}`
    : `CHALLENGE — ${resources.constraint || "constraint"}: ${resources.counterProposal.summary}`;

  const summary = document.createElement("aside");
  summary.className = "verdict-summary";
  summary.setAttribute("aria-label", "Verdict summary");
  [
    ["Needs & Impact", needsSummary],
    ["Resource & Logistics", resourceSummary],
    ["Command", command.finalPlan || "No final decision."]
  ].forEach(([agent, text]) => {
    const line = document.createElement("p");
    line.className = "verdict-summary-line";
    const label = document.createElement("strong");
    label.textContent = `${agent}:`;
    line.append(label, document.createTextNode(` ${truncate(text)}`));
    summary.appendChild(line);
  });

  log.parentElement.insertBefore(summary, log);
}

async function runDebate(scenario) {
  cancelDebate();
  const generation = debateGeneration;
  const log = document.getElementById("debate-log");
  log.innerHTML = "";
  setDecisionControlsDisabled(true);
  setPlaybackControls("idle");
  setDebateProgress(0, 0);

  const inventory = typeof resourceInventory !== "undefined" ? resourceInventory : [];
  const depotList = typeof depots !== "undefined" ? depots : [];
  const { needs, resources, command } = runAgenticCommandCore(scenario, inventory, depotList);
  latestDispatchPlans[scenario.id] = command.dispatchPlan;
  renderVerdictSummary(log, needs, resources, command);
  if (typeof clearGroqPanels === "function") clearGroqPanels(); // reset stale draft text from the previous case

  let lines;

  if (typeof USE_GROQ !== "undefined" && USE_GROQ && GROQ_API_KEY) {
    if (!navigator.onLine) {
      // offline_behavior: never queue the call — just fall back for this
      // round and let the operator re-trigger once back online.
      // NOTE: this notice used to be appended straight to #debate-log via
      // appendDecisionLog(), but startPlayback() below unconditionally does
      // log.innerHTML = "" as its first action, which wiped it out before
      // the operator ever saw it. Fix: fold it into the lines array itself
      // so it survives as the first card in the playback sequence.
      lines = buildRuleLines(needs, resources, command);
      lines.unshift({ cls: "system", text: "[SYSTEM] Offline — Groq dispatch agents unavailable this round. Using local fallback logic." });
    } else {
      const p = document.createElement("p");
      p.className = "commander";
      p.textContent = "[SYSTEM] Routing to Groq dispatch agents...";
      log.appendChild(p);
      try {
        lines = await buildGroqLines(scenario);
        if (generation !== debateGeneration) return;
        log.innerHTML = ""; // clear the "routing" message once real lines are ready
      } catch (err) {
        console.warn("Groq call failed, falling back to rule-based logic:", err);
        if (generation !== debateGeneration) return;
        // Same fix as above: don't append a DOM node here, it gets wiped by
        // startPlayback()'s log.innerHTML = "" a few lines down. Prepend a
        // system line to the actual lines array instead so it plays back
        // and stays on screen.
        lines = buildRuleLines(needs, resources, command);
        lines.unshift({ cls: "system", text: `[SYSTEM] Groq call failed (${err && err.message ? err.message : "unknown error"}) — using local fallback logic.` });
      }
    }
  } else if (USE_REAL_AI && AEGIS_API_KEY) {
    const p = document.createElement("p");
    p.className = "commander";
    p.textContent = "[SYSTEM] Contacting AI agents...";
    log.appendChild(p);
    try {
      lines = await buildAILines(scenario);
      if (generation !== debateGeneration) return;
      log.innerHTML = ""; // clear the "contacting" message once real lines are ready
    } catch (err) {
      console.warn("Real AI call failed, falling back to rule-based logic:", err);
      if (generation !== debateGeneration) return;
      // Same startPlayback()-wipes-the-log fix as the Groq branch above.
      lines = buildRuleLines(needs, resources, command);
      lines.unshift({ cls: "system", text: `[SYSTEM] AI call failed (${err && err.message ? err.message : "unknown error"}) — using local fallback logic.` });
    }
  } else {
    lines = buildRuleLines(needs, resources, command);
  }

  if (generation !== debateGeneration) return;
  startPlayback(scenario, lines);
}
