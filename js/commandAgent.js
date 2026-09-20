// COMMAND & PRIORITIZATION AGENT — third seat in the Agentic Command Core.
// Job: watch Needs & Impact vs. Resource & Logistics, resolve any conflict
// between urgency and scarcity, and emit one structured dispatch plan a
// human commander can approve, hold, or deny in one click.
// This replaces the old Commander Bot.

function commandResolve(scenario, needs, resources, depots) {
  const scenarioName = scenario.name || "the incident site";
  const urgent = needs.panicRating >= 90 || needs.lifeThreat === "CRITICAL";
  const canOverride = urgent && scenario.assetSurvivable === true;

  let decision;
  let finalPlan;
  const finalAssetType = resources.recommendedAssetType || scenario.assetType;

  if (resources.fullyFeasible) {
    decision = "APPROVED";
    finalPlan = `APPROVED: ${needs.narrative.replace(/^[A-Z]+(?:\s+threat)?:\s*/i, "").replace(/\s*immediately\.?$/i, "").trim()}.`;
  } else if (resources.delayed && !canOverride) {
    decision = "STANDBY";
    finalPlan = `STANDBY: hold on ${scenarioName} — ${resources.constraint || "access constraint"} — reassess in ~${resources.counterProposal?.etaDelayMinutes ?? 20} min.`;
  } else if (canOverride) {
    decision = "OVERRIDE";
    finalPlan = `OVERRIDE: proceeding on ${scenarioName} despite ${resources.constraint || "the flagged constraint"} — life threat ${needs.lifeThreat}, panic ${needs.panicRating}.`;
  } else {
    decision = "APPROVED WITH MODIFICATIONS";
    const mod = resources.counterProposal?.summary || "reduced allocation";
    finalPlan = `APPROVED WITH MODIFICATIONS: ${scenarioName} — ${mod}.`;
  }

  if (typeof needs.confidence === "number" && needs.confidence < 50) {
    finalPlan = `Low confidence read (unclear field signal) — proceeding with caution: ${finalPlan}`;
  }

  const dispatchPlan = buildDispatchPlan(scenario, needs, resources, decision, finalAssetType, depots);

  return {
    agent: "Command & Prioritization",
    scenarioId: scenario.id,
    decision,
    finalPlan,
    finalAssetType,
    dispatchPlan
  };
}

function buildDispatchPlan(scenario, needs, resources, decision, finalAssetType, depots) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const dispatchId = `DISPATCH-${datePart}-${String(scenario.id).toUpperCase()}`;

  const transitMinutesByAsset = { air: 18, drone: 8, boat: 22, ground: 35 };
  const baseTransit = transitMinutesByAsset[finalAssetType] || 30;
  const delayPenalty = resources.delayed ? (resources.counterProposal?.etaDelayMinutes || 20) : 0;
  const nearestDepot = findNearestDepot(scenario, depots);

  return {
    dispatch_plan_id: dispatchId,
    timestamp_utc: now.toISOString(),
    target_sector: {
      zone_name: scenario.name,
      coordinates: typeof scenario.lat === "number" ? [scenario.lat, scenario.lon] : [scenario.mapX, scenario.mapY],
      threat_level: needs.lifeThreat
    },
    cascade_risk_profile: {
      primary_event: scenario.hazardTag,
      secondary_threat: needs.cascadeProbability >= 0.35 ? needs.cascadeNote : "None identified",
      time_to_secondary_impact_hrs: needs.cascadeProbability >= 0.6 ? 6 : needs.cascadeProbability >= 0.35 ? 24 : null
    },
    allocations: resources.allocations.map((a) => ({
      resource_type: a.type,
      quantity: a.granted,
      source_depot_id: nearestDepot ? nearestDepot.id : "DEPOT-KTM-01",
      unit_status: a.sourceStatus
    })),
    transit_route: {
      primary_corridor: scenario.logisticsRisk || "Route to be confirmed on approach",
      status: resources.delayed ? "CONSTRAINED" : "OPEN",
      estimated_transit_time_minutes: baseTransit + delayPenalty,
      fallback_corridor: resources.counterProposal?.suggestedAssetType
        ? `${resources.counterProposal.suggestedAssetType.toUpperCase()} substitution route`
        : "None required"
    },
    risk_assessment: {
      logistical_risk: resources.constraint || "No binding constraint identified",
      execution_confidence: Math.round(resources.accessFeasibilityIndex * 100),
      human_impact_prediction: `${needs.populationAtRisk} at risk; priority score ${needs.priorityScore}`
    },
    human_approval_gate: {
      status: "PENDING_COMMANDER_SIGN_OFF",
      commanding_officer_id: null,
      authorization_timestamp: null
    }
  };
}

// Straight-line nearest-depot pick (Nepal's small extent makes a flat
// lat/lon distance close enough for this — no need for great-circle math).
function findNearestDepot(scenario, depots) {
  if (!Array.isArray(depots) || !depots.length || typeof scenario.lat !== "number") return null;
  let closest = null;
  let closestDist = Infinity;
  depots.forEach((depot) => {
    const dLat = depot.lat - scenario.lat;
    const dLon = depot.lon - scenario.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < closestDist) {
      closestDist = dist;
      closest = depot;
    }
  });
  return closest;
}

// Called from main.js once a human clicks Approve/Deny/Hold, so the
// dispatch plan's JSON reflects the actual human-in-the-loop decision
// rather than staying stuck at PENDING forever.
function signDispatchPlan(dispatchPlan, status, officerId = "OPERATOR-01") {
  if (!dispatchPlan) return;
  dispatchPlan.human_approval_gate.status = status;
  dispatchPlan.human_approval_gate.commanding_officer_id = status === "PENDING_COMMANDER_SIGN_OFF" ? null : officerId;
  dispatchPlan.human_approval_gate.authorization_timestamp = status === "PENDING_COMMANDER_SIGN_OFF" ? null : new Date().toISOString();
}

// Runs the full three-agent pipeline once, in order: Needs & Impact scores
// the incident -> Resource & Logistics checks it against the live depot ->
// Command & Prioritization reconciles the two into one dispatch plan. Pure
// (no inventory mutation) so it is safe to call on every case selection;
// main.js only commits allocations against the real inventory on Approve.
function runAgenticCommandCore(scenario, inventory, depots) {
  const needs = needsImpactAssess(scenario);
  const resources = resourceLogisticsCheck(scenario, needs, inventory || []);
  const command = commandResolve(scenario, needs, resources, depots || []);
  return { needs, resources, command };
}
