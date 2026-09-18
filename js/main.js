/**
 * js/main.js
 * Master dashboard orchestration script for Aegis Echo.
 */

let activeScenarios = [];

function handleModeToggle(checkbox) {
  const label = document.getElementById('mode-label');
  if (!label) return;

  if (checkbox.checked) {
    label.innerText = "DECENTRALIZED EDGE MODE - 100% OFFLINE";
    label.style.color = "#10b981";
  } else {
    label.innerText = "CLOUD DEPENDENT MODE";
    label.style.color = "#f3f4f6";
  }
}

function selectScenarioData(scenario) {
  // Update Panel A: Hazard Tag and Biometric Stress Index
  const hazardTag = document.getElementById('hazard-tag-text');
  const stressBar = document.getElementById('stress-bar');
  const stressValue = document.getElementById('stress-value');

  if (hazardTag) hazardTag.innerText = scenario.hazardTag || "Active Alert";
  if (stressBar) stressBar.style.width = `${scenario.stressIndex || 0}%`;
  if (stressValue) stressValue.innerText = `${scenario.stressIndex || 0}%`;

  // Update Panel B: Spatial Telemetry Tactical Map
  if (typeof updateTacticalMap === 'function') {
    updateTacticalMap(scenario);
  }

  // Update Panel C: Log selection in Agent Terminal
  const terminal = document.getElementById('terminal-stream');
  if (terminal) {
    terminal.innerHTML += `<p style="color:#f59e0b; margin-top: 4px;">[CASE LOADED]: ${scenario.name}</p>`;
    terminal.scrollTop = terminal.scrollHeight;
  }

  // Enable Action Button
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) authBtn.disabled = false;
}

async function loadDashboardData() {
  const container = document.getElementById('case-list-container');
  if (!container) return;

  try {
    const response = await fetch('data/scenarios.json');
    activeScenarios = await response.json();
  } catch (error) {
    console.warn("Could not load scenarios.json, utilizing fallback data.", error);
    activeScenarios = [
      {
        id: "case-01",
        name: "Balkhu River Flash Flood",
        hazardTag: "Rushing water detected",
        stressIndex: 85,
        mapX: 45,
        mapY: 60
      },
      {
        id: "case-02",
        name: "Sindhupalchok Landslide",
        hazardTag: "Debris flow hazard",
        stressIndex: 65,
        mapX: 70,
        mapY: 35
      }
    ];
  }

  container.innerHTML = '';

  activeScenarios.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = 'case-btn';
    btn.innerText = item.name;
    btn.onclick = () => selectScenarioData(item);
    container.appendChild(btn);

    // Auto-select first scenario on load
    if (index === 0) {
      selectScenarioData(item);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});