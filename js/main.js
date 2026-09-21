// MAIN.JS — Person 1 (Frontend/UI Lead) owns this file.
// It loads mock data, populates Panel A's case list, and wires up interactions.

let scenarios = [];
let resourceInventory = [];
let depots = [];
let resolvedIds = new Set();
let deniedIds = new Set();
let heldIds = new Set();
const caseView = {
  query: "",
  sort: "name",
  filter: "all"
};

const CRITICAL_STRESS = 85;
const HIGH_STRESS = 60;

async function loadScenarios() {
  const res = await fetch("data/scenarios.json");
  scenarios = await res.json();
  renderCaseList();
  updateIncidentCounter();
  renderMapLegend();
  renderCascadeGlow();
  renderCascadeWatchZones();
}

// Loads the Resource & Logistics Agent's live depot — Available/Deployed/
// Reserved/Low counts across every resource category. Deploying via the
// approve button moves units from Available to Deployed (see applyAllocations
// in resourceLogisticsAgent.js); nothing else mutates this at runtime.
async function loadResources() {
  const res = await fetch("data/resources.json");
  resourceInventory = await res.json();
  renderResourceInventory();
}

// The physical depots a dispatch plan's allocations are drawn from — used
// to pick the nearest source depot for each plan and to render Base markers
// on the tactical map.
async function loadDepots() {
  const res = await fetch("data/depots.json");
  depots = await res.json();
  renderDepotMarkers();
}

function renderResourceInventory() {
  const container = document.getElementById("resource-inventory");
  if (!container) return;
  container.innerHTML = "";
  resourceInventory.forEach((item) => {
    const status = item.available <= 0 ? "critical" : item.available <= item.lowThreshold ? "low" : "ok";
    const chip = document.createElement("div");
    chip.className = `resource-chip status-${status}`;
    chip.innerHTML = `
      <span class="resource-chip-label">${item.label}</span>
      <div class="resource-chip-counts">
        <span>Avail: <strong>${item.available}</strong>/${item.total}</span>
        <span>Deployed: ${item.deployed}</span>
      </div>`;
    container.appendChild(chip);
  });
}

function renderCaseList() {
  const list = document.getElementById("case-list");
  list.innerHTML = "";
  const query = caseView.query.trim().toLowerCase();
  const visibleScenarios = scenarios
    .filter((scenario) => {
      const searchableText = [
        scenario.name,
        scenario.region,
        scenario.location,
        scenario.place,
        scenario.hazardTag
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);
      const stress = Number(scenario.stressIndex) || 0;
      const isResolved = isScenarioResolved(scenario.id);
      const matchesFilter = caseView.filter === "all"
        || (caseView.filter === "critical" && stress > CRITICAL_STRESS)
        || (caseView.filter === "priority" && stress > HIGH_STRESS && stress <= CRITICAL_STRESS)
        || (caseView.filter === "resolved" && isResolved);
      return matchesSearch && matchesFilter;
    })
    .slice()
    .sort((left, right) => {
      if (caseView.sort === "stress-desc") {
        return (Number(right.stressIndex) || 0) - (Number(left.stressIndex) || 0)
          || left.name.localeCompare(right.name);
      }
      return left.name.localeCompare(right.name);
    });

  visibleScenarios.forEach((s) => {
    const btn = document.createElement("button");
    const state = resolvedIds.has(s.id)
      ? { label: "APPROVED", className: "approved" }
      : deniedIds.has(s.id)
        ? { label: "DENIED", className: "denied" }
        : heldIds.has(s.id)
          ? { label: "HELD", className: "held" }
          : null;
    btn.textContent = s.name;
    if (state) {
      const badge = document.createElement("span");
      badge.className = `case-state-badge ${state.className}`;
      badge.textContent = state.label;
      btn.appendChild(badge);
    }
    if (resolvedIds.has(s.id)) btn.classList.add("resolved");
    if (deniedIds.has(s.id)) btn.classList.add("denied-case");
    if (heldIds.has(s.id)) btn.classList.add("held-case");
    btn.onclick = () => selectScenario(s.id);
    list.appendChild(btn);
  });

  const criticalLeft = visibleScenarios.filter((scenario) =>
    Number(scenario.stressIndex) > CRITICAL_STRESS && !isScenarioResolved(scenario.id)
  ).length;
  document.getElementById("case-count").textContent =
    `${visibleScenarios.length}/${scenarios.length} shown · ${criticalLeft} crit left`;

  document.querySelectorAll(".case-filter").forEach((button) => {
    const active = button.dataset.filter === caseView.filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function isScenarioResolved(id) {
  return resolvedIds.has(id) || deniedIds.has(id) || heldIds.has(id);
}

document.getElementById("case-search").addEventListener("input", (event) => {
  caseView.query = event.target.value;
  renderCaseList();
});

document.getElementById("case-sort").addEventListener("change", (event) => {
  caseView.sort = event.target.value;
  renderCaseList();
});

document.querySelectorAll(".case-filter").forEach((button) => {
  button.addEventListener("click", () => {
    caseView.filter = button.dataset.filter;
    renderCaseList();
  });
});

function updateIncidentCounter() {
  const active = scenarios.length - resolvedIds.size - deniedIds.size;
  document.getElementById("incident-counter").textContent = `${active} ACTIVE INCIDENTS`;
  document.getElementById("resolved-count").textContent = `${resolvedIds.size + deniedIds.size} resolved`;
}

let activeScenario = null;
let panelTransitionId = 0;
const missionStartedAt = Date.now();

function updateMissionStatus() {
  const elapsed = Math.floor((Date.now() - missionStartedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.getElementById("mission-elapsed").textContent =
    `T+${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  document.getElementById("live-clock").textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

updateMissionStatus();
setInterval(updateMissionStatus, 1000);

document.getElementById("sound-toggle").addEventListener("click", (event) => {
  const enabled = event.currentTarget.getAttribute("aria-pressed") !== "true";
  setSoundEnabled(enabled);
  event.currentTarget.setAttribute("aria-pressed", String(enabled));
  event.currentTarget.textContent = enabled ? "SOUND ON" : "SOUND OFF";
  event.currentTarget.classList.toggle("muted", !enabled);
});

// Runs the full Needs & Impact -> Resource & Logistics -> Command &
// Prioritization pipeline for a scenario against the live inventory. Pure —
// safe to call as many times as needed (re-selecting a case, refreshing the
// map) since it never mutates resourceInventory itself.
function getFinalDispatchResult(scenario) {
  return runAgenticCommandCore(scenario, resourceInventory, depots);
}

function beginPanelTransition() {
  const transitionId = ++panelTransitionId;
  const mapPanel = document.getElementById("panel-b");
  const map = document.getElementById("map-area");
  const debate = document.getElementById("debate-log");
  mapPanel.classList.add("case-switching");
  map.classList.add("case-switching");
  debate.classList.add("case-switching");
  setTimeout(() => {
    if (transitionId !== panelTransitionId) return;
    setTimeout(() => {
      if (transitionId !== panelTransitionId) return;
      mapPanel.classList.remove("case-switching");
      map.classList.remove("case-switching");
      debate.classList.remove("case-switching");
    }, 180);
  }, 0);
}

function selectScenario(id) {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) return;
  activeScenario = scenario;
  if (typeof cancelDebate === "function") cancelDebate();
  beginPanelTransition();
  resetDecisionControls();

  // Update Panel A case signal display
  document.getElementById("transcript").textContent = scenario.transcript;
  document.getElementById("hazard-tag").textContent = scenario.hazardTag;
  document.getElementById("stress-fill").style.width = scenario.stressIndex + "%";

  // Update Panel B map
  renderHazardRing(scenario);
  resetAssetPosition();
  let displayAssetType = scenario.assetType;
  if (resolvedIds.has(scenario.id)) {
    displayAssetType = getFinalDispatchResult(scenario).command.finalAssetType;
    restoreDeployedAsset(scenario, displayAssetType);
  }
  updateMapInfo(scenario, displayAssetType);

  // Trigger Panel C debate for this scenario
  runDebate(scenario);
}

document.getElementById("approve-btn").addEventListener("click", () => {
  if (!activeScenario) return;
  const result = getFinalDispatchResult(activeScenario);
  applyAllocations(resourceInventory, result.resources.allocations);
  signDispatchPlan(result.command.dispatchPlan, "APPROVED");
  latestDispatchPlans[activeScenario.id] = result.command.dispatchPlan;
  moveAssetToScenario(activeScenario, result.command.finalAssetType);
  playConfirm();
  resolvedIds.add(activeScenario.id);
  deniedIds.delete(activeScenario.id);
  heldIds.delete(activeScenario.id);
  appendDecisionLog("[SYSTEM] Human authorization confirmed — asset deployed. Case marked approved.");
  setDecisionControlsDisabled(true);
  renderCaseList();
  updateIncidentCounter();
  updateMapInfo(activeScenario, result.command.finalAssetType);
  renderResourceInventory();
});

document.getElementById("deny-btn").addEventListener("click", () => {
  if (!activeScenario || deniedIds.has(activeScenario.id)) return;
  const panel = document.getElementById("deny-reason-panel");
  panel.hidden = false;
});

document.querySelectorAll(".reason-option").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.reason === "Other") {
      document.querySelector(".other-reason-row").hidden = false;
      document.getElementById("other-deny-reason").focus();
      return;
    }
    finalizeDeny(button.dataset.reason);
  });
});

document.getElementById("submit-other-deny").addEventListener("click", () => {
  const input = document.getElementById("other-deny-reason");
  const reason = input.value.trim();
  if (reason) finalizeDeny(reason);
  else input.focus();
});

document.getElementById("hold-btn").addEventListener("click", () => {
  if (!activeScenario || heldIds.has(activeScenario.id)) return;
  heldIds.add(activeScenario.id);
  resolvedIds.delete(activeScenario.id);
  deniedIds.delete(activeScenario.id);
  if (latestDispatchPlans[activeScenario.id]) signDispatchPlan(latestDispatchPlans[activeScenario.id], "HELD");
  appendDecisionLog("[SYSTEM] Held for later review — no action taken.");
  renderCaseList();
  updateIncidentCounter();
  updateMapInfo(activeScenario);
  setDecisionControlsDisabled(false);
});

function finalizeDeny(reason) {
  if (!activeScenario || !reason) return;
  deniedIds.add(activeScenario.id);
  resolvedIds.delete(activeScenario.id);
  heldIds.delete(activeScenario.id);
  if (latestDispatchPlans[activeScenario.id]) signDispatchPlan(latestDispatchPlans[activeScenario.id], "DENIED");
  appendDecisionLog(`[SYSTEM] Human override — plan denied (${reason}). Case flagged for manual reassignment.`);
  document.getElementById("deny-reason-panel").hidden = true;
  document.querySelector(".other-reason-row").hidden = true;
  document.getElementById("other-deny-reason").value = "";
  setDecisionControlsDisabled(true);
  renderCaseList();
  updateIncidentCounter();
  updateMapInfo(activeScenario);
}

function setDecisionControlsDisabled(disabled) {
  ["approve-btn", "deny-btn", "hold-btn"].forEach((id) => {
    document.getElementById(id).disabled = disabled;
  });
}

function resetDecisionControls() {
  const finalized = activeScenario && (resolvedIds.has(activeScenario.id) || deniedIds.has(activeScenario.id));
  setDecisionControlsDisabled(Boolean(finalized));
  document.getElementById("deny-reason-panel").hidden = true;
  document.querySelector(".other-reason-row").hidden = true;
  document.getElementById("other-deny-reason").value = "";
}

function appendDecisionLog(text) {
  const log = document.getElementById("debate-log");
  const line = document.createElement("article");
  line.className = "debate-card system is-visible decision-log";
  line.innerHTML = `<div class="debate-card-header"><span class="debate-agent">SYSTEM</span><time class="debate-time">${new Date().toLocaleTimeString([], { hour12: false })}</time></div><div class="debate-card-body"><div class="debate-message"></div></div>`;
  line.querySelector(".debate-message").textContent = text.replace(/^\[SYSTEM\]\s*/, "");
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

// Infrastructure Core Toggle — switches between Cloud Dependent / Edge Offline modes
document.getElementById("grid-toggle").addEventListener("click", () => {
  const toggle = document.getElementById("grid-toggle");
  const isOffline = toggle.classList.contains("offline");
  if (isOffline) {
    toggle.classList.remove("offline");
    toggle.classList.add("online");
    toggle.textContent = "CLOUD DEPENDENT MODE";
  } else {
    toggle.classList.remove("online");
    toggle.classList.add("offline");
    toggle.textContent = "DECENTRALIZED EDGE MODE — 100% OFFLINE";
  }
});

// Boot sequence — fades out after ~2.5s to reveal the dashboard
function runBootSequence() {
  const overlay = document.getElementById("boot-overlay");
  setTimeout(() => {
    overlay.classList.add("boot-hidden");
    setTimeout(() => overlay.remove(), 800);
  }, 2500);
}

// AI Mode toggle — switches between rule-based (default, offline-safe) and
// real AI reasoning (needs your own API key + internet)
document.getElementById("ai-mode-toggle").addEventListener("click", () => {
  const btn = document.getElementById("ai-mode-toggle");
  if (!USE_REAL_AI) {
    const key = prompt(
      "Enter your Anthropic API key to enable real AI reasoning.\n" +
      "Get one at console.anthropic.com — never commit this key to GitHub.\n" +
      "Leave blank to cancel and stay in rule-based mode."
    );
    if (key && key.trim()) {
      AEGIS_API_KEY = key.trim();
      USE_REAL_AI = true;
      btn.textContent = "🧠 REAL AI MODE";
      btn.classList.add("ai-active");
      // Only one AI provider drives the debate text at a time.
      turnOffGroqMode();
    }
  } else {
    USE_REAL_AI = false;
    AEGIS_API_KEY = null;
    btn.textContent = "🧠 RULE-BASED MODE";
    btn.classList.remove("ai-active");
  }
});

// GROQ AGENTS toggle — per GROQ_DISPATCH_AGENTS_ROUTING.json: direct
// frontend-to-Groq routing, key entered at runtime and kept in memory only
// (same safe pattern as the Claude toggle above; see js/groqAgent.js's
// header comment for the full routing-file-to-feature mapping).
function turnOffGroqMode() {
  const btn = document.getElementById("groq-mode-toggle");
  USE_GROQ = false;
  GROQ_API_KEY = null;
  if (btn) {
    btn.textContent = "⚡ GROQ AGENTS OFF";
    btn.classList.remove("ai-active");
  }
  clearGroqPanels();
}

document.getElementById("groq-mode-toggle")?.addEventListener("click", () => {
  const btn = document.getElementById("groq-mode-toggle");
  if (!USE_GROQ) {
    if (!navigator.onLine) {
      appendDecisionLog("[SYSTEM] Groq dispatch agents need internet — currently offline.");
      return;
    }
    const key = prompt(
      "Enter your Groq API key to give the three dispatch agents real reasoning.\n" +
      "Get one at console.groq.com — this stays in this browser tab's memory only " +
      "and is never written to any project file.\n" +
      "Leave blank to cancel and stay in rule-based mode."
    );
    if (!key || !key.trim()) return;
    const model = prompt(
      "Groq model to use for all three agents (one shared model, per the routing spec):",
      GROQ_MODEL
    );
    if (model && model.trim()) {
      GROQ_MODEL = model.trim();
      localStorage.setItem("aegisGroqModel", GROQ_MODEL);
    }
    GROQ_API_KEY = key.trim();
    USE_GROQ = true;
    btn.textContent = "⚡ GROQ AGENTS ON";
    btn.classList.add("ai-active");
    // Only one AI provider drives the debate text at a time.
    USE_REAL_AI = false;
    AEGIS_API_KEY = null;
    const claudeBtn = document.getElementById("ai-mode-toggle");
    if (claudeBtn) {
      claudeBtn.textContent = "🧠 RULE-BASED MODE";
      claudeBtn.classList.remove("ai-active");
    }
    appendDecisionLog(`[SYSTEM] Groq dispatch agents enabled — model: ${GROQ_MODEL} (recorded ${new Date().toLocaleString()}). Note this in the operator runbook.`);
  } else {
    turnOffGroqMode();
  }
});

window.addEventListener("DOMContentLoaded", refreshGroqAvailability);

document.getElementById("dispatch-json-btn")?.addEventListener("click", () => {
  if (!activeScenario) return;
  const plan = latestDispatchPlans[activeScenario.id];
  if (!plan) return;
  const json = JSON.stringify(plan, null, 2);
  const done = () => appendDecisionLog("[SYSTEM] Dispatch plan JSON copied to clipboard.");
  const fallback = () => {
    console.log(json);
    appendDecisionLog("[SYSTEM] Clipboard unavailable — dispatch plan JSON logged to console.");
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(json).then(done).catch(fallback);
  } else {
    fallback();
  }
});

// EXPORT REPORT — the "agentic AI" report-export feature: turns the
// already-computed dispatch decision + full debate transcript for the
// active case into a downloadable PDF. No new API call — everything here
// comes from latestReportData (captured in debateEngine.js the moment a
// debate finishes computing, before playback starts) plus the live human
// decision status (resolved/denied/held), read fresh at export time so the
// PDF always reflects the current state even if exported well after the
// debate finished.
function currentDecisionStatus(scenarioId) {
  if (resolvedIds.has(scenarioId)) return "APPROVED — asset deployed";
  if (deniedIds.has(scenarioId)) return "DENIED";
  if (heldIds.has(scenarioId)) return "HELD FOR LATER REVIEW";
  return "PENDING — awaiting human authorization";
}

function agentLabelForLine(line) {
  if (line.cls === "system") return "SYSTEM";
  if (line.cls === "commander") return "COMMAND & PRIORITIZATION";
  if (line.cls === "triage") return "NEEDS & IMPACT";
  if (line.cls === "logistics") return "RESOURCE & LOGISTICS";
  return line.cls.toUpperCase();
}

function stripAgentPrefix(text) {
  return text.replace(/^\[[^\]]+\]\s*/, "");
}

function buildDispatchReportPdf(report) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  function ensureSpace(lineHeight) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function writeLines(text, { fontStyle = "normal", fontSize = 10, lineHeight = 14, gapAfter = 6 } = {}) {
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(String(text), maxWidth);
    wrapped.forEach((wrappedLine) => {
      ensureSpace(lineHeight);
      doc.text(wrappedLine, margin, y);
      y += lineHeight;
    });
    y += gapAfter;
  }

  function writeHeading(text) {
    ensureSpace(22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(text, margin, y);
    y += 16;
  }

  writeLines("AEGIS ECHO — DISPATCH DECISION REPORT", { fontStyle: "bold", fontSize: 16, lineHeight: 20, gapAfter: 4 });
  writeLines(
    "AI-assisted draft output for human command review. Not a verified live feed — see data provenance below.",
    { fontStyle: "italic", fontSize: 9, gapAfter: 12 }
  );

  writeHeading("Case");
  writeLines(`${report.scenario.name}${report.scenario.region ? " — " + report.scenario.region : ""}`, { fontStyle: "bold" });
  if (report.scenario.hazardTag) writeLines(`Hazard: ${report.scenario.hazardTag}`);
  writeLines(`Stress Index: ${report.scenario.stressIndex}`);
  if (report.scenario.transcript) writeLines(`Field transcript: "${report.scenario.transcript}"`);

  writeHeading("Needs & Impact Agent");
  writeLines(report.needs.narrative || "");
  writeLines(
    `Priority score ${report.needs.priorityScore} · ${report.needs.populationAtRisk} at risk · ` +
    `${Math.round((report.needs.cascadeProbability || 0) * 100)}% cascade risk · Life threat: ${report.needs.lifeThreat}`
  );

  writeHeading("Resource & Logistics Agent");
  if (report.resources.fullyFeasible) {
    writeLines(`Feasibility ${Math.round((report.resources.accessFeasibilityIndex || 0) * 100)}% — no objections.`);
    writeLines(`Allocated: ${summarizeAllocations(report.resources.allocations)}`);
  } else {
    writeLines(`CHALLENGE: ${report.resources.constraint || "resourcing constraint"}`);
    writeLines(report.resources.counterProposal?.summary || "");
  }

  writeHeading("Command & Prioritization Agent");
  writeLines(report.command.finalPlan || "");
  if (report.command.finalAssetType) writeLines(`Final asset: ${report.command.finalAssetType}`);

  writeHeading("Human Command Decision");
  writeLines(currentDecisionStatus(report.scenario.id), { fontStyle: "bold" });

  writeHeading("Reasoning Source");
  writeLines(report.aiModelLabel ? `${report.aiSourceLabel} (model: ${report.aiModelLabel})` : report.aiSourceLabel);

  writeHeading("Full Deliberation Transcript");
  report.transcriptLines.forEach((line) => {
    writeLines(agentLabelForLine(line), { fontStyle: "bold", fontSize: 9, gapAfter: 1 });
    writeLines(stripAgentPrefix(line.text), { fontSize: 10, gapAfter: 8 });
  });

  writeLines(
    `Report generated ${new Date(report.generatedAt).toLocaleString()} · Aegis Echo Command Dashboard`,
    { fontStyle: "italic", fontSize: 8, gapAfter: 0 }
  );

  return doc;
}

document.getElementById("export-report-btn")?.addEventListener("click", () => {
  if (!activeScenario) return;
  const report = latestReportData?.[activeScenario.id];
  if (!report) {
    appendDecisionLog("[SYSTEM] No report data available for this case yet.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    appendDecisionLog("[SYSTEM] PDF export unavailable — report library failed to load (needs internet).");
    return;
  }
  try {
    const doc = buildDispatchReportPdf(report);
    const safeName = (report.scenario.name || "case").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    doc.save(`aegis-echo-report-${safeName}.pdf`);
    appendDecisionLog("[SYSTEM] Dispatch report PDF downloaded.");
  } catch (err) {
    console.error("PDF export failed:", err);
    appendDecisionLog(`[SYSTEM] PDF export failed (${err && err.message ? err.message : "unknown error"}).`);
  }
});

loadScenarios();
loadResources();
loadDepots();
runBootSequence();
