// DEBATE ENGINE — this is your #1 priority feature.
// It makes Panel C look like a LIVE execution loop, not a static script.
// Flow: (1) ingest & score -> (2) conflict/debate if agents disagree -> (3) final payload.
//
// Supports TWO modes:
// - Rule-based (default, always works, fully offline): buildRuleLines()
// - Real AI (optional, needs API key + internet): buildAILines() in aiAgent.js
// If real AI mode is on but the call fails for any reason (no internet, bad
// key, rate limit), it automatically falls back to rule-based so the demo
// never breaks.

let debateGeneration = 0;
const debateTimers = new Set();
let activePlayback = null;
let playbackSpeed = 1;
const PLAYBACK_SPEEDS = [1, 2, 0.5];

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
  if (line.cls === "triage") return lineIndex === 0 ? "PROPOSE" : "COUNTER";
  if (line.cls === "logistics") {
    return /objection|hard constraint|delayed/i.test(line.text) ? "FLAG/REJECT" : "COUNTER";
  }
  return "";
}

function playbackLines(lines) {
  return lines.filter((line) => !(
    line.cls === "logistics" && /Route confirmed\. No objections\./i.test(line.text)
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
  if (pause) {
    pause.disabled = state === "idle";
    pause.textContent = state === "paused" ? "RESUME" : "PAUSE";
  }
  if (replay) replay.disabled = state === "idle";
  if (speed) {
    speed.disabled = state === "idle";
    speed.textContent = `${playbackSpeed}x`;
  }
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

function buildRuleLines(scenario) {
  const triageResult = triageAssess(scenario);
  const logisticsResult = logisticsCheck(scenario);
  const commanderResult = commanderResolve(triageResult, logisticsResult, scenario);
  const objection = typeof logisticsResult.objection === "string"
    ? logisticsResult.objection.trim()
    : "";
  const isDelayed = String(logisticsResult.status || "").toUpperCase() === "DELAYED";
  const objectionText = objection.replace(/^Objection:\s*/i, "").trim();
  const recommendationMarker = /\bRecommend(?:s|ed)?\s+/i;
  const recommendation = objectionText.match(recommendationMarker);
  let alternative = recommendation
    ? objectionText.slice(recommendation.index + recommendation[0].length).replace(/[.!?]+$/, "").trim()
    : "";
  alternative = alternative
    .replace(/\s+once clearance is confirmed$/i, "")
    .replace(/\s+instead$/i, "")
    .trim();
  const reason = recommendation
    ? objectionText.slice(0, recommendation.index).trim().replace(/[.!?]+$/, "").trim()
    : String(logisticsResult.risk || scenario.logisticsRisk || "route constraints")
        .replace(/[.!?]+$/, "")
        .trim();
  const constraint = String(logisticsResult.risk || reason || "the stated physical constraint")
    .replace(/^Delayed:\s*/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
  const panicRating = Number(triageResult.panicRating) || 0;
  const lifeThreat = String(triageResult.lifeThreat || "elevated").toUpperCase();
  const urgent = panicRating >= 90 || lifeThreat === "CRITICAL";
  const canOverride = urgent && scenario.assetSurvivable === true;
  const finalPlan = String(commanderResult.finalPlan || "").replace(/\.{2,}/g, ".");

  const lines = [
    { cls: "triage", text: `[TRIAGE] ${triageResult.proposal}` }
  ];

  if (objection || isDelayed) {
    lines.push({ cls: "logistics", text: `[LOGISTICS] Hard constraint: ${constraint}.` });
    const urgency = urgent
      ? `Life threat ${lifeThreat}, panic rating ${panicRating} — requesting controlled override; time-critical.`
      : `Panic rating ${panicRating}, life threat ${lifeThreat} — urgency noted, but the constraint remains active.`;
    lines.push({ cls: "triage", text: `[TRIAGE] ${urgency}` });

    const consequence = isDelayed
      ? `Proceeding before clearance risks asset loss and mission failure; ${alternative || "the alternate asset"} remains the safer option.`
      : `Ignoring ${constraint.toLowerCase()} risks asset loss and total mission failure; ${alternative || "the alternate asset"} is the viable fallback.`;
    lines.push({ cls: "logistics", text: `[LOGISTICS] ${consequence}` });
  } else {
    lines.push({ cls: "logistics", text: `[LOGISTICS] Route confirmed. No objections.` });
  }

  if (objection || isDelayed) {
    lines.push({ cls: "system", text: `[SYSTEM] Cross-referencing asset telemetry...` });
    const decision = canOverride
      ? `OVERRIDE: ${String(triageResult.proposal || finalPlan).replace(/\s*immediately\.?$/i, "").trim()}.`
      : finalPlan;
    lines.push({
      cls: "commander",
      text: `[COMMANDER] Weighing Triage's urgency call against Logistics' ${constraint.toLowerCase()} — decision: ${decision}`
    });
    return lines;
  }

  lines.push({ cls: "commander", text: `[COMMANDER] ${finalPlan}` });
  return lines;
}

function renderVerdictSummary(log, triageResult, logisticsResult, commanderResult) {
  const existing = log.parentElement.querySelector(".verdict-summary");
  if (existing) existing.remove();

  const truncate = (text, maxLength = 96) => {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;
  };
  const logisticsSummary = logisticsResult.objection
    ? logisticsResult.objection
    : "No objection, cleared to proceed.";
  const triageSummary = `${triageResult.lifeThreat || "Unknown"} threat, panic ${triageResult.panicRating ?? "n/a"}: ${triageResult.proposal || "No proposal."}`;

  const summary = document.createElement("aside");
  summary.className = "verdict-summary";
  summary.setAttribute("aria-label", "Verdict summary");
  [
    ["Triage", triageSummary],
    ["Logistics", logisticsSummary],
    ["Commander", commanderResult.finalPlan || "No final decision."]
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

  const summaryTriage = triageAssess(scenario);
  const summaryLogistics = logisticsCheck(scenario);
  const summaryCommander = commanderResolve(summaryTriage, summaryLogistics, scenario);
  renderVerdictSummary(log, summaryTriage, summaryLogistics, summaryCommander);

  let lines;

  if (USE_REAL_AI && AEGIS_API_KEY) {
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
      log.innerHTML = "";
      const fallbackNotice = document.createElement("p");
      fallbackNotice.className = "logistics";
      fallbackNotice.textContent = "[SYSTEM] AI call failed — using local fallback logic.";
      log.appendChild(fallbackNotice);
      lines = buildRuleLines(scenario);
    }
  } else {
    lines = buildRuleLines(scenario);
  }

  if (generation !== debateGeneration) return;
  startPlayback(scenario, lines);
}
