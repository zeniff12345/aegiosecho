// COMMANDER BOT — Command Arbitration Agent
// Job: watch Triage + Logistics, resolve disagreement, produce final one-click payload.

function commanderResolve(triageResult, logisticsResult, scenario) {
  const scenarioName = scenario.name || "the incident site";
  const proposal = triageResult.proposal || "Deploy the proposed rescue asset";
  const objection = typeof logisticsResult.objection === "string"
    ? logisticsResult.objection.trim()
    : "";
  const objectionText = objection.replace(/^Objection:\s*/i, "").trim();
  const recommendationMarker = /\bRecommend(?:s|ed)?\s+/i;
  const recommendation = objectionText.match(recommendationMarker);
  let alternative = recommendation
    ? objectionText.slice(recommendation.index + recommendation[0].length).replace(/[.!?]+$/, "").trim()
    : "";
  alternative = alternative
    .replace(/\s+once clearance is confirmed$/i, "")
    .replace(/\s+instead$/i, "")
    .trim();
  const reason = recommendation
    ? objectionText.slice(0, recommendation.index).trim().replace(/[.!?]+$/, "").trim()
    : (logisticsResult.risk || scenario.logisticsRisk || "logistics constraints");
  const status = String(logisticsResult.status || "").toUpperCase();
  const finalAssetType = resolveAssetType(alternative, scenario.assetType);

  let finalPlan;
  if (status === "DELAYED") {
    const deployment = alternative || proposal.replace(/\s*immediately\.?$/i, "").trim();
    finalPlan = `STANDBY: ${deployment} for ${scenarioName} once logistics clearance is confirmed.`;
  } else if (objection) {
    finalPlan = `APPROVED: ${alternative || "the Logistics recommendation"} for ${scenarioName} — ${reason}.`;
  } else {
    finalPlan = `APPROVED: ${proposal.replace(/\s*immediately\.?$/i, "").trim()}.`;
  }

  if (typeof triageResult.confidence === "number" && triageResult.confidence < 50) {
    finalPlan = `Low confidence read (unclear transcript) — proceeding with caution: ${finalPlan}`;
  }

  return {
    agent: "Commander",
    finalPlan,
    finalAssetType
  };
}

function resolveAssetType(recommendedAsset, fallbackAsset) {
  const asset = String(recommendedAsset || "").toLowerCase();
  if (asset.includes("air")) return "air";
  if (asset.includes("drone")) return "drone";
  if (asset.includes("ground")) return "ground";
  return String(fallbackAsset || "ground").toLowerCase();
}
