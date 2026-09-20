// FIELD DATA INGESTION ENGINE — standalone raw multi-source feed.
//
// Per the architecture doc, this sits ABOVE the Agentic Command Core and just
// collects/logs heterogeneous incoming reports (satellite, drone, weather,
// hospitals, field teams, citizen telemetry, sensors). It is intentionally
// NOT wired into needsImpactAgent.js / resourceLogisticsAgent.js /
// commandAgent.js / debateEngine.js — selecting a case and running the
// debate still works exactly the same, off scenarios.json. This file only
// renders a live-looking feed panel; it does not affect any agent's
// scoring or output.

const INGESTION_FEED = [
  {
    time: "10:02",
    source: "FIELD_TEAM",
    tag: "ALERT #89",
    message: "Bahrabise — landslide blocked Sun Kosi river. 45 severe casualties, 350 residents isolated."
  },
  {
    time: "09:55",
    source: "SATELLITE",
    tag: "RADAR SWEEP",
    message: "Dam formation detected upstream of Bahrabise. Estimated reservoir volume ~450,000 m³."
  },
  {
    time: "09:48",
    source: "FIELD_TEAM",
    tag: "TEAM 02 REPORT",
    message: "Bridge collapse confirmed at Mile 14, Arniko Highway. Alternate route via Lamosangu."
  },
  {
    time: "09:40",
    source: "WEATHER",
    tag: "FLIGHT ADVISORY",
    message: "Cloud ceiling below 300ft over Bahrabise sector — rotary-wing assets grounded until further notice."
  },
  {
    time: "09:31",
    source: "HOSPITAL",
    tag: "CAPACITY WARNING",
    message: "Dhulikhel Hospital bed capacity at 88%. Approaching overload for incoming trauma cases."
  },
  {
    time: "09:20",
    source: "DRONE",
    tag: "AERIAL TELEMETRY",
    message: "Sweep confirms Arniko Highway blocked at Mile 12 by debris field, ~40m span."
  },
  {
    time: "09:12",
    source: "CITIZEN",
    tag: "FIELD REPORT",
    message: "Resident report near Melamchi confluence: river level rising rapidly, faster than normal monsoon rate."
  }
];

function renderIngestionFeed() {
  const el = document.getElementById("ingestion-feed");
  if (!el) return;
  el.innerHTML = "";
  INGESTION_FEED.forEach((entry) => {
    const item = document.createElement("div");
    item.className = `ingestion-entry source-${entry.source.toLowerCase()}`;
    const header = document.createElement("div");
    header.className = "ingestion-entry-header";
    header.innerHTML =
      `<span class="ingestion-time">[${entry.time}]</span>` +
      `<span class="ingestion-source">${entry.source.replace("_", " ")}</span>` +
      `<span class="ingestion-tag">${entry.tag}</span>`;
    const message = document.createElement("p");
    message.className = "ingestion-message";
    message.textContent = entry.message;
    item.appendChild(header);
    item.appendChild(message);
    el.appendChild(item);
  });
}

renderIngestionFeed();
