// COMMANDER BOT — Command Arbitration Agent
// Job: watch Triage + Logistics, resolve disagreement, produce final one-click payload.

function commanderResolve(triageResult, logisticsResult, scenario) {
  let finalPlan;

  if (logisticsResult.canProceed) {
    finalPlan = `APPROVED PLAN: ${triageResult.proposal}`;
  } else {
    // Simulate the "debate" resolving into a safe compromise
    finalPlan = `REVISED PLAN: Reroute via alternate asset for ${scenario.name}. ` +
                `Original route rejected due to: ${scenario.logisticsRisk}`;
  }

  return {
    agent: "Commander",
    finalPlan
  };
}
