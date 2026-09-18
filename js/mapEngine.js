/**
 * js/mapEngine.js
 * Renders spatial telemetry hazard rings and localized rescue markers for Panel B.
 */

function updateTacticalMap(scenario) {
  const mapArea = document.getElementById('map-area');
  if (!mapArea) return;

  // Extract map coordinates from scenario (default to center 50%, 50%)
  const posX = scenario.mapX !== undefined ? scenario.mapX : 50;
  const posY = scenario.mapY !== undefined ? scenario.mapY : 50;

  // Render tactical grid overlay, hazard ring, and Nepal rescue markers
  mapArea.innerHTML = `
    <div class="radar-scanline"></div>
    <div class="map-grid-overlay"></div>

    <div class="hazard-ring-pulse" style="left: ${posX}%; top: ${posY}%;">
      <span class="hazard-label">${scenario.hazardTag || 'HAZARD ZONE'}</span>
    </div>

    <div class="asset-marker drone" style="left: ${Math.max(5, posX - 12)}%; top: ${Math.max(5, posY - 10)}%;">
      🚁 AIR-RESCUE-01
    </div>
    <div class="asset-marker ground" style="left: ${Math.min(85, posX + 12)}%; top: ${Math.min(85, posY + 10)}%;">
      🧗 SWIFTWATER-TEAM
    </div>

    <div class="map-coordinates-box">
      <span>GRID: [${posX}.84°N, ${posY}.12°E]</span>
      <span>STATUS: ACTIVE RADAR</span>
    </div>
  `;
}