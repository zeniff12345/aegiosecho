// RESOURCE & LOGISTICS AGENT — second seat in the Agentic Command Core.
// Job: take the Needs & Impact Agent's demand, check it against what is
// actually left in the depot right now, work out whether the terrain/
// weather/route actually allows delivery, and issue either a confirmation
// or a CHALLENGE with a concrete counter-proposal.
// This replaces the old Logistics Bot. Adds a live inventory engine and a
// feasibility/access matrix, per disaster_cascade_dispatch_command_system_architecture.md.

// How the five access factors are weighted into one AccessFeasibilityIndex
// (0.1 worst - 1.0 best), matching the architecture doc's feasibility matrix.
const FEASIBILITY_WEIGHTS = { road: 0.3, terrain: 0.2, weather: 0.25, river: 0.15, comms: 0.1 };

// Below this, the agent will not sign off on immediate departure — it issues
// a DELAYED/STANDBY counter-proposal instead of an outright rejection.
const FEASIBILITY_DELAY_THRESHOLD = 0.4;

function buildFeasibilityMatrix(scenario) {
  const risk = String(scenario.logisticsRisk || "").toLowerCase();
  const factors = { road: 1, terrain: 1, weather: 1, river: 1, comms: 0.85 };

  if (/blocked|washout|washed out|road is (gone|completely blocked)|no bridge|bridge (gone|collapse)/.test(risk)) factors.road = 0.2;
  else if (/partially collapsed|narrow alley|narrow|alternate road/.test(risk)) factors.road = 0.55;

  if (/terrain too steep|foot team only|steep hillside|steep/.test(risk)) factors.terrain = 0.4;

  if (/closing weather|narrowing.*window|marginal weather/.test(risk)) factors.weather = 0.3;
  else if (/wind|visibility|heavy rain|spray/.test(risk)) factors.weather = 0.55;

  if (/extreme current|current too strong|strong current/.test(risk)) factors.river = 0.25;
  else if (/river|surge|flood/.test(risk)) factors.river = 0.55;

  // No live comms-blackout data source yet (see the field-blackout-zone idea
  // in CASCADE_PROJECT_BRIEF.md) — comms stays at its baseline until that
  // feed exists, rather than guessing from unrelated keywords.

  const index = Object.entries(FEASIBILITY_WEIGHTS)
    .reduce((sum, [key, weight]) => sum + factors[key] * weight, 0);

  return { factors, accessFeasibilityIndex: Math.max(0.1, Math.min(1, Number(index.toFixed(2)))) };
}

// Reads current stock for a resource type. `inventory` is the array loaded
// from data/resources.json (see renderResourceInventory() in main.js for how
// the numbers reach the UI).
function findResource(inventory, type) {
  return inventory.find((item) => item.id === type) || null;
}

const SUBSTITUTES = {
  helicopters: ["drones", "boats"],
  boats: ["helicopters", "sar_teams"],
  drones: ["helicopters"],
  ambulances: ["sar_teams"],
  sar_teams: ["volunteers"]
};

function resourceLogisticsCheck(scenario, needs, inventory) {
  const demand = (needs && needs.demand) || [];
  const { factors, accessFeasibilityIndex: computedIndex } = buildFeasibilityMatrix(scenario);
  // scenario.assetSurvivable is the scenario author's own ground-truth call on
  // whether the primary asset can safely reach this site — it's an authoritative
  // signal the feasibility matrix's text-derived factors shouldn't be allowed to
  // override, so a survivability flag of false always caps the index below the
  // delay threshold even if the logisticsRisk text alone reads as mild.
  const accessFeasibilityIndex = scenario.assetSurvivable === false
    ? Math.min(computedIndex, 0.32)
    : computedIndex;

  const allocations = demand.map((item) => {
    const stock = findResource(inventory, item.type);
    const available = stock ? stock.available : 0;
    const granted = Math.max(0, Math.min(item.quantity, available));
    let sourceStatus = "AVAILABLE";
    let substitution = null;

    if (!stock) {
      sourceStatus = "UNAVAILABLE";
    } else if (available <= 0) {
      sourceStatus = "UNAVAILABLE";
      const substituteType = (SUBSTITUTES[item.type] || []).find((candidate) => {
        const candidateStock = findResource(inventory, candidate);
        return candidateStock && candidateStock.available > 0;
      });
      if (substituteType) substitution = substituteType;
    } else if (granted < item.quantity || available <= stock.lowThreshold) {
      sourceStatus = "LOW";
    }

    return {
      type: item.type,
      label: stock ? stock.label : item.type,
      requested: item.quantity,
      granted,
      sourceStatus,
      substitution,
      reason: item.reason
    };
  });

  const shortfalls = allocations.filter((a) => a.granted < a.requested);
  const delayed = accessFeasibilityIndex < FEASIBILITY_DELAY_THRESHOLD;
  const fullyFeasible = shortfalls.length === 0 && !delayed;

  const bindingFactor = Object.entries(factors).sort((a, b) => a[1] - b[1])[0];
  const factorLabels = {
    road: "road/bridge access", terrain: "terrain", weather: "weather ceiling",
    river: "river/current conditions", comms: "communications coverage"
  };
  const constraint = bindingFactor && bindingFactor[1] < 0.75
    ? `${factorLabels[bindingFactor[0]]} at ${Math.round(bindingFactor[1] * 100)}% feasibility`
    : null;

  let counterProposal = null;
  if (!fullyFeasible) {
    const pieces = [];
    if (delayed) {
      pieces.push(`hold immediate departure — access feasibility is ${Math.round(accessFeasibilityIndex * 100)}%, below the safe-launch threshold`);
    }
    shortfalls.forEach((a) => {
      if (a.substitution) {
        pieces.push(`substitute ${a.requested - a.granted} ${a.label} with ${a.substitution.replace(/_/g, " ")} (depot short)`);
      } else if (a.granted === 0) {
        pieces.push(`${a.label} unavailable at nearest depot — request from regional reserve`);
      } else {
        pieces.push(`only ${a.granted}/${a.requested} ${a.label} available — partial allocation`);
      }
    });
    counterProposal = {
      summary: pieces.join("; "),
      suggestedAssetType: resolveSubstituteAssetType(scenario, allocations),
      etaDelayMinutes: delayed ? 20 : 10
    };
  }

  return {
    agent: "Resource & Logistics",
    scenarioId: scenario.id,
    accessFeasibilityIndex,
    feasibilityFactors: factors,
    allocations,
    fullyFeasible,
    delayed,
    constraint,
    counterProposal,
    recommendedAssetType: counterProposal ? counterProposal.suggestedAssetType : scenario.assetType
  };
}

function resolveSubstituteAssetType(scenario, allocations) {
  const primary = allocations[0];
  if (primary && primary.substitution) {
    const map = { drones: "drone", boats: "boat", helicopters: "air", sar_teams: "ground" };
    return map[primary.substitution] || scenario.assetType;
  }
  return scenario.assetType;
}

// Commits an approved dispatch's allocations against the shared inventory:
// moves each granted unit from Available into Deployed. Called once, from
// the approve-btn handler in main.js, so re-rendering a scenario never
// double-spends the depot.
function applyAllocations(inventory, allocations) {
  allocations.forEach((allocation) => {
    if (allocation.granted <= 0) return;
    const stock = findResource(inventory, allocation.type);
    if (!stock) return;
    const move = Math.min(allocation.granted, stock.available);
    stock.available -= move;
    stock.deployed += move;
  });
}

// Returns a dispatched allocation's units to Available — used when a
// previously-approved case is walked back (deny/hold after approve isn't
// exposed in the UI today, but this keeps the inventory model honest if
// that's ever wired up).
function releaseAllocations(inventory, allocations) {
  allocations.forEach((allocation) => {
    if (allocation.granted <= 0) return;
    const stock = findResource(inventory, allocation.type);
    if (!stock) return;
    const move = Math.min(allocation.granted, stock.deployed);
    stock.deployed -= move;
    stock.available += move;
  });
}
