// MAP ENGINE — Panel B logic.
// Renders a pulsing hazard ring at the active scenario's location,
// and animates the rescue asset marker moving to it once approved.

function renderHazardRing(scenario) {
  const container = document.getElementById("hazard-markers");
  container.innerHTML = "";

  const ring = document.createElement("div");
  ring.className = "hazard-ring" + (scenario.stressIndex > 85 ? " critical" : "");
  ring.style.left = scenario.mapX + "%";
  ring.style.top = scenario.mapY + "%";
  container.appendChild(ring);
}

const ASSET_ICONS = {
  ground: "🚶",
  boat: "🚤",
  drone: "🛸",
  air: "🚁"
};

function moveAssetToScenario(scenario) {
  const asset = document.getElementById("asset-marker");
  asset.textContent = ASSET_ICONS[scenario.assetType] || "▲";
  asset.style.left = scenario.mapX + "%";
  asset.style.top = scenario.mapY + "%";
}

function resetAssetPosition() {
  const asset = document.getElementById("asset-marker");
  asset.style.left = "10%";
  asset.style.top = "85%";
}
