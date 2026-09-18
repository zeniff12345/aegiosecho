// MAIN.JS — Person 1 (Frontend/UI Lead) owns this file.
// It loads mock data, populates Panel A's case list, and wires up interactions.

let scenarios = [];
let resolvedIds = new Set();
let deniedIds = new Set();
let heldIds = new Set();

async function loadScenarios() {
  const res = await fetch("data/scenarios.json");
  scenarios = await res.json();
  renderCaseList();
  updateIncidentCounter();
  renderMapLegend();
}

function renderCaseList() {
  const list = document.getElementById("case-list");
  list.innerHTML = "";
  scenarios.forEach((s) => {
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
}

function updateIncidentCounter() {
  const active = scenarios.length - resolvedIds.size - deniedIds.size;
  document.getElementById("incident-counter").textContent = `${active} ACTIVE INCIDENTS`;
}

let activeScenario = null;
let panelTransitionId = 0;

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

  // Update Panel A voice module
  document.getElementById("transcript").textContent = scenario.transcript;
  document.getElementById("hazard-tag").textContent = scenario.hazardTag;
  document.getElementById("stress-fill").style.width = scenario.stressIndex + "%";
  renderWaveform();

  // Update Panel B map
  renderHazardRing(scenario);
  resetAssetPosition();
  if (resolvedIds.has(scenario.id)) restoreDeployedAsset(scenario);
  updateMapInfo(scenario);

  // Trigger Panel C debate for this scenario
  runDebate(scenario);
}

document.getElementById("approve-btn").addEventListener("click", () => {
  if (!activeScenario) return;
  moveAssetToScenario(activeScenario);
  playConfirm();
  resolvedIds.add(activeScenario.id);
  deniedIds.delete(activeScenario.id);
  heldIds.delete(activeScenario.id);
  appendDecisionLog("[SYSTEM] Human authorization confirmed — asset deployed. Case marked approved.");
  setDecisionControlsDisabled(true);
  renderCaseList();
  updateIncidentCounter();
  updateMapInfo(activeScenario);
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

// Speaker button — plays the transcript aloud using the browser's built-in
// text-to-speech (works offline in most browsers, no API needed)
let speechVoices = [];
let activeUtterance = null;

function refreshSpeechVoices() {
  if (window.speechSynthesis) speechVoices = window.speechSynthesis.getVoices();
}

refreshSpeechVoices();
if (window.speechSynthesis) {
  if (typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", refreshSpeechVoices);
  } else {
    window.speechSynthesis.onvoiceschanged = refreshSpeechVoices;
  }
}

document.getElementById("speak-btn").addEventListener("click", () => {
  if (!activeScenario) return;
  speakTranscript(activeScenario.transcript);
});

function speakTranscript(text) {
  const synth = window.speechSynthesis;
  const button = document.getElementById("speak-btn");
  if (!synth) {
    button.title = "Text-to-speech isn't supported in this browser";
    return;
  }

  refreshSpeechVoices();
  synth.cancel(); // Stop an earlier utterance before starting this click's fresh one.
  const utter = new SpeechSynthesisUtterance(String(text || ""));
  const preferredVoice = speechVoices.find(voice => /^en(-|_)/i.test(voice.lang)) || speechVoices[0];
  if (preferredVoice) utter.voice = preferredVoice;
  utter.lang = preferredVoice ? preferredVoice.lang : "en-US";
  utter.rate = 1.05;
  activeUtterance = utter;
  button.classList.add("speaking");
  button.setAttribute("aria-pressed", "true");
  button.title = "Stop speaking";

  const clearSpeakingState = () => {
    if (activeUtterance !== utter) return;
    activeUtterance = null;
    button.classList.remove("speaking");
    button.setAttribute("aria-pressed", "false");
    button.title = "Play transcript aloud";
  };
  utter.onend = clearSpeakingState;
  utter.onerror = clearSpeakingState;
  synth.speak(utter);
}

// Live Voice Intake — real microphone speech-to-text (needs internet)
document.getElementById("live-intake-btn").addEventListener("click", startVoiceIntake);

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
    }
  } else {
    USE_REAL_AI = false;
    AEGIS_API_KEY = null;
    btn.textContent = "🧠 RULE-BASED MODE";
    btn.classList.remove("ai-active");
  }
});

renderWaveform();
loadScenarios();
runBootSequence();
