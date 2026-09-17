// TRIAGE BOT — Semantic Triage Node
// Job: read a scenario's transcript/audio data and produce a threat assessment.
// This is intentionally simple rule-based logic for the demo — no real ML needed.

function triageAssess(scenario) {
  // In a real system this would call an NLP model. For the demo, we derive
  // a "panic rating" and "life threat classification" from the mock data fields.
  const panicRating = scenario.stressIndex; // 0-100
  let lifeThreat = "LOW";
  if (panicRating > 85) lifeThreat = "CRITICAL";
  else if (panicRating > 60) lifeThreat = "HIGH";

  return {
    agent: "Triage",
    panicRating,
    lifeThreat,
    hazardTag: scenario.hazardTag,
    proposal: `Deploy nearest rescue asset to ${scenario.name} immediately. Life threat: ${lifeThreat}.`
  };
}
