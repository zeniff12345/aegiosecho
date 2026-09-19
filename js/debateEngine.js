/**
 * js/debateEngine.js
 * Multi-Agent Consensus Engine for Panel C.
 * Simulates real-time agent dialogue using accessible AI role names.
 */

function runDebate(scenario) {
  const terminal = document.getElementById('terminal-stream');
  const authBtn = document.getElementById('auth-btn');

  if (!terminal) return;

  // Clear terminal and log selected scenario
  terminal.innerHTML = `<p style="color:#f59e0b;">[INCIDENT LOADED]: ${scenario.name}</p>`;
  
  if (authBtn) {
    authBtn.disabled = true;
    authBtn.innerText = "AGENT CONSENSUS IN PROGRESS...";
    authBtn.style.backgroundColor = "#374151";
  }

  // Simplified AI Agent Dialogue Array
  const debateSteps = [
    {
      agent: "TRIAGE AI",
      color: "#38bdf8", // Sky blue
      text: `Caller stress at ${scenario.stressIndex || 75}%. Acoustic hazard: "${scenario.hazardTag || 'Emergency'}" detected. High priority.`
    },
    {
      agent: "LOGISTICS AI",
      color: "#f43f5e", // Rose red
      text: `Ground route blocked near grid [${scenario.mapX || 50}, ${scenario.mapY || 50}]. Rerouting via safe aerial vector.`
    },
    {
      agent: "COMMANDER AI",
      color: "#10b981", // Emerald green
      text: `Consensus verified. AIR-RESCUE-01 & SWIFTWATER-TEAM dispatched under offline edge protocol.`
    }
  ];

  // Stream dialogue lines with delayed typing effect
  debateSteps.forEach((step, index) => {
    setTimeout(() => {
      const line = document.createElement('p');
      line.style.margin = "6px 0";
      line.innerHTML = `<span style="color:${step.color}; font-weight:bold;">[${step.agent}]:</span> ${step.text}`;
      terminal.appendChild(line);
      terminal.scrollTop = terminal.scrollHeight;

      // Unlock authorization button after Commander AI finishes
      if (index === debateSteps.length - 1 && authBtn) {
        authBtn.disabled = false;
        authBtn.innerText = "AUTHORIZE SPECIFIC CRITICAL SWARM ACTIONS";
        authBtn.style.backgroundColor = "var(--crimson)";
      }
    }, (index + 1) * 900); // 900ms delay between agent responses
  });
}