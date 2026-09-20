// MAP ENGINE — Panel B logic.
// A pannable/zoomable grid-style tactical map of Nepal (SVG viewBox-based,
// no map-tile server, no internet at runtime — consistent with the
// "grid-down ready / 100% offline" pitch). Renders the country outline,
// simplified province bands (visually separated regions, clipped to the
// outline), cascade-risk glow at grounded high-risk sites (see data/scenarios.json's
// cascadeProbability field), a persistent "cascade watch" callout for any
// region with 3+ tracked incidents (currently just Rasuwa), live resource
// depots, hazard markers, and the deployment route/asset animation.
//
// Coordinate system: all positions are in a fixed 1000x430 grid ("gridX"/
// "gridY" on each scenario/depot in data/*.json), produced by a simple
// equirectangular projection of Nepal's real lat/lon bounding box
// (lon 80.05-88.20, lat 26.35-30.45). The country OUTLINE below is real
// GeoJSON boundary data pulled from GitHub (see the note above
// NEPAL_OUTLINE_D), reprojected with this same formula. Incident/depot
// lat-lon values are still real-relative-position approximations from
// general geography, not survey-precision (see README.md's map section).

const SVG_NS = "http://www.w3.org/2000/svg";
const GRID_W = 1000;
const GRID_H = 430;

// Nepal's outline, projected into the grid above. This is REAL boundary
// data, not hand-drawn: it's Nepal's national polygon from the
// georgique/world-geojson project on GitHub (github.com/georgique/
// world-geojson, GPL-3.0 licensed -- see README.md's map section for the
// attribution/license note), fetched in verified overlapping segments
// (this sandbox has no raw git-clone/curl access, so it was retrieved via
// several cross-checked WebFetch calls and reassembled -- every segment
// boundary was confirmed to overlap byte-for-byte with its neighbor
// before being stitched together) and reprojected into this file's grid
// with the same equirectangular formula as every incident/depot
// coordinate. 577 points, real closed ring.
const NEPAL_OUTLINE_D = "M 192.49,0.51 L 191.82,3.86 L 184.74,2.25 L 184.4,6.1 L 184.91,8.09 L 175.47,7.09 L 169.58,3.12 L 166.54,3.49 L 166.04,5.36 L 169.41,7.59 L 165.87,8.46 L 165.87,12.69 L 168.23,15.05 L 166.21,17.41 L 167.89,17.54 L 165.03,22.02 L 164.86,26.0 L 159.97,28.86 L 157.27,31.35 L 153.9,30.6 L 147.84,31.85 L 151.71,35.34 L 151.55,39.82 L 148.51,43.07 L 145.48,43.94 L 147.5,45.06 L 143.46,46.68 L 140.93,44.94 L 139.24,45.68 L 133.01,45.81 L 127.79,41.2 L 130.15,37.46 L 125.93,36.09 L 127.28,30.85 L 120.83,26.46 L 108.41,28.36 L 106.56,23.51 L 99.82,29.61 L 100.99,33.47 L 92.23,38.33 L 86.67,43.31 L 84.82,46.93 L 76.06,51.3 L 68.81,51.42 L 64.26,55.04 L 61.57,61.78 L 53.14,68.53 L 47.07,68.16 L 42.69,72.16 L 38.82,74.28 L 41.68,82.54 L 45.22,83.67 L 43.87,87.92 L 41.35,92.31 L 36.12,94.56 L 37.3,96.57 L 29.21,101.83 L 31.07,104.59 L 23.65,105.72 L 23.82,109.48 L 27.7,110.99 L 28.37,115.0 L 32.41,119.52 L 29.55,131.59 L 24.66,128.95 L 23.82,130.96 L 27.7,137.37 L 22.64,139.51 L 15.9,138.25 L 10.68,144.29 L 8.82,153.36 L 5.29,154.62 L 1.41,160.92 L 2.42,170.38 L 7.98,170.0 L 20.45,177.96 L 26.18,177.96 L 26.01,180.86 L 31.4,182.88 L 33.59,186.42 L 39.83,191.1 L 47.24,190.08 L 51.46,192.11 L 52.97,196.15 L 57.18,199.44 L 59.21,197.04 L 55.33,187.43 L 60.39,184.4 L 65.61,185.91 L 64.77,188.06 L 75.05,190.72 L 78.58,193.62 L 79.09,195.39 L 86.0,197.17 L 89.03,200.45 L 97.96,204.12 L 103.86,203.87 L 104.87,208.3 L 110.26,210.96 L 117.0,210.96 L 119.36,214.63 L 123.24,214.63 L 140.26,218.18 L 143.96,223.25 L 146.66,229.97 L 155.08,237.08 L 156.09,238.61 L 153.74,239.87 L 155.42,241.65 L 155.59,243.18 L 161.82,242.16 L 163.51,238.48 L 171.43,240.64 L 172.78,242.92 L 175.81,244.32 L 174.97,248.13 L 195.69,257.54 L 202.26,258.3 L 215.74,267.21 L 219.62,268.23 L 225.52,271.66 L 229.56,271.92 L 230.24,269.88 L 235.12,264.28 L 247.42,264.92 L 255.01,271.28 L 257.36,271.54 L 258.21,270.77 L 269.83,276.76 L 283.82,283.89 L 289.72,289.12 L 297.64,291.03 L 302.86,289.38 L 307.24,289.63 L 320.72,286.19 L 325.94,286.44 L 326.79,289.76 L 327.12,291.93 L 329.82,294.1 L 329.65,297.67 L 332.18,300.22 L 330.16,304.56 L 331.17,307.12 L 329.31,308.78 L 337.23,309.8 L 352.57,309.16 L 355.94,312.99 L 366.55,314.66 L 384.75,314.14 L 388.12,318.36 L 395.87,321.3 L 394.69,323.73 L 399.07,326.93 L 405.14,325.91 L 409.35,321.69 L 411.38,318.62 L 409.02,315.81 L 411.38,313.89 L 409.69,311.46 L 438.17,312.48 L 464.29,322.84 L 466.98,325.27 L 470.01,322.07 L 465.13,317.6 L 466.14,315.81 L 472.88,316.32 L 476.92,315.17 L 486.02,315.55 L 488.38,316.06 L 491.58,314.66 L 493.77,311.46 L 496.13,310.82 L 497.48,307.76 L 500.18,308.27 L 503.04,307.76 L 503.04,310.69 L 509.78,312.61 L 510.45,315.81 L 512.98,314.02 L 516.52,314.91 L 519.05,319.64 L 520.23,321.05 L 539.27,322.97 L 548.03,324.5 L 560.67,326.42 L 569.6,339.09 L 568.08,343.07 L 568.42,346.53 L 566.73,352.17 L 563.2,356.01 L 576.17,361.27 L 579.37,360.37 L 581.9,362.43 L 586.11,359.61 L 590.32,362.94 L 602.63,366.15 L 604.14,370.64 L 607.51,371.42 L 607.17,373.21 L 614.42,373.86 L 610.88,375.4 L 610.88,376.94 L 615.43,377.84 L 619.64,375.27 L 631.27,375.65 L 629.59,381.31 L 632.96,387.22 L 636.66,386.97 L 648.46,388.64 L 651.49,386.97 L 657.56,383.75 L 662.61,384.27 L 669.35,381.95 L 678.45,376.55 L 680.3,377.45 L 684.52,375.14 L 686.88,377.2 L 694.29,379.64 L 697.66,384.14 L 696.31,391.98 L 697.15,396.61 L 701.54,400.86 L 705.41,401.12 L 708.95,403.31 L 711.81,402.79 L 711.98,407.69 L 721.42,402.15 L 723.44,401.12 L 724.62,398.16 L 734.23,397.13 L 747.03,400.86 L 748.04,403.31 L 753.77,401.89 L 754.78,404.21 L 758.66,404.73 L 761.02,402.54 L 772.14,401.64 L 771.97,403.31 L 779.38,405.11 L 791.85,410.01 L 794.38,409.75 L 800.11,414.65 L 806.85,416.19 L 807.69,417.87 L 815.11,419.55 L 821.17,422.38 L 824.04,419.42 L 831.11,420.84 L 840.04,416.97 L 839.88,413.62 L 854.03,411.04 L 859.09,405.24 L 861.78,405.89 L 863.8,419.29 L 873.07,424.19 L 878.29,423.67 L 884.87,423.93 L 885.37,427.8 L 891.44,428.32 L 895.99,430.0 L 897.0,423.42 L 907.61,421.09 L 913.68,421.61 L 920.59,422.64 L 925.81,426.64 L 931.71,425.35 L 935.92,423.16 L 936.09,421.09 L 942.16,423.67 L 943.67,422.77 L 945.7,423.42 L 947.72,420.84 L 948.22,419.42 L 950.92,417.87 L 955.97,420.71 L 961.7,417.35 L 963.72,419.68 L 966.25,420.06 L 966.25,422.64 L 974.34,425.74 L 975.18,428.58 L 979.4,428.96 L 979.4,425.35 L 986.81,421.87 L 988.49,417.48 L 986.64,414.26 L 988.16,412.2 L 987.99,408.33 L 991.53,403.57 L 994.9,399.96 L 996.25,395.2 L 998.77,389.02 L 996.92,379.89 L 995.74,375.27 L 991.86,372.57 L 993.55,369.75 L 990.01,366.54 L 992.71,363.58 L 987.32,361.53 L 985.63,357.94 L 981.08,358.32 L 974.0,349.86 L 977.21,344.47 L 976.87,337.69 L 980.24,331.16 L 983.44,326.8 L 981.08,323.22 L 982.09,318.62 L 984.96,316.83 L 980.07,311.21 L 983.27,306.99 L 985.12,301.5 L 989.84,297.92 L 991.02,293.97 L 994.56,289.38 L 994.39,286.57 L 997.76,281.6 L 998.27,278.54 L 997.59,276.38 L 1000.12,272.81 L 992.04,269.32 L 987.99,271.28 L 985.46,267.72 L 978.55,267.34 L 972.82,268.61 L 967.6,265.81 L 958.84,266.06 L 958.16,263.01 L 954.79,262.5 L 952.94,265.81 L 948.22,269.24 L 946.2,272.68 L 942.49,277.4 L 934.41,276.76 L 935.08,274.34 L 930.36,274.47 L 927.5,276.25 L 924.63,274.97 L 924.63,271.54 L 921.43,270.9 L 918.06,273.45 L 911.83,273.06 L 907.95,275.74 L 902.73,274.34 L 905.59,273.19 L 905.25,271.66 L 897.5,273.19 L 896.49,274.47 L 891.27,274.97 L 889.75,273.06 L 884.02,272.81 L 879.98,275.99 L 870.37,274.59 L 867.0,272.56 L 865.66,269.24 L 860.94,265.43 L 856.89,261.99 L 845.1,261.1 L 843.92,258.43 L 836.17,254.36 L 831.11,255.25 L 822.69,253.34 L 822.35,247.62 L 818.48,245.84 L 811.9,246.73 L 808.03,249.53 L 804.49,248.51 L 803.48,246.23 L 798.93,245.21 L 799.44,250.8 L 795.73,252.45 L 792.7,261.61 L 787.47,262.63 L 784.94,266.83 L 780.23,266.44 L 775.85,263.52 L 772.14,263.01 L 771.13,260.21 L 769.11,262.5 L 764.72,259.06 L 758.15,259.32 L 756.97,252.96 L 755.29,248.0 L 757.48,246.1 L 753.6,238.99 L 751.24,238.99 L 751.75,242.8 L 746.69,244.7 L 744.84,247.5 L 740.8,246.99 L 741.3,253.09 L 739.95,255.0 L 745.68,264.41 L 739.28,265.68 L 737.26,266.83 L 727.65,265.55 L 723.95,261.86 L 726.98,257.28 L 717.04,250.93 L 718.22,245.72 L 714.51,244.45 L 714.34,241.14 L 711.98,237.97 L 706.59,235.81 L 700.36,233.02 L 697.83,224.77 L 695.64,218.31 L 694.29,216.54 L 691.93,216.79 L 691.59,220.84 L 689.74,220.34 L 687.72,224.14 L 688.22,225.92 L 682.33,230.48 L 679.97,224.65 L 671.54,222.75 L 668.51,222.11 L 658.23,222.62 L 656.21,226.04 L 653.01,227.95 L 648.79,225.54 L 640.37,227.06 L 635.31,222.49 L 631.78,221.48 L 629.75,222.87 L 622.34,221.48 L 620.32,220.34 L 622.85,216.28 L 619.98,209.19 L 621.67,205.64 L 626.55,205.14 L 628.74,201.09 L 629.92,200.45 L 631.1,197.54 L 628.74,194.26 L 631.27,191.35 L 630.43,189.2 L 626.89,189.07 L 622.0,185.28 L 618.13,186.29 L 613.91,185.53 L 609.53,190.46 L 606.16,193.12 L 606.33,194.13 L 601.45,196.15 L 600.94,194.38 L 591.84,195.9 L 589.99,196.66 L 580.55,193.12 L 569.94,190.59 L 570.78,186.42 L 565.89,184.27 L 561.68,179.6 L 554.94,179.85 L 552.07,178.33 L 549.21,178.97 L 547.36,178.71 L 544.83,179.72 L 538.26,176.19 L 539.61,174.04 L 537.25,172.28 L 538.09,170.13 L 534.38,169.75 L 535.22,167.61 L 529.33,166.6 L 526.63,165.21 L 523.93,166.22 L 517.03,163.07 L 515.51,163.95 L 512.31,163.19 L 511.63,157.9 L 514.33,152.73 L 515.51,148.45 L 512.65,146.31 L 507.93,147.06 L 507.42,143.04 L 509.78,138.88 L 505.74,137.5 L 504.89,131.34 L 509.28,129.2 L 508.94,126.56 L 498.66,126.31 L 499.5,123.54 L 495.63,121.16 L 492.76,122.29 L 489.39,120.28 L 486.86,121.78 L 483.83,120.65 L 484.67,118.77 L 480.12,117.26 L 477.77,118.65 L 472.37,118.27 L 466.81,120.15 L 461.42,120.65 L 459.06,123.67 L 459.74,125.68 L 450.3,126.69 L 443.9,130.96 L 440.53,135.11 L 436.48,133.6 L 432.44,133.35 L 432.27,130.58 L 426.71,130.08 L 424.86,125.3 L 421.32,122.79 L 418.96,122.92 L 415.76,119.65 L 416.94,115.51 L 412.89,114.0 L 413.9,109.61 L 406.66,106.72 L 404.8,102.83 L 403.62,100.2 L 401.1,99.07 L 394.69,99.45 L 392.67,93.81 L 396.88,93.18 L 388.46,90.3 L 388.12,88.3 L 385.43,88.3 L 382.73,90.05 L 381.55,86.8 L 376.83,86.67 L 372.79,88.42 L 367.06,85.79 L 365.71,83.29 L 362.17,81.91 L 356.11,82.29 L 354.76,78.54 L 349.2,78.29 L 342.96,80.29 L 339.26,78.41 L 340.1,76.53 L 333.02,75.53 L 331.51,71.66 L 324.26,71.78 L 324.77,69.16 L 329.31,66.41 L 325.61,62.78 L 317.69,64.53 L 316.17,63.28 L 318.36,60.66 L 313.14,58.41 L 308.08,51.8 L 304.04,50.3 L 300.5,52.67 L 297.3,49.93 L 285.84,44.19 L 284.16,46.18 L 280.28,42.19 L 275.9,43.31 L 272.36,40.7 L 268.65,39.95 L 260.57,40.57 L 259.72,38.58 L 261.91,35.59 L 260.4,33.97 L 264.61,31.35 L 261.24,29.86 L 261.91,27.62 L 256.69,26.62 L 255.68,23.63 L 251.97,22.76 L 253.83,19.65 L 253.49,16.29 L 253.99,14.55 L 252.14,10.82 L 246.58,9.21 L 246.41,11.82 L 241.19,11.07 L 238.66,13.31 L 233.77,10.08 L 230.57,10.95 L 222.65,7.59 L 215.24,6.97 L 206.48,5.48 L 202.1,3.12 Z";

// Nepal's 7 federal provinces, drawn as simplified west-to-east column
// bands (plus one Terai-only horizontal strip for Madhesh) and clipped to
// the REAL outline above (so they never spill past the true border, even
// though the outline itself is now accurate). These bands are still NOT
// precise administrative boundaries -- real province borders are far more
// irregular, and a small/reliable enough real province GeoJSON could not
// be verified the same way the country outline was -- they're a simplified,
// honestly-approximate visual grouping so the map reads as distinct
// regions rather than one flat shape. See README.md's map section.
const PROVINCE_COLUMNS = [
  { name: "Sudurpashchim", x: 0.0, w: 122.7 },
  { name: "Karnali", x: 122.7, w: 208.6 },
  { name: "Lumbini", x: 331.3, w: 153.4 },
  { name: "Gandaki", x: 484.7, w: 134.9 },
  { name: "Bagmati", x: 619.6, w: 141.1 },
  { name: "Koshi", x: 760.7, w: 239.3 }
];
const MADHESH_BAND = { name: "Madhesh", x: 619.6, w: 306.8, y: 346.1, h: 83.9 };

const ASSET_ICON_PATHS = {
  ground: '<path d="M4 15h20l3 4H2l2-4Zm3-5h12l3 5H5l2-5Zm3-5h5l2 5H8l2-5ZM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm16 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
  drone: '<path d="M14 9h4v6h-4zM5 5h5v3H7v3H4V8a3 3 0 0 1 1-3Zm17 0h5a3 3 0 0 1 1 3v3h-3V8h-3V5ZM5 13h3v3h2v3H5a3 3 0 0 1-3-3v-3h3Zm19 0h3v3a3 3 0 0 1-3 3h-5v-3h2v-3h3Z"/>',
  air: '<path d="m15 3 2 1v6l8 3v2h-8v4l3 2v1H12v-1l3-2v-4H7v-2l8-3V4l2-1h-2Z"/>',
  boat: '<path d="M4 15h24l-3 6H7l-3-6Zm10-11h2v6h6l-2 4H10l-2-4h4V4Zm-1 12h6v2h-6v-2Z"/>'
};

// ---- Pan / zoom state (SVG viewBox) --------------------------------------

let viewBox = { x: 0, y: 0, w: GRID_W, h: GRID_H };
const MIN_ZOOM_W = GRID_W / 5;
const MAX_ZOOM_W = GRID_W;

function applyViewBox() {
  const svg = document.getElementById("grid-map-svg");
  if (svg) svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
}

function clampViewBox() {
  viewBox.w = Math.max(MIN_ZOOM_W, Math.min(MAX_ZOOM_W, viewBox.w));
  viewBox.h = viewBox.w * (GRID_H / GRID_W);
  const margin = 0.15;
  viewBox.x = Math.max(-GRID_W * margin, Math.min(GRID_W * (1 + margin) - viewBox.w, viewBox.x));
  viewBox.y = Math.max(-GRID_H * margin, Math.min(GRID_H * (1 + margin) - viewBox.h, viewBox.y));
}

function zoomBy(factor, centerX, centerY) {
  const cx = typeof centerX === "number" ? centerX : viewBox.x + viewBox.w / 2;
  const cy = typeof centerY === "number" ? centerY : viewBox.y + viewBox.h / 2;
  const newW = viewBox.w * factor;
  const newH = newW * (GRID_H / GRID_W);
  viewBox.x = cx - (cx - viewBox.x) * (newW / viewBox.w);
  viewBox.y = cy - (cy - viewBox.y) * (newH / viewBox.h);
  viewBox.w = newW;
  viewBox.h = newH;
  clampViewBox();
  applyViewBox();
}

function resetView() {
  viewBox = { x: 0, y: 0, w: GRID_W, h: GRID_H };
  applyViewBox();
}

function centerOnScenario(scenario) {
  if (!scenario || typeof scenario.gridX !== "number") return;
  const focusWidth = GRID_W / 2.6;
  viewBox.w = focusWidth;
  viewBox.h = focusWidth * (GRID_H / GRID_W);
  viewBox.x = scenario.gridX - viewBox.w / 2;
  viewBox.y = scenario.gridY - viewBox.h / 2;
  clampViewBox();
  applyViewBox();
}

function screenToGrid(svg, clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 };
  const x = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w;
  const y = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h;
  return { x, y };
}

function setupPanZoom() {
  const svg = document.getElementById("grid-map-svg");
  if (!svg) return;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  svg.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    svg.classList.add("panning");
  });
  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dxGrid = ((event.clientX - lastX) / rect.width) * viewBox.w;
    const dyGrid = ((event.clientY - lastY) / rect.height) * viewBox.h;
    lastX = event.clientX;
    lastY = event.clientY;
    viewBox.x -= dxGrid;
    viewBox.y -= dyGrid;
    clampViewBox();
    applyViewBox();
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    svg.classList.remove("panning");
  });

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = screenToGrid(svg, event.clientX, event.clientY);
    const factor = event.deltaY > 0 ? 1.15 : 1 / 1.15;
    zoomBy(factor, point.x, point.y);
  }, { passive: false });
}

// ---- Layer filter sidebar --------------------------------------------------

const LAYER_TARGETS = {
  incidents: ["hazard-markers"],
  routes: ["deployment-route-path", "asset-trail-layer"],
  cascade: ["cascade-glow-layer", "cascade-watch-layer"],
  depots: ["depot-layer"],
  provinces: ["province-layer"],
  grid: ["map-grid-pattern-rect"]
};

function toggleLayer(layer, visible) {
  (LAYER_TARGETS[layer] || []).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? "" : "none";
  });
  if (layer === "labels") {
    document.getElementById("grid-map-svg")?.classList.toggle("hide-labels", !visible);
  }
}

function setupMapControls() {
  document.getElementById("map-zoom-in")?.addEventListener("click", () => zoomBy(1 / 1.3));
  document.getElementById("map-zoom-out")?.addEventListener("click", () => zoomBy(1.3));
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

  setupPanZoom();
  applyViewBox();
  renderNepalOutline();
  renderProvinceLayer();
}

// ---- Static layers: outline, provinces, cascade risk, depots ----------------

function renderNepalOutline() {
  const path = document.getElementById("nepal-outline");
  if (path) path.setAttribute("d", NEPAL_OUTLINE_D);
  const clipPath = document.getElementById("nepal-clip-path");
  if (clipPath) clipPath.setAttribute("d", NEPAL_OUTLINE_D);
}

// Draws the 7-province column bands (+ the Madhesh Terai strip on top),
// clipped to the real outline path so the simplified rectangles never
// spill past the country's actual silhouette.
function renderProvinceLayer() {
  const layer = document.getElementById("province-layer");
  if (!layer) return;
  layer.innerHTML = "";

  PROVINCE_COLUMNS.forEach((province, i) => {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", province.x);
    rect.setAttribute("y", -20);
    rect.setAttribute("width", province.w);
    rect.setAttribute("height", GRID_H + 40);
    rect.setAttribute("class", `province-band province-${i}`);
    layer.appendChild(rect);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", province.x + province.w / 2);
    label.setAttribute("y", 24);
    label.setAttribute("class", "province-label");
    label.textContent = province.name.toUpperCase();
    layer.appendChild(label);
  });

  const madhesh = document.createElementNS(SVG_NS, "rect");
  madhesh.setAttribute("x", MADHESH_BAND.x);
  madhesh.setAttribute("y", MADHESH_BAND.y);
  madhesh.setAttribute("width", MADHESH_BAND.w);
  madhesh.setAttribute("height", MADHESH_BAND.h + 20);
  madhesh.setAttribute("class", "province-band madhesh");
  layer.appendChild(madhesh);

  const madheshLabel = document.createElementNS(SVG_NS, "text");
  madheshLabel.setAttribute("x", MADHESH_BAND.x + MADHESH_BAND.w / 2);
  madheshLabel.setAttribute("y", MADHESH_BAND.y + MADHESH_BAND.h - 8);
  madheshLabel.setAttribute("class", "province-label madhesh-label");
  madheshLabel.textContent = "MADHESH";
  layer.appendChild(madheshLabel);
}

// Soft risk glow at any scenario with a grounded (explicitly set)
// cascadeProbability >= 0.3 -- deliberately NOT drawn from a guessed/
// heuristic estimate, so a glow on the map always reflects real analysis
// (see RASUWA_CASCADE_ANALYSIS.md) rather than a generic keyword match.
function renderCascadeGlow() {
  const layer = document.getElementById("cascade-glow-layer");
  if (!layer || typeof scenarios === "undefined") return;
  layer.innerHTML = "";
  scenarios.forEach((s) => {
    const cascade = typeof s.cascadeProbability === "number" ? s.cascadeProbability : 0;
    if (cascade < 0.3 || typeof s.gridX !== "number") return;
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", s.gridX);
    circle.setAttribute("cy", s.gridY);
    circle.setAttribute("r", String(16 + cascade * 34));
    circle.setAttribute("class", "cascade-glow");
    circle.style.opacity = String(0.10 + cascade * 0.26);
    layer.appendChild(circle);
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
    if (typeof s.gridX !== "number") return;
    const prefix = String(s.id).split("-")[0];
    const group = groups.get(prefix) || { sumX: 0, sumY: 0, count: 0, maxCascade: 0 };
    const cascade = typeof s.cascadeProbability === "number" ? s.cascadeProbability : 0;
    group.sumX += s.gridX;
    group.sumY += s.gridY;
    group.count += 1;
    group.maxCascade = Math.max(group.maxCascade, cascade);
    groups.set(prefix, group);
  });
  return Array.from(groups.entries())
    .filter(([, g]) => g.count >= 3 && g.maxCascade >= 0.3)
    .map(([prefix, g]) => ({
      label: prefix.toUpperCase(),
      x: g.sumX / g.count,
      y: g.sumY / g.count,
      maxCascade: g.maxCascade,
      count: g.count
    }));
}

function renderCascadeWatchZones() {
  const layer = document.getElementById("cascade-watch-layer");
  if (!layer) return;
  layer.innerHTML = "";
  computeCascadeWatchZones().forEach((zone) => {
    const ring = document.createElementNS(SVG_NS, "ellipse");
    ring.setAttribute("cx", zone.x);
    ring.setAttribute("cy", zone.y);
    ring.setAttribute("rx", "58");
    ring.setAttribute("ry", "42");
    ring.setAttribute("class", "cascade-watch-ring");
    layer.appendChild(ring);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", zone.x);
    label.setAttribute("y", zone.y - 50);
    label.setAttribute("class", "cascade-watch-label");
    label.textContent = `${zone.label} — CASCADE WATCH · ${Math.round(zone.maxCascade * 100)}% PEAK · ${zone.count} SITES`;
    layer.appendChild(label);
  });
}

function renderDepotMarkers() {
  const layer = document.getElementById("depot-layer");
  if (!layer || typeof depots === "undefined") return;
  layer.innerHTML = "";
  depots.forEach((depot) => {
    if (typeof depot.gridX !== "number") return;
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "depot-marker");
    g.setAttribute("transform", `translate(${depot.gridX}, ${depot.gridY})`);
    g.innerHTML = '<path d="M 0,-8 L 7,6 L -7,6 Z" class="depot-triangle"></path>';

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "depot-label");
    label.setAttribute("y", "18");
    label.textContent = depot.name;
    g.appendChild(label);

    g.addEventListener("mouseenter", () => showMapTooltip({ name: depot.name, hazardTag: "Resource depot", stressIndex: null }));
    g.addEventListener("mousemove", positionMapTooltip);
    g.addEventListener("mouseleave", hideMapTooltip);
    layer.appendChild(g);
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
  const container = document.getElementById("hazard-markers");
  if (!container) return;
  container.innerHTML = "";
  const emptyState = document.querySelector(".map-empty-state");
  if (emptyState) emptyState.hidden = true;
  updateMapInfo(scenario);

  const incidents = typeof scenarios !== "undefined" && scenarios.length ? scenarios : [scenario];

  incidents.forEach((incident) => {
    if (typeof incident.gridX !== "number") return;
    const isActive = incident.id === scenario.id;
    const isCritical = incident.stressIndex >= 85;

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "hazard-marker" + (isActive ? " active" : ""));
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", incident.name);
    g.setAttribute("transform", `translate(${incident.gridX}, ${incident.gridY})`);

    [0, 1, 2].forEach((i) => {
      const ring = document.createElementNS(SVG_NS, "circle");
      ring.setAttribute("class", "hazard-ring-svg ring-" + i + (isCritical ? " critical" : ""));
      ring.setAttribute("r", "5");
      g.appendChild(ring);
    });
    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("class", "hazard-core-svg" + (isCritical ? " critical" : ""));
    core.setAttribute("r", "3.4");
    g.appendChild(core);

    g.addEventListener("mouseenter", () => showMapTooltip(incident));
    g.addEventListener("mousemove", positionMapTooltip);
    g.addEventListener("mouseleave", hideMapTooltip);
    g.addEventListener("click", () => {
      if (typeof selectScenario === "function") selectScenario(incident.id);
    });
    g.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (typeof selectScenario === "function") selectScenario(incident.id);
      }
    });

    container.appendChild(g);
  });

  centerOnScenario(scenario);
}

// ---- Asset marker + deployment route ------------------------------------------

function nearestDepotTo(scenario) {
  if (typeof depots === "undefined" || !depots.length || typeof scenario.gridX !== "number") return null;
  let best = null;
  let bestDist = Infinity;
  depots.forEach((depot) => {
    if (typeof depot.gridX !== "number") return;
    const dx = depot.gridX - scenario.gridX;
    const dy = depot.gridY - scenario.gridY;
    const dist = dx * dx + dy * dy;
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

function drawAssetTrail(startX, startY, controlX, controlY, targetX, targetY) {
  const layer = document.getElementById("asset-trail-layer");
  if (!layer) return;
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`);
  path.setAttribute("class", "asset-trail-path");
  layer.appendChild(path);
  setTimeout(() => path.remove(), 2200);
}

function drawDeploymentRoute(startX, startY, controlX, controlY, targetX, targetY) {
  const route = document.getElementById("deployment-route-path");
  if (!route) return;
  route.setAttribute("d", `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`);
}

function setAssetIcon(asset, assetType) {
  asset.innerHTML = `<svg x="-15" y="-12" width="30" height="24" viewBox="0 0 32 24">${ASSET_ICON_PATHS[assetType] || ASSET_ICON_PATHS.ground}</svg>`;
}

function moveAssetToScenario(scenario, finalAssetType = scenario.assetType) {
  const asset = document.getElementById("asset-marker");
  if (!asset || typeof scenario.gridX !== "number") return;
  const origin = nearestDepotTo(scenario) || { gridX: scenario.gridX - 60, gridY: scenario.gridY - 60 };
  const startX = origin.gridX;
  const startY = origin.gridY;
  const targetX = scenario.gridX;
  const targetY = scenario.gridY;
  const controlX = (startX + targetX) / 2 + (targetY - startY) * 0.18;
  const controlY = (startY + targetY) / 2 - (targetX - startX) * 0.18;

  setAssetIcon(asset, finalAssetType);
  asset.removeAttribute("hidden");
  asset.classList.add("moving");
  drawAssetTrail(startX, startY, controlX, controlY, targetX, targetY);
  drawDeploymentRoute(startX, startY, controlX, controlY, targetX, targetY);

  const started = performance.now();
  function animateAsset(now) {
    const progress = Math.min(1, (now - started) / 1400);
    const eased = 1 - Math.pow(1 - progress, 3);
    const x = quadraticPoint(startX, controlX, targetX, eased);
    const y = quadraticPoint(startY, controlY, targetY, eased);
    asset.setAttribute("transform", `translate(${x}, ${y})`);
    if (progress < 1) requestAnimationFrame(animateAsset);
    else asset.classList.remove("moving");
  }
  requestAnimationFrame(animateAsset);
}

function resetAssetPosition() {
  const asset = document.getElementById("asset-marker");
  if (asset) {
    asset.setAttribute("hidden", "");
    asset.classList.remove("moving");
    asset.innerHTML = "";
  }
  const route = document.getElementById("deployment-route-path");
  if (route) route.setAttribute("d", "");
  const trailLayer = document.getElementById("asset-trail-layer");
  if (trailLayer) trailLayer.innerHTML = "";
}

function restoreDeployedAsset(scenario, finalAssetType = scenario.assetType) {
  const asset = document.getElementById("asset-marker");
  if (!asset || typeof scenario.gridX !== "number") return;
  const origin = nearestDepotTo(scenario) || { gridX: scenario.gridX - 60, gridY: scenario.gridY - 60 };
  const startX = origin.gridX;
  const startY = origin.gridY;
  const targetX = scenario.gridX;
  const targetY = scenario.gridY;
  const controlX = (startX + targetX) / 2 + (targetY - startY) * 0.18;
  const controlY = (startY + targetY) / 2 - (targetX - startX) * 0.18;

  setAssetIcon(asset, finalAssetType);
  asset.removeAttribute("hidden");
  asset.setAttribute("transform", `translate(${targetX}, ${targetY})`);
  drawDeploymentRoute(startX, startY, controlX, controlY, targetX, targetY);
}

setupMapControls();
