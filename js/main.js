// MAIN.JS — Person 1 (Frontend/UI Lead) owns this file.
// It loads mock data, populates Panel A's case list, and wires up interactions.

let scenarios = [];
let resolvedIds = new Set();

async function loadScenarios() {
  const res = await fetch("data/scenarios.json");
  scenarios = await res.json();
  renderCaseList();
  updateIncidentCounter();
}

function renderCaseList() {
  const list = document.getElementById("case-list");
  list.innerHTML = "";
  scenarios.forEach((s) => {
    const btn = document.createElement("button");
    btn.textContent = (resolvedIds.has(s.id) ? "✔ " : "") + s.name;
    if (resolvedIds.has(s.id)) btn.classList.add("resolved");
    btn.onclick = () => selectScenario(s.id);
    list.appendChild(btn);
  });
}

function updateIncidentCounter() {
  const active = scenarios.length - resolvedIds.size;
  document.getElementById("incident-counter").textContent = `${active} ACTIVE INCIDENTS`;
}

let activeScenario = null;

function selectScenario(id) {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) return;
  activeScenario = scenario;

  // Update Panel A voice module
  document.getElementById("transcript").textContent = scenario.transcript;
  document.getElementById("hazard-tag").textContent = scenario.hazardTag;
  document.getElementById("stress-fill").style.width = scenario.stressIndex + "%";
  renderWaveform();

  // Update Panel B map
  renderHazardRing(scenario);
  resetAssetPosition();

  // Trigger Panel C debate for this scenario
  runDebate(scenario);
}

document.getElementById("approve-btn").addEventListener("click", () => {
  if (!activeScenario) return;
  moveAssetToScenario(activeScenario);
  playConfirm();
  resolvedIds.add(activeScenario.id);
  renderCaseList();
  updateIncidentCounter();
});

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
document.getElementById("speak-btn").addEventListener("click", () => {
  if (!activeScenario) return;
  speakTranscript(activeScenario.transcript);
});

function speakTranscript(text) {
  if (!window.speechSynthesis) {
    alert("Text-to-speech isn't supported in this browser.");
    return;
  }
  speechSynthesis.cancel(); // stop any currently playing speech first
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  speechSynthesis.speak(utter);
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
