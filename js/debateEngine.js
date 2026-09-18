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

function cancelDebate() {
  debateGeneration++;
  debateTimers.forEach((timer) => clearTimeout(timer));
  debateTimers.clear();
}

function scheduleDebate(callback, delay, generation) {
  const timer = setTimeout(() => {
    debateTimers.delete(timer);
    if (generation === debateGeneration) callback();
  }, delay);
  debateTimers.add(timer);
}

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
  const alternative = recommendation
    ? objectionText.slice(recommendation.index + recommendation[0].length).replace(/[.!?]+$/, "").trim()
    : "";
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
  const approveBtn = document.getElementById("approve-btn");
  log.innerHTML = "";
  setDecisionControlsDisabled(true);

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

  // Render each exchange as a small live-response card.
  let i = 0;
  function typeNext() {
    if (generation !== debateGeneration) return;
    if (i >= lines.length) {
      const finalized = resolvedIds.has(scenario.id) || deniedIds.has(scenario.id);
      setDecisionControlsDisabled(finalized);
      playConfirm();
      return;
    }
    const line = lines[i];
    const prefix = line.text.match(/^\[([^\]]+)\]\s*/);
    const label = prefix ? prefix[1] : line.cls.toUpperCase();
    const message = prefix ? line.text.slice(prefix[0].length) : line.text;
    const visualClass = label === "SYSTEM" ? "system" : line.cls;
    const card = document.createElement("article");
    card.className = `debate-card ${visualClass}`;

    const header = document.createElement("div");
    header.className = "debate-card-header";
    const agentLabel = document.createElement("span");
    agentLabel.className = "debate-agent";
    agentLabel.textContent = label;
    const time = document.createElement("time");
    time.className = "debate-time";
    time.textContent = new Date().toLocaleTimeString([], { hour12: false });
    header.append(agentLabel, time);

    const body = document.createElement("div");
    body.className = "debate-card-body";
    const typing = document.createElement("span");
    typing.className = "typing-indicator";
    typing.setAttribute("aria-label", `${label} is typing`);
    for (let dot = 0; dot < 3; dot++) {
      typing.appendChild(document.createElement("i"));
    }
    body.appendChild(typing);
    card.append(header, body);
    log.appendChild(card);
    log.scrollTop = log.scrollHeight;
    playBlip();

    scheduleDebate(() => {
      if (generation !== debateGeneration) return;
      typing.remove();
      const messageNode = document.createElement("div");
      messageNode.className = "debate-message";
      body.appendChild(messageNode);
      let character = 0;
      function typeMessage() {
        messageNode.textContent = message.slice(0, character);
        log.scrollTop = log.scrollHeight;
        if (character < message.length) {
          character++;
          scheduleDebate(typeMessage, 16, generation);
        } else {
          card.classList.add("is-visible");
          i++;
          scheduleDebate(typeNext, 420, generation);
        }
      }
      typeMessage();
    }, 480, generation);
  }
  typeNext();
}
