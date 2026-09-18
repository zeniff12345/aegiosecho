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
  const finalPlan = String(commanderResult.finalPlan || "").replace(/\.{2,}/g, ".");

  const lines = [
    { cls: "triage", text: `[TRIAGE] ${triageResult.proposal}` }
  ];

  if (isDelayed) {
    lines.push({ cls: "logistics", text: `[LOGISTICS] Deployment delayed pending clearance: ${reason}.` });
    if (alternative) {
      lines.push({ cls: "logistics", text: `[LOGISTICS] Proposed alternative: ${alternative}.` });
    }
  } else if (objection) {
    lines.push({ cls: "logistics", text: `[LOGISTICS] ${objection}` });
    lines.push({
      cls: "logistics",
      text: `[LOGISTICS] Proposed alternative: ${alternative || "alternate route/asset"}.`
    });
  } else {
    lines.push({ cls: "logistics", text: `[LOGISTICS] Route confirmed. No objections.` });
  }

  if (objection || isDelayed) {
    lines.push({ cls: "commander", text: `[SYSTEM] Cross-referencing asset telemetry...` });
  }

  lines.push({ cls: "commander", text: `[COMMANDER] ${finalPlan}` });
  return lines;
}

async function runDebate(scenario) {
  const log = document.getElementById("debate-log");
  const approveBtn = document.getElementById("approve-btn");
  log.innerHTML = "";
  approveBtn.disabled = true;

  let lines;

  if (USE_REAL_AI && AEGIS_API_KEY) {
    const p = document.createElement("p");
    p.className = "commander";
    p.textContent = "[SYSTEM] Contacting AI agents...";
    log.appendChild(p);
    try {
      lines = await buildAILines(scenario);
      log.innerHTML = ""; // clear the "contacting" message once real lines are ready
    } catch (err) {
      console.warn("Real AI call failed, falling back to rule-based logic:", err);
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

  // Type each line out with a delay so it visibly "runs" rather than appearing instantly.
  let i = 0;
  function typeNext() {
    if (i >= lines.length) {
      approveBtn.disabled = false;
      playConfirm();
      return;
    }
    const line = lines[i];
    const p = document.createElement("p");
    p.className = line.cls;
    const time = new Date().toLocaleTimeString([], { hour12: false });
    p.textContent = `[${time}] ${line.text}`;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    playBlip();
    i++;
    setTimeout(typeNext, 850 + Math.random() * 400); // slight randomness so it feels less robotic
  }
  typeNext();
}
