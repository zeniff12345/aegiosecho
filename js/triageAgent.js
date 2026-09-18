// TRIAGE BOT — Semantic Triage Node
// Job: read a scenario's transcript/audio data and produce a threat assessment.
// This is intentionally simple rule-based logic for the demo — no real ML needed.

function triageAssess(scenario) {
  const panicRating = scenario.stressIndex; // 0-100
  let lifeThreat = "LOW";
  if (panicRating > 85) lifeThreat = "CRITICAL";
  else if (panicRating > 60) lifeThreat = "HIGH";
  else if (panicRating > 30) lifeThreat = "MODERATE";

  const transcript = String(scenario.transcript || "").toLowerCase();
  const clarityKeywords = [
    "trapped", "rising", "collapsed", "collapse", "cracking", "fire",
    "smoke", "buried", "stranded", "stuck", "elderly", "children",
    "explosion", "gas", "aftershock", "swept", "under debris"
  ];
  const matchedKeywords = clarityKeywords.filter(keyword => transcript.includes(keyword)).length;
  const confidence = Math.min(100, 35 + matchedKeywords * 10);
  const location = scenario.name || "the incident site";
  const hazard = scenario.hazardTag || "active hazard";
  const assetNames = {
    ground: "ground team",
    drone: "drone unit",
    air: "air unit"
  };
  const asset = assetNames[scenario.assetType] || `${scenario.assetType || "rescue"} asset`;

  let proposal;
  if (lifeThreat === "CRITICAL") {
    proposal = `CRITICAL: ${hazard} at ${location} — deploy the ${asset} now.`;
  } else if (lifeThreat === "HIGH") {
    proposal = `HIGH threat: ${hazard}. Dispatch the ${asset} to ${location} immediately.`;
  } else if (lifeThreat === "MODERATE") {
    proposal = `MODERATE threat: ${hazard}. Prepare the ${asset} for ${location} and confirm access.`;
  } else {
    proposal = `LOW threat: ${hazard}. Stage the ${asset} at ${location} for a controlled response.`;
  }

  return {
    agent: "Triage",
    panicRating,
    lifeThreat,
    hazardTag: scenario.hazardTag,
    proposal,
    confidence
  };
}

