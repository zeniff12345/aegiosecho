// MAP ENGINE — Panel B logic.
// Renders tactical hazard markers and animates the rescue asset after approval.

const MAP_ZOOM_STEPS = [1, 1.25, 1.5];
let mapZoomIndex = 0;

function setMapZoom(index) {
  mapZoomIndex = Math.max(0, Math.min(MAP_ZOOM_STEPS.length - 1, index));
  const content = document.querySelector(".map-content");
  if (content) content.style.setProperty("transform", `scale(${MAP_ZOOM_STEPS[mapZoomIndex]})`, "important");
}

function setupMapControls() {
  document.getElementById("map-zoom-in").addEventListener("click", () => setMapZoom(mapZoomIndex + 1));
  document.getElementById("map-zoom-out").addEventListener("click", () => setMapZoom(mapZoomIndex - 1));
  document.getElementById("map-zoom-reset").addEventListener("click", () => setMapZoom(0));

  ["incidents", "routes", "labels", "grid"].forEach((layer) => {
    document.getElementById(`layer-${layer}`).addEventListener("change", (event) => {
      document.querySelector(".map-content").classList.toggle(`hide-${layer}`, !event.target.checked);
    });
  });
  setMapZoom(0);
}

function updateMapInfo(scenario) {
  if (!scenario) return;
  const state = typeof resolvedIds !== "undefined" && resolvedIds.has(scenario.id)
    ? "Authorized"
    : typeof deniedIds !== "undefined" && deniedIds.has(scenario.id)
      ? "Denied"
      : typeof heldIds !== "undefined" && heldIds.has(scenario.id)
        ? "Held"
        : "Awaiting authorization";
  const coordinates = `[${scenario.mapX}, ${scenario.mapY}]`;
  const name = document.getElementById("map-case-name");
  const coordinateLabel = document.getElementById("map-case-coordinates");
  const status = document.getElementById("map-status");
  if (name) name.textContent = scenario.name;
  if (coordinateLabel) coordinateLabel.textContent = coordinates;
  if (status) status.textContent = `${coordinates} · Asset: ${String(scenario.assetType || "unknown").toUpperCase()} · ${state}`;
  renderMapLegend();
}

function renderMapLegend() {
  const legend = document.getElementById("map-legend");
  if (!legend || typeof scenarios === "undefined") return;
  const counts = { ground: 0, drone: 0, air: 0 };
  scenarios.forEach((scenario) => {
    if (counts[scenario.assetType] !== undefined) counts[scenario.assetType]++;
  });
  legend.innerHTML = `
    <span class="unit-key"><i class="unit-swatch drone"></i>DRONE ×${counts.drone}</span>
    <span class="unit-key"><i class="unit-swatch ground"></i>GROUND ×${counts.ground}</span>
    <span class="unit-key"><i class="unit-swatch air"></i>AIR ×${counts.air}</span>
    <span class="hazard-key"><i></i>HAZARD ZONE</span>`;
}

function renderHazardRing(scenario) {
  const container = document.getElementById("hazard-markers");
  const map = document.getElementById("map-area");
  container.innerHTML = "";
  const emptyState = document.querySelector(".map-empty-state");
  if (emptyState) emptyState.hidden = true;
  updateMapInfo(scenario);

  const incidents = typeof scenarios !== "undefined" && scenarios.length
    ? scenarios
    : [scenario];

  incidents.forEach((incident) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "hazard-marker" + (incident.id === scenario.id ? " active" : "");
    marker.style.left = incident.mapX + "%";
    marker.style.top = incident.mapY + "%";
    marker.setAttribute("aria-label", incident.name);

    const ring = document.createElement("span");
    ring.className = "hazard-ring" + (incident.stressIndex >= 85 ? " critical" : "");
    ring.setAttribute("aria-hidden", "true");
    marker.appendChild(ring);

    const core = document.createElement("span");
    core.className = "hazard-core";
    core.setAttribute("aria-hidden", "true");
    marker.appendChild(core);

    const tooltip = document.createElement("span");
    tooltip.className = "map-tooltip";
    tooltip.hidden = true;
    tooltip.innerHTML = `<strong>${incident.name}</strong><span>${incident.hazardTag}</span><span>Stress index: ${incident.stressIndex}</span>`;
    marker.appendChild(tooltip);

    marker.addEventListener("mouseenter", () => {
      tooltip.hidden = false;
    });
    marker.addEventListener("mousemove", (event) => {
      const bounds = map.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - bounds.left + 14}px`;
      tooltip.style.top = `${event.clientY - bounds.top + 14}px`;
    });
    marker.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });
    marker.addEventListener("click", () => {
      if (typeof selectScenario === "function") selectScenario(incident.id);
    });

    container.appendChild(marker);
  });

  map.style.setProperty("--map-pan-x", `${(50 - scenario.mapX) * 0.08}%`);
  map.style.setProperty("--map-pan-y", `${(50 - scenario.mapY) * 0.08}%`);
}

const ASSET_ICONS = {
  ground: '<svg viewBox="0 0 32 24" aria-hidden="true"><path d="M4 15h20l3 4H2l2-4Zm3-5h12l3 5H5l2-5Zm3-5h5l2 5H8l2-5ZM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
  drone: '<svg viewBox="0 0 32 24" aria-hidden="true"><path d="M14 9h4v6h-4zM5 5h5v3H7v3H4V8a3 3 0 0 1 1-3Zm17 0h5a3 3 0 0 1 1 3v3h-3V8h-3V5ZM5 13h3v3h2v3H5a3 3 0 0 1-3-3v-3h3Zm19 0h3v3a3 3 0 0 1-3 3h-5v-3h2v-3h3Z"/></svg>',
  air: '<svg viewBox="0 0 32 24" aria-hidden="true"><path d="m15 3 2 1v6l8 3v2h-8v4l3 2v1H12v-1l3-2v-4H7v-2l8-3V4l2-1h-2Z"/></svg>'
};

function moveAssetToScenario(scenario) {
  const asset = document.getElementById("asset-marker");
  const map = document.getElementById("map-area");
  const bounds = map.getBoundingClientRect();
  const startX = parseFloat(asset.style.left || "10") / 100 * bounds.width;
  const startY = parseFloat(asset.style.top || "85") / 100 * bounds.height;
  const targetX = scenario.mapX / 100 * bounds.width;
  const targetY = scenario.mapY / 100 * bounds.height;
  const controlX = (startX + targetX) / 2 + (targetY - startY) * 0.18;
  const controlY = (startY + targetY) / 2 - (targetX - startX) * 0.18;

  asset.innerHTML = ASSET_ICONS[scenario.assetType] || ASSET_ICONS.ground;
  asset.classList.add("moving");
  drawAssetTrail(map, startX, startY, controlX, controlY, targetX, targetY);
  drawDeploymentRoute(map, startX, startY, controlX, controlY, targetX, targetY);

  const started = performance.now();
  function animateAsset(now) {
    const progress = Math.min(1, (now - started) / 1400);
    const eased = 1 - Math.pow(1 - progress, 3);
    const x = quadraticPoint(startX, controlX, targetX, eased);
    const y = quadraticPoint(startY, controlY, targetY, eased);
    asset.style.left = `${x / bounds.width * 100}%`;
    asset.style.top = `${y / bounds.height * 100}%`;
    if (progress < 1) requestAnimationFrame(animateAsset);
    else asset.classList.remove("moving");
  }
  requestAnimationFrame(animateAsset);
}

function resetAssetPosition() {
  const asset = document.getElementById("asset-marker");
  asset.style.left = "10%";
  asset.style.top = "85%";
  asset.innerHTML = ASSET_ICONS.ground;
  asset.classList.remove("moving");
  const route = document.getElementById("deployment-route");
  if (route) route.innerHTML = "";
}

function restoreDeployedAsset(scenario) {
  const asset = document.getElementById("asset-marker");
  const map = document.getElementById("map-area");
  const bounds = map.getBoundingClientRect();
  const startX = 0.1 * bounds.width;
  const startY = 0.85 * bounds.height;
  const targetX = scenario.mapX / 100 * bounds.width;
  const targetY = scenario.mapY / 100 * bounds.height;
  const controlX = (startX + targetX) / 2 + (targetY - startY) * 0.18;
  const controlY = (startY + targetY) / 2 - (targetX - startX) * 0.18;
  asset.innerHTML = ASSET_ICONS[scenario.assetType] || ASSET_ICONS.ground;
  asset.style.left = `${scenario.mapX}%`;
  asset.style.top = `${scenario.mapY}%`;
  drawDeploymentRoute(map, startX, startY, controlX, controlY, targetX, targetY);
}

function quadraticPoint(start, control, end, progress) {
  return (1 - progress) * (1 - progress) * start +
    2 * (1 - progress) * progress * control +
    progress * progress * end;
}

function drawAssetTrail(map, startX, startY, controlX, controlY, targetX, targetY) {
  const trail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  trail.classList.add("asset-trail");
  trail.setAttribute("viewBox", `0 0 ${map.clientWidth} ${map.clientHeight}`);
  trail.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`);
  trail.appendChild(path);
  map.querySelectorAll(".asset-trail").forEach((oldTrail) => oldTrail.remove());
  map.appendChild(trail);
  setTimeout(() => trail.remove(), 2200);
}

function drawDeploymentRoute(map, startX, startY, controlX, controlY, targetX, targetY) {
  const route = document.getElementById("deployment-route");
  if (!route) return;
  route.setAttribute("viewBox", `0 0 ${map.clientWidth} ${map.clientHeight}`);
  route.innerHTML = `<path d="M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}"></path>`;
}

setupMapControls();
