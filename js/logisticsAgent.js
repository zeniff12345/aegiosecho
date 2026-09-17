// LOGISTICS BOT — Kinematic Logistics Router
// Job: check whether the proposed rescue action is physically/safely possible.

function logisticsCheck(scenario) {
  const canProceed = scenario.assetSurvivable;

  return {
    agent: "Logistics",
    canProceed,
    risk: scenario.logisticsRisk,
    objection: canProceed
      ? null
      : `Objection: ${scenario.logisticsRisk} Recommend alternate route/asset.`
  };
}
