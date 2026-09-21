// MAP ENGINE — Panel B logic.
// A real, pannable/zoomable Leaflet map of Nepal, using free OpenStreetMap-
// derived tiles (CARTO's dark basemap, which is itself rendered from OSM
// data) instead of the earlier hand-projected SVG grid. This needs internet
// at runtime to load map tiles — consistent with the pitch's corrected
// "graceful degradation to rule-based logic," not a "100% offline" claim.
//
// Every incident and depot in data/*.json already carries a real lat/lon
// (see the README's map section for how those were sourced), so switching
// the basemap to Leaflet didn't require re-geocoding anything — it just
// meant re-rendering the same real coordinates on a real map instead of a
// custom equirectangular SVG projection.
//
// One honest simplification: the old SVG map drew 7 hand-approximated
// "province band" rectangles. A real province-boundary polygon dataset
// (precise administrative borders) could not be sourced and verified from
// inside this sandbox (outbound fetches to raw data hosts are blocked by
// the environment's egress policy, and reconstructing a multi-hundred-point
// polygon by hand from AI-summarized fetches — the way the old country
// outline was built — was judged too error-prone to repeat for 7 borders).
// So "Provinces" is now a toggleable set of labeled reference points near
// one well-known city per province, NOT a boundary claim. See
// PROVINCE_REFERENCE_POINTS below.
//
// Attribution (required by both providers' terms, and shown by Leaflet's
// built-in attribution control automatically): map data & tiles
// (c) OpenStreetMap contributors, tile styling (c) CARTO.

const NEPAL_CENTER = [28.395, 84.124];
const DEFAULT_ZOOM = 7;
const MIN_ZOOM = 6;
const MAX_ZOOM = 15;

// Reference points for the "Provinces" layer toggle: one well-known city
// per federal province, used only to orient the viewer regionally. Not
// administrative capitals or boundaries -- see the file header note above.
const PROVINCE_REFERENCE_POINTS = [
  { name: "SUDURPASHCHIM", lat: 28.7, lon: 80.6 },
  { name: "KARNALI", lat: 28.6, lon: 81.63 },
  { name: "LUMBINI", lat: 27.7, lon: 83.45 },
  { name: "GANDAKI", lat: 28.21, lon: 83.96 },
  { name: "BAGMATI", lat: 27.7, lon: 85.32 },
  { name: "MADHESH", lat: 26.73, lon: 85.93 },
  { name: "KOSHI", lat: 26.45, lon: 87.28 }
];

const ASSET_ICON_PATHS = {
  ground: '<path d="M4 15h20l3 4H2l2-4Zm3-5h12l3 5H5l2-5Zm3-5h5l2 5H8l2-5ZM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
  drone: '<path d="M14 9h4v6h-4zM5 5h5v3H7v3H4V8a3 3 0 0 1 1-3Zm17 0h5a3 3 0 0 1 1 3v3h-3V8h-3V5ZM5 13h3v3h2v3H5a3 3 0 0 1-3-3v-3h3Zm19 0h3v3a3 3 0 0 1-3 3h-5v-3h2v-3h3Z"/>',
  air: '<path d="m15 3 2 1v6l8 3v2h-8v4l3 2v1H12v-1l3-2v-4H7v-2l8-3V4l2-1h-2Z"/>',
  boat: '<path d="M4 15h24l-3 6H7l-3-6Zm10-11h2v6h6l-2 4H10l-2-4h4V4Zm-1 12h6v2h-6v-2Z"/>'
};

// ---- Leaflet map + layer groups ---------------------------------------

let leafletMap = null;
let baseTileLayer = null;
let labelsTileLayer = null;
let hazardLayerGroup = null;
let depotLayerGroup = null;
let cascadeGlowLayerGroup = null;
let cascadeWatchLayerGroup = null;
let provinceLayerGroup = null;
let routeLayerGroup = null;
let trailLayerGroup = null;
let assetMarker = null;

function initLeafletMap() {
  if (leafletMap || typeof L === "undefined") return;
  const container = document.getElementById("leaflet-map");
  if (!container) return;

  const nepalBounds = L.latLngBounds([24.3, 77.8], [31.6, 89.6]);
  leafletMap = L.map(container, {
    center: NEPAL_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: nepalBounds,
    maxBoundsViscosity: 0.6,
    zoomControl: false,
    attributionControl: true
  });

  // CARTO Dark Matter tiles (free, no API key), rendered from OpenStreetMap
  // data. "nolabels" as the base + a separate "only_labels" overlay lets the
  // "Labels" sidebar checkbox toggle place names independently of terrain.
  baseTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors ' +
      '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
  }).addTo(leafletMap);

  labelsTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20
  }).addTo(leafletMap);

  hazardLayerGroup = L.layerGroup().addTo(leafletMap);
  depotLayerGroup = L.layerGroup().addTo(leafletMap);
  cascadeGlowLayerGroup = L.layerGroup().addTo(leafletMap);
  cascadeWatchLayerGroup = L.layerGroup().addTo(leafletMap);
  provinceLayerGroup = L.layerGroup().addTo(leafletMap);
  routeLayerGroup = L.layerGroup().addTo(leafletMap);
  trailLayerGroup = L.layerGroup().addTo(leafletMap);

  renderProvinceReferencePoints();

  // Leaflet needs to know its container's real size; the boot overlay and
  // any panel-transition CSS can shift layout slightly right after init.
  setTimeout(() => leafletMap?.invalidateSize(), 300);
  window.addEventListener("resize", () => leafletMap?.invalidateSize());
}

// ---- Layer filter sidebar ----------------------------------------------

function toggleLayer(layer, visible) {
  if (!leafletMap) return;

  if (layer === "grid") {
    document.getElementById("map-grid-overlay")?.classList.toggle("grid-hidden", !visible);
    return;
  }
  if (layer === "labels") {
    if (!labelsTileLayer) return;
    if (visible && !leafletMap.hasLayer(labelsTileLayer)) labelsTileLayer.addTo(leafletMap);
    else if (!visible && leafletMap.hasLayer(labelsTileLayer)) leafletMap.removeLayer(labelsTileLayer);
    return;
  }

  const groupsByLayer = {
    incidents: [hazardLayerGroup],
    routes: [routeLayerGroup, trailLayerGroup],
    cascade: [cascadeGlowLayerGroup, cascadeWatchLayerGroup],
    depots: [depotLayerGroup],
    provinces: [provinceLayerGroup]
  };
  (groupsByLayer[layer] || []).forEach((group) => {
    if (!group) return;
    if (visible && !leafletMap.hasLayer(group)) group.addTo(leafletMap);
    else if (!visible && leafletMap.hasLayer(group)) leafletMap.removeLayer(group);
  });
}

function setupMapControls() {
  initLeafletMap();

  document.getElementById("map-zoom-in")?.addEventListener("click", () => leafletMap?.zoomIn());
  document.getElementById("map-zoom-out")?.addEventListener("click", () => leafletMap?.zoomOut());
  document.getElementById("map-zoom-reset")?.addEventListener("click", () => resetView());

  ["incidents", "routes", "labels", "grid", "cascade", "depots", "provinces"].forEach((layer) => {
    const checkbox = document.getElementById(`layer-${layer}`);
    if (!checkbox) return;
    checkbox.addEventListener("change", (event) => toggleLayer(layer, event.target.checked));
    toggleLayer(layer, checkbox.checked);
  });

  document.getElementById("map-layer-search")?.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    document.querySelectorAll(".map-filter-sidebar label").forEach((label) => {
      const matches = !query || label.textContent.toLowerCase().includes(query);
      label.style.display = matches ? "" : "none";
    });
  });
}

function resetView() {
  leafletMap?.setView(NEPAL_CENTER, DEFAULT_ZOOM, { animate: true });
}

function centerOnScenario(scenario) {
  if (!leafletMap || typeof scenario.lat !== "number") return;
  leafletMap.setView([scenario.lat, scenario.lon], 10, { animate: true });
}

// ---- Province reference points ------------------------------------------

function renderProvinceReferencePoints() {
  if (!leafletMap || !provinceLayerGroup) return;
  provinceLayerGroup.clearLayers();
  PROVINCE_REFERENCE_POINTS.forEach((point, i) => {
    const icon = L.divIcon({
      html: `<div class="province-label-html province-${i}">${point.name}</div>`,
      className: "province-label-wrap",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([point.lat, point.lon], { icon, interactive: false, keyboard: false }).addTo(provinceLayerGroup);
  });
}

// ---- Cascade risk glow + cascade watch zones -----------------------------

// Soft risk glow at any scenario with a grounded (explicitly set)
// cascadeProbability >= 0.3 -- deliberately NOT drawn from a guessed/
// heuristic estimate, so a glow on the map always reflects real analysis
// (see RASUWA_CASCADE_ANALYSIS.md) rather than a generic keyword match.
function renderCascadeGlow() {
  if (!leafletMap || !cascadeGlowLayerGroup || typeof scenarios === "undefined") return;
  cascadeGlowLayerGroup.clearLayers();
  scenarios.forEach((s) => {
    const cascade = typeof s.cascadeProbability === "number" ? s.cascadeProbability : 0;
    if (cascade < 0.3 || typeof s.lat !== "number") return;
    L.circle([s.lat, s.lon], {
      radius: 2500 + cascade * 9000,
      className: "cascade-glow-html",
      interactive: false
    }).addTo(cascadeGlowLayerGroup);
  });
}

// Groups scenarios by id-prefix (e.g. every "rasuwa-*" id) and calls out any
// region with 3+ tracked incidents as a named cascade-watch zone. This is
// data-driven, not hardcoded to Rasuwa -- it's just the only region that
// currently has enough grounded incidents to qualify.
function computeCascadeWatchZones() {
  if (typeof scenarios === "undefined" || !scenarios.length) return [];
  const groups = new Map();
  scenarios.forEach((s) => {
    if (typeof s.lat !== "number") return;
    const prefix = String(s.id).split("-")[0];
    const group = groups.get(prefix) || { sumLat: 0, sumLon: 0, count: 0, maxCascade: 0 };
    const cascade = typeof s.cascadeProbability === "number" ? s.cascadeProbability : 0;
    group.sumLat += s.lat;
    group.sumLon += s.lon;
    group.count += 1;
    group.maxCascade = Math.max(group.maxCascade, cascade);
    groups.set(prefix, group);
  });
  return Array.from(groups.entries())
    .filter(([, g]) => g.count >= 3 && g.maxCascade >= 0.3)
    .map(([prefix, g]) => ({
      label: prefix.toUpperCase(),
      lat: g.sumLat / g.count,
      lon: g.sumLon / g.count,
      maxCascade: g.maxCascade,
      count: g.count
    }));
}

function renderCascadeWatchZones() {
  if (!leafletMap || !cascadeWatchLayerGroup) return;
  cascadeWatchLayerGroup.clearLayers();
  computeCascadeWatchZones().forEach((zone) => {
    L.circle([zone.lat, zone.lon], {
      radius: 9000,
      className: "cascade-watch-ring-html",
      interactive: false
    }).addTo(cascadeWatchLayerGroup);

    const icon = L.divIcon({
      html: `<div class="cascade-watch-label-html">${zone.label} — CASCADE WATCH · ${Math.round(zone.maxCascade * 100)}% PEAK · ${zone.count} SITES</div>`,
      className: "cascade-watch-label-wrap",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    L.marker([zone.lat, zone.lon], { icon, interactive: false, keyboard: false }).addTo(cascadeWatchLayerGroup);
  });
}

// ---- Depot markers --------------------------------------------------------

function renderDepotMarkers() {
  if (!leafletMap || !depotLayerGroup || typeof depots === "undefined") return;
  depotLayerGroup.clearLayers();
  depots.forEach((depot) => {
    if (typeof depot.lat !== "number") return;
    const icon = L.divIcon({
      html: `<div class="depot-marker-html">
        <span class="depot-triangle-html"></span>
        <span class="depot-label-html">${depot.name}</span>
      </div>`,
      className: "depot-icon-wrap",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    const marker = L.marker([depot.lat, depot.lon], { icon, alt: depot.name });
    marker.on("mouseover", () => showMapTooltip({ name: depot.name, hazardTag: "Resource depot", stressIndex: null }));
    marker.on("mousemove", (event) => positionMapTooltip(event.originalEvent));
    marker.on("mouseout", hideMapTooltip);
    marker.addTo(depotLayerGroup);
  });
}

// ---- Tooltip ----------------------------------------------------------------

function showMapTooltip(incident) {
  const tooltip = document.getElementById("map-tooltip-el");
  if (!tooltip) return;
  const stressLine = typeof incident.stressIndex === "number" ? `<span>Stress index: ${incident.stressIndex}</span>` : "";
  tooltip.innerHTML = `<strong>${incident.name}</strong><span>${incident.hazardTag || ""}</span>${stressLine}`;
  tooltip.hidden = false;
}

function positionMapTooltip(event) {
  if (!event) return;
  const tooltip = document.getElementById("map-tooltip-el");
  const map = document.getElementById("map-area");
  if (!tooltip || !map) return;
  const bounds = map.getBoundingClientRect();
  tooltip.style.left = `${event.clientX - bounds.left + 14}px`;
  tooltip.style.top = `${event.clientY - bounds.top + 14}px`;
}

function hideMapTooltip() {
  const tooltip = document.getElementById("map-tooltip-el");
  if (tooltip) tooltip.hidden = true;
}

// ---- Case info / legend ------------------------------------------------------

function updateMapInfo(scenario, finalAssetType = scenario.assetType) {
  if (!scenario) return;
  const state = typeof resolvedIds !== "undefined" && resolvedIds.has(scenario.id)
    ? "Authorized"
    : typeof deniedIds !== "undefined" && deniedIds.has(scenario.id)
      ? "Denied"
      : typeof heldIds !== "undefined" && heldIds.has(scenario.id)
        ? "Held"
        : "Awaiting authorization";
  const coordinates = typeof scenario.lat === "number"
    ? `${scenario.lat.toFixed(2)}°N, ${scenario.lon.toFixed(2)}°E`
    : `[${scenario.mapX}, ${scenario.mapY}]`;
  const name = document.getElementById("map-case-name");
  const coordinateLabel = document.getElementById("map-case-coordinates");
  const status = document.getElementById("map-status");
  if (name) name.textContent = scenario.name;
  if (coordinateLabel) coordinateLabel.textContent = coordinates;
  if (status) status.textContent = `${coordinates} · Asset: ${String(finalAssetType || "unknown").toUpperCase()} · ${state}`;
  renderMapLegend();
}

function renderMapLegend() {
  const legend = document.getElementById("map-legend");
  if (!legend || typeof scenarios === "undefined") return;
  const counts = { ground: 0, drone: 0, air: 0, boat: 0 };
  scenarios.forEach((scenario) => {
    if (counts[scenario.assetType] !== undefined) counts[scenario.assetType]++;
  });
  legend.innerHTML = `
    <span class="unit-key"><i class="unit-swatch drone"></i>DRONE ×${counts.drone}</span>
    <span class="unit-key"><i class="unit-swatch ground"></i>GROUND ×${counts.ground}</span>
    <span class="unit-key"><i class="unit-swatch air"></i>AIR ×${counts.air}</span>
    <span class="unit-key"><i class="unit-swatch boat"></i>BOAT ×${counts.boat}</span>
    <span class="hazard-key"><i></i>HIGH ALERT</span>
    <span class="cascade-key"><i></i>CASCADE WATCH</span>
    <span class="depot-legend-key"><i></i>DEPOT</span>`;
}

// ---- Hazard markers -----------------------------------------------------------

function renderHazardRing(scenario) {
  if (!leafletMap || !hazardLayerGroup) return;
  hazardLayerGroup.clearLayers();
  const emptyState = document.querySelector(".map-empty-state");
  if (emptyState) emptyState.hidden = true;
  updateMapInfo(scenario);

  const incidents = typeof scenarios !== "undefined" && scenarios.length ? scenarios : [scenario];

  incidents.forEach((incident) => {
    if (typeof incident.lat !== "number") return;
    const isActive = incident.id === scenario.id;
    const isCritical = incident.stressIndex >= 85;
    const icon = L.divIcon({
      html: `<div class="hazard-marker-html${isActive ? " active" : ""}${isCritical ? " critical" : ""}">
        <span class="hazard-ring-html ring-0"></span>
        <span class="hazard-ring-html ring-1"></span>
        <span class="hazard-ring-html ring-2"></span>
        <span class="hazard-core-html"></span>
      </div>`,
      className: "hazard-icon-wrap",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    const marker = L.marker([incident.lat, incident.lon], {
      icon,
      alt: incident.name,
      keyboard: true
    });
    marker.on("mouseover", () => showMapTooltip(incident));
    marker.on("mousemove", (event) => positionMapTooltip(event.originalEvent));
    marker.on("mouseout", hideMapTooltip);
    marker.on("click", () => {
      if (typeof selectScenario === "function") selectScenario(incident.id);
    });
    marker.addTo(hazardLayerGroup);
  });

  centerOnScenario(scenario);
}

// ---- Asset marker + deployment route ------------------------------------------

function nearestDepotTo(scenario) {
  if (typeof depots === "undefined" || !depots.length || typeof scenario.lat !== "number") return null;
  let best = null;
  let bestDist = Infinity;
  depots.forEach((depot) => {
    if (typeof depot.lat !== "number") return;
    const dLat = depot.lat - scenario.lat;
    const dLon = depot.lon - scenario.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < bestDist) {
      bestDist = dist;
      best = depot;
    }
  });
  return best;
}

function quadraticPoint(start, control, end, progress) {
  return (1 - progress) * (1 - progress) * start +
    2 * (1 - progress) * progress * control +
    progress * progress * end;
}

// A small perpendicular offset in lat/lon-degree space, purely cosmetic --
// it just keeps the deployment route/trail from being a dead-straight line.
function controlPointFor(startLat, startLon, targetLat, targetLon) {
  const midLat = (startLat + targetLat) / 2;
  const midLon = (startLon + targetLon) / 2;
  const dLat = targetLat - startLat;
  const dLon = targetLon - startLon;
  const offset = 0.18;
  return { controlLat: midLat + dLon * offset, controlLon: midLon - dLat * offset };
}

function bezierLatLngs(startLat, startLon, controlLat, controlLon, targetLat, targetLon, steps = 24) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([
      quadraticPoint(startLat, controlLat, targetLat, t),
      quadraticPoint(startLon, controlLon, targetLon, t)
    ]);
  }
  return points;
}

function drawAssetTrail(startLat, startLon, controlLat, controlLon, targetLat, targetLon) {
  if (!leafletMap || !trailLayerGroup) return;
  const latlngs = bezierLatLngs(startLat, startLon, controlLat, controlLon, targetLat, targetLon);
  const trail = L.polyline(latlngs, { className: "asset-trail-html", interactive: false }).addTo(trailLayerGroup);
  setTimeout(() => trailLayerGroup?.removeLayer(trail), 2200);
}

function drawDeploymentRoute(startLat, startLon, controlLat, controlLon, targetLat, targetLon) {
  if (!leafletMap || !routeLayerGroup) return;
  routeLayerGroup.clearLayers();
  const latlngs = bezierLatLngs(startLat, startLon, controlLat, controlLon, targetLat, targetLon);
  L.polyline(latlngs, { className: "deployment-route-html", interactive: false }).addTo(routeLayerGroup);
}

function assetDivIcon(assetType) {
  const svg = `<svg width="30" height="24" viewBox="0 0 32 24">${ASSET_ICON_PATHS[assetType] || ASSET_ICON_PATHS.ground}</svg>`;
  return L.divIcon({
    html: `<div class="asset-marker-html">${svg}</div>`,
    className: "asset-icon-wrap",
    iconSize: [30, 24],
    iconAnchor: [15, 12]
  });
}

function moveAssetToScenario(scenario, finalAssetType = scenario.assetType) {
  if (!leafletMap || typeof scenario.lat !== "number") return;
  const origin = nearestDepotTo(scenario) || { lat: scenario.lat + 0.15, lon: scenario.lon - 0.15 };
  const startLat = origin.lat;
  const startLon = origin.lon;
  const targetLat = scenario.lat;
  const targetLon = scenario.lon;
  const { controlLat, controlLon } = controlPointFor(startLat, startLon, targetLat, targetLon);

  if (assetMarker) {
    leafletMap.removeLayer(assetMarker);
    assetMarker = null;
  }
  assetMarker = L.marker([startLat, startLon], { icon: assetDivIcon(finalAssetType), interactive: false }).addTo(leafletMap);
  assetMarker.getElement()?.classList.add("moving");

  drawAssetTrail(startLat, startLon, controlLat, controlLon, targetLat, targetLon);
  drawDeploymentRoute(startLat, startLon, controlLat, controlLon, targetLat, targetLon);

  const started = performance.now();
  function animateAsset(now) {
    const progress = Math.min(1, (now - started) / 1400);
    const eased = 1 - Math.pow(1 - progress, 3);
    const lat = quadraticPoint(startLat, controlLat, targetLat, eased);
    const lon = quadraticPoint(startLon, controlLon, targetLon, eased);
    if (assetMarker) assetMarker.setLatLng([lat, lon]);
    if (progress < 1) {
      requestAnimationFrame(animateAsset);
    } else if (assetMarker) {
      assetMarker.getElement()?.classList.remove("moving");
    }
  }
  requestAnimationFrame(animateAsset);
}

function resetAssetPosition() {
  if (assetMarker && leafletMap) {
    leafletMap.removeLayer(assetMarker);
    assetMarker = null;
  }
  routeLayerGroup?.clearLayers();
  trailLayerGroup?.clearLayers();
}

function restoreDeployedAsset(scenario, finalAssetType = scenario.assetType) {
  if (!leafletMap || typeof scenario.lat !== "number") return;
  const origin = nearestDepotTo(scenario) || { lat: scenario.lat + 0.15, lon: scenario.lon - 0.15 };
  const { controlLat, controlLon } = controlPointFor(origin.lat, origin.lon, scenario.lat, scenario.lon);

  if (assetMarker) {
    leafletMap.removeLayer(assetMarker);
    assetMarker = null;
  }
  assetMarker = L.marker([scenario.lat, scenario.lon], { icon: assetDivIcon(finalAssetType), interactive: false }).addTo(leafletMap);
  drawDeploymentRoute(origin.lat, origin.lon, controlLat, controlLon, scenario.lat, scenario.lon);
}

setupMapControls();
