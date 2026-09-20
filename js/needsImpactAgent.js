// NEEDS & IMPACT AGENT — first seat in the Agentic Command Core.
// Job: turn a raw field signal into a scored, comparable demand for help —
// not just "how bad is this," but "how bad, how many people, how likely is
// this to get worse, and what would it take to actually respond."
// This replaces the old Triage Bot. Same rule-based approach (no ML needed
// for the demo), extended with the cascade-aware priority score from
// disaster_cascade_dispatch_command_system_architecture.md.

// Cascade amplification coefficient (beta >= 1.0 per the architecture spec).
// Higher = a likely secondary hazard (aftershock, second landslide wave,
// dam/hydropower failure, reopened river blockage) weighs more heavily than
// the primary event alone.
const CASCADE_BETA = 1.4;

// Relative weight of "how likely is someone to die right now" vs.
// "how severe/hazardous is the physical situation itself" in the base
// severity score, before the cascade multiplier is applied.
const SEVERITY_WEIGHTS = { life: 0.65, exposure: 0.35 };

function needsImpactAssess(scenario) {
  const panicRating = Number(scenario.stressIndex) || 0; // 0-100
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
  const matchedKeywords = clarityKeywords.filter((keyword) => transcript.includes(keyword));
  const confidence = Math.min(100, 35 + matchedKeywords.length * 10);

  const location = scenario.name || "the incident site";
  const hazard = scenario.hazardTag || "active hazard";
  const assetNames = { ground: "ground team", drone: "drone unit", air: "air unit", boat: "swift-water boat crew" };
  const asset = assetNames[scenario.assetType] || `${scenario.assetType || "rescue"} asset`;

  let narrative;
  if (lifeThreat === "CRITICAL") {
    narrative = `CRITICAL: ${hazard} at ${location} — deploy the ${asset} now.`;
  } else if (lifeThreat === "HIGH") {
    narrative = `HIGH threat: ${hazard}. Dispatch the ${asset} to ${location} immediately.`;
  } else if (lifeThreat === "MODERATE") {
    narrative = `MODERATE threat: ${hazard}. Prepare the ${asset} for ${location} and confirm access.`;
  } else {
    narrative = `LOW threat: ${hazard}. Stage the ${asset} at ${location} for a controlled response.`;
  }

  const populationAtRisk = estimatePopulationAtRisk(scenario);
  const cascadeProbability = estimateCascadeProbability(scenario);
  const accessFeasibilityEstimate = estimateAccessFeasibility(scenario); // this agent's own rough read; Resource & Logistics computes the authoritative one
  const severityScore = Math.round(
    SEVERITY_WEIGHTS.life * lifeThreatToSeverity(lifeThreat) +
    SEVERITY_WEIGHTS.exposure * Math.min(100, matchedKeywords.length * 16)
  );
  const priorityScore = Math.round(
    (severityScore * (1 + CASCADE_BETA * cascadeProbability) * populationAtRisk) /
    accessFeasibilityEstimate
  );

  const demand = deriveResourceDemand(scenario, lifeThreat, matchedKeywords);
  if (populationAtRisk >= 25) demand.push({ type: "field_hospitals", quantity: 1, reason: "mass-casualty scale incident" });
  const cascadeNote = describeCascadeRisk(scenario, cascadeProbability);

  return {
    agent: "Needs & Impact",
    scenarioId: scenario.id,
    panicRating,
    lifeThreat,
    hazardTag: scenario.hazardTag,
    confidence,
    populationAtRisk,
    cascadeProbability,
    accessFeasibilityEstimate,
    severityScore,
    priorityScore,
    demand,
    narrative,
    cascadeNote,
    // kept for any older code path that still reads .proposal
    proposal: narrative
  };
}

function lifeThreatToSeverity(lifeThreat) {
  return { CRITICAL: 100, HIGH: 75, MODERATE: 45, LOW: 20 }[lifeThreat] ?? 20;
}

// Village/site-level headcount at risk, read from the scenario's own field
// data when present. This stands in for the architecture doc's
// "PopulationDensity" term at incident scale rather than true census density
// — for a single flooded guesthouse or trekking group, a headcount is the
// honest number; a density figure would just be a made-up-looking decimal.
function estimatePopulationAtRisk(scenario) {
  if (typeof scenario.populationAtRisk === "number") return Math.max(1, scenario.populationAtRisk);
  const transcript = String(scenario.transcript || "");
  const numberWord = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const digitMatch = transcript.match(/\b(\d{1,4})\s+(people|villagers|passengers|workers|residents|trekkers)\b/i);
  if (digitMatch) return Number(digitMatch[1]);
  const wordMatch = transcript.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(of us|people)\b/);
  if (wordMatch) return numberWord[wordMatch[1]] || 3;
  if (/\bvillage\b/i.test(transcript) || /village/i.test(scenario.hazardTag || "")) return 40;
  if (/\bschool\b/i.test(transcript) || /\bkids\b|\bchildren\b/i.test(transcript)) return 25;
  if (/\bfamily\b/i.test(transcript)) return 4;
  if (/\bgroup\b/i.test(transcript)) return 8;
  return 5; // conservative single-household default
}

// Rough 0-1 estimate of whether this event is likely to trigger, or is
// already part of, a secondary hazard (reopened landslide, aftershock,
// dam/hydropower failure, river blockage bursting) — grounded in the same
// five-link cascade chain documented in RASUWA_CASCADE_ANALYSIS.md
// (Source -> Mobilization -> River -> Infra -> Human/Logistics).
function estimateCascadeProbability(scenario) {
  if (typeof scenario.cascadeProbability === "number") return clamp01(scenario.cascadeProbability);
  const text = `${scenario.hazardTag || ""} ${scenario.transcript || ""} ${scenario.logisticsRisk || ""}`.toLowerCase();
  let score = 0.15; // baseline: most incidents are isolated
  const signals = [
    [/aftershock/, 0.35],
    [/landslide-prone|unstable slop|active slid|slope movement|slope check/, 0.3],
    [/glacier|avalanche/, 0.3],
    [/hydropower|dam|intake structure/, 0.25],
    [/bridge (collapse|gone|washed out|washout)/, 0.25],
    [/river surge|riverbank|confluence|gorge/, 0.2],
    [/combined flood and slope|flood-slope|undercut the hillside/, 0.4]
  ];
  signals.forEach(([pattern, weight]) => {
    if (pattern.test(text)) score += weight;
  });
  return clamp01(score);
}

// This agent's own quick read of "can help physically get there," used only
// for this agent's priority math. Resource & Logistics builds the fuller,
// authoritative feasibility matrix (roads/bridges/terrain/weather/river/
// comms) that the dispatch decision actually relies on — the two are
// expected to sometimes disagree, which is what the adversarial debate is for.
function estimateAccessFeasibility(scenario) {
  const risk = String(scenario.logisticsRisk || "").toLowerCase();
  let index = 0.85;
  const penalties = [
    [/blocked|washout|washed out|gone|collapsed|no bridge/, 0.45],
    [/steep|foot team only|terrain too steep/, 0.2],
    [/wind|marginal weather|visibility|closing weather|heavy rain/, 0.25],
    [/current too strong|strong current|river/, 0.2],
    [/delay|clearance|pending|wait/, 0.15],
    [/narrow|alternate road/, 0.1]
  ];
  penalties.forEach(([pattern, penalty]) => {
    if (pattern.test(risk)) index -= penalty;
  });
  return Math.max(0.1, Math.min(1, Number(index.toFixed(2))));
}

function describeCascadeRisk(scenario, cascadeProbability) {
  if (cascadeProbability >= 0.6) {
    return `High cascade risk (${Math.round(cascadeProbability * 100)}%) — this site sits on an active chain (source hazard -> mobilization -> downstream infrastructure) and could escalate within hours.`;
  }
  if (cascadeProbability >= 0.35) {
    return `Moderate cascade risk (${Math.round(cascadeProbability * 100)}%) — a secondary hazard (aftershock, slope reactivation, or downstream surge) is plausible; re-check before stand-down.`;
  }
  return `Low cascade risk (${Math.round(cascadeProbability * 100)}%) — event appears contained to this site for now.`;
}

// Translates the situation into a concrete resource ask, in the same
// vocabulary as the Resource & Logistics Agent's inventory (data/resources.json):
// trauma_kits, food, water, tents, fuel, ambulances, boats, drones,
// helicopters, field_hospitals, sar_teams, engineers, volunteers.
function deriveResourceDemand(scenario, lifeThreat, matchedKeywords) {
  const text = `${scenario.hazardTag || ""} ${scenario.transcript || ""}`.toLowerCase();
  const demand = [];
  const add = (type, quantity, reason) => {
    const existing = demand.find((d) => d.type === type);
    if (existing) { existing.quantity += quantity; return; }
    demand.push({ type, quantity, reason });
  };

  const primaryByAsset = {
    air: () => add("helicopters", 1, "primary extraction asset for this site"),
    drone: () => add("drones", lifeThreat === "CRITICAL" ? 2 : 1, "aerial recon / access assessment"),
    ground: () => add("sar_teams", 1, "ground search-and-rescue team"),
    boat: () => add("boats", lifeThreat === "CRITICAL" ? 2 : 1, "swift-water rescue")
  };
  (primaryByAsset[scenario.assetType] || primaryByAsset.ground)();

  if (/elderly|medical emergency|collapsed from/.test(text)) add("ambulances", 1, "medical evacuation");
  if (/trapped|buried|collapse|collapsed|debris/.test(text)) { add("sar_teams", 1, "search-and-rescue support"); add("engineers", 1, "structural clearance before entry"); }
  if (/aftershock|structural cracking|unstable/.test(text)) add("engineers", 1, "structural safety assessment");
  if (/gas|explosion|chemical|hazmat/.test(text)) add("engineers", 1, "hazmat / clearance before entry");
  if (/fire|smoke/.test(text)) add("water", 2, "fire suppression / cooling");
  if (/hypothermia|snow|avalanche|cold/.test(text)) { add("tents", 2, "emergency shelter"); add("trauma_kits", 1, "hypothermia / injury care"); }
  if (/stranded|isolated|cut off|no bridge access|no shelter/.test(text)) { add("food", 2, "sustainment pending extraction"); add("water", 2, "sustainment pending extraction"); add("tents", 1, "temporary shelter"); }
  if (matchedKeywords.length) add("trauma_kits", 1, "field medical care");
  add("fuel", 1, "transport / generator support");
  add("volunteers", lifeThreat === "CRITICAL" || lifeThreat === "HIGH" ? 3 : 2, "local coordination and logistics support");

  return demand;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
