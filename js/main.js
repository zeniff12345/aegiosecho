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

// Action execution when human operator authorizes payload
function authorizeSwarmAction() {
  const terminal = document.getElementById('terminal-stream');
  const authBtn = document.getElementById('auth-btn');

  if (terminal) {
    const execLine = document.createElement('p');
    execLine.style.color = "#10b981";
    execLine.style.fontWeight = "bold";
    execLine.style.marginTop = "10px";
    execLine.innerHTML = "[HUMAN AUTHORIZATION GRANTED]: CRITICAL SWARM PAYLOAD EXECUTED.";
    terminal.appendChild(execLine);
    terminal.scrollTop = terminal.scrollHeight;
  }

  if (authBtn) {
    authBtn.innerText = "SWARM ACTIONS EXECUTED";
    authBtn.disabled = true;
    authBtn.style.backgroundColor = "#10b981";
  }
}

function selectScenarioData(scenario) {
  // 1. Update Panel A
  const hazardTag = document.getElementById('hazard-tag-text');
  const stressBar = document.getElementById('stress-bar');
  const stressValue = document.getElementById('stress-value');

  if (hazardTag) hazardTag.innerText = scenario.hazardTag || "Active Alert";
  if (stressBar) stressBar.style.width = `${scenario.stressIndex || 0}%`;
  if (stressValue) stressValue.innerText = `${scenario.stressIndex || 0}%`;

  // 2. Update Panel B
  if (typeof updateTacticalMap === 'function') {
    updateTacticalMap(scenario);
  }

  // 3. Trigger Panel C Agent Debate Stream
  if (typeof runDebate === 'function') {
    runDebate(scenario);
  }
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
      { id: "case-01", name: "Balkhu River Flash Flood", hazardTag: "Rushing water detected", stressIndex: 85, mapX: 45, mapY: 60 },
      { id: "case-02", name: "Sindhupalchok Landslide", hazardTag: "Debris flow hazard", stressIndex: 65, mapX: 70, mapY: 35 }
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

  // Attach click listener to authorization button
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) {
    authBtn.onclick = authorizeSwarmAction;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});