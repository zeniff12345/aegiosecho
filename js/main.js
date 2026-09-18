/**
 * js/main.js
 * Master dashboard orchestration script for Aegis Echo.
 */

// Global variable to store loaded disaster scenarios
let activeScenarios = [];

/**
 * Toggles between Cloud Dependent Mode and 100% Offline Edge Mode
 */
function handleModeToggle(checkbox) {
  const label = document.getElementById('mode-label');
  if (!label) return;

  if (checkbox.checked) {
    label.innerText = "DECENTRALIZED EDGE MODE - 100% OFFLINE";
    label.style.color = "#10b981"; // Emerald green
  } else {
    label.innerText = "CLOUD DEPENDENT MODE";
    label.style.color = "#f3f4f6"; // Standard text
  }
}

/**
 * Updates Panel A, Panel B, and Panel C when a user clicks a crisis scenario
 */
function selectScenarioData(scenario) {
  // Update Panel A: Hazard Tag and Biometric Stress Index
  const hazardTag = document.getElementById('hazard-tag-text');
  const stressBar = document.getElementById('stress-bar');
  const stressValue = document.getElementById('stress-value');

  if (hazardTag) hazardTag.innerText = scenario.hazardTag || "Active Alert";
  if (stressBar) stressBar.style.width = `${scenario.stressIndex || 0}%`;
  if (stressValue) stressValue.innerText = `${scenario.stressIndex || 0}%`;

  // Update Panel C: Append log entry to Agent Terminal
  const terminal = document.getElementById('terminal-stream');
  if (terminal) {
    terminal.innerHTML += `<p style="color:#f59e0b; margin-top: 4px;">[CASE LOADED]: ${scenario.name}</p>`;
    terminal.scrollTop = terminal.scrollHeight; // Auto-scroll terminal
  }

  // Enable Human-in-the-Loop Action Button
  const authBtn = document.getElementById('auth-btn');
  if (authBtn) authBtn.disabled = false;
}

/**
 * Loads scenario data from json or uses fallback data
 */
async function loadDashboardData() {
  const container = document.getElementById('case-list-container');
  if (!container) return;

  try {
    const response = await fetch('data/scenarios.json');
    activeScenarios = await response.json();
  } catch (error) {
    console.warn("Could not load scenarios.json, utilizing fallback data.", error);
    // Fallback dataset if scenarios.json is empty or missing
    activeScenarios = [
      {
        id: "case-01",
        name: "Balkhu River Flash Flood",
        hazardTag: "Rushing water detected",
        stressIndex: 85
      },
      {
        id: "case-02",
        name: "Sindhupalchok Landslide",
        hazardTag: "Debris flow hazard",
        stressIndex: 65
      }
    ];
  }

  // Clear existing buttons/loading text
  container.innerHTML = '';

  // Generate clickable case buttons for Panel A
  activeScenarios.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'case-btn';
    btn.innerText = item.name;
    btn.onclick = () => selectScenarioData(item);
    container.appendChild(btn);
  });
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
});