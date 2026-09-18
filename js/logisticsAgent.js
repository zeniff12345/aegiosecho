// LOGISTICS BOT — Kinematic Logistics Router
// Job: check whether the proposed rescue action is physically/safely possible.

function logisticsCheck(scenario) {
  const risk = String(scenario.logisticsRisk || "Unspecified logistics constraint");
  const riskSummary = risk.replace(/[.!?]+$/, "").trim();
  const assetType = String(scenario.assetType || "ground").toLowerCase();
  const delayed = /\b(delay|delayed|wait|clearance|marginal|pending|until|closing fast)\b/i.test(risk);
  const canProceed = Boolean(scenario.assetSurvivable) && !delayed;

  let alternative = "ground team";
  if (assetType === "ground") {
    alternative = /\b(water|flood|river|current|bridge)\b/i.test(risk)
      ? "air unit"
      : "drone unit";
  } else if (assetType === "drone") {
    alternative = "ground team";
  }

  let objection = null;
  if (!canProceed) {
    const restrictionByType = {
      drone: "Drone operation restricted by wind/visibility",
      ground: "Ground access restricted by terrain/roads",
      air: "Air operation restricted by weather ceiling, landing-zone clearance, or fuel range"
    };
    const restriction = restrictionByType[assetType] || "Rescue asset restricted by access conditions";
    objection = delayed
      ? `Delayed: ${restriction}: ${riskSummary}. Recommend ${alternative} once clearance is confirmed.`
      : `Objection: ${restriction}: ${riskSummary}. Recommend ${alternative} instead.`;
  }

  const result = {
    agent: "Logistics",
    canProceed,
    risk,
    objection
  };

  if (delayed) result.status = "DELAYED";
  return result;
}
