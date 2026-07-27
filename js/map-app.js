import { loadEarthquakeDatabase } from "./data-loader.js";
import { renderSitePopup } from "./popup-renderer.js";

const INITIAL_BOUNDS = L.latLngBounds(
  [28.7, 32.0],
  [37.8, 39.5]
);

const DAMAGE_LEVELS = Object.freeze({
  "": 0,
  "U": 0,
  "Felt": 1,
  "Light": 2,
  "Moderate": 3,
  "Heavy": 4,
  "Severe": 5,
});

const DAMAGE_RADII = Object.freeze({
  0: 5,
  1: 6,
  2: 8,
  3: 10,
  4: 13,
  5: 16,
});

const ENV_COLORS = Object.freeze({
  AC: "#7f3c8d",
  CS: "#11a579",
  DR: "#3969ac",
  GB: "#f2b701",
  GC: "#e73f74",
  GE: "#80ba5a",
  LD: "#e68310",
  LQ: "#008695",
  RF: "#cf1c90",
  SF: "#f97b72",
  SW: "#4b4b8f",
  WC: "#a5aa99",
  WO: "#6f4e7c",
  U: "#8c8c8c",
  "": "#8c8c8c",
});

const ENV_LABELS = Object.freeze({
  AC: "AC",
  CS: "CS",
  DR: "DR",
  GB: "GB — Ground breakage",
  GC: "GC — Ground breakage",
  GE: "GE — Gas exhalation",
  LD: "LD — Slope stability",
  LQ: "LQ — Liquefaction-related",
  RF: "RF",
  SF: "SF",
  SW: "SW — Sea phenomena",
  WC: "WC",
  WO: "WO",
  U: "U — Unknown",
  "": "Unknown",
});

const state = {
  database: null,
  map: null,
  baseLayers: {},
  layers: {
    damage: L.layerGroup(),
    environmental: L.layerGroup(),
  },
  markers: {
    damage: new Map(),
    environmental: new Map(),
  },
  filter: "all",
  legend: null,
};

const elements = {
  loading: document.querySelector("#loading-overlay"),
  status: document.querySelector("#status-message"),
  damageToggle: document.querySelector("#damage-toggle"),
  environmentalToggle: document.querySelector("#environmental-toggle"),
  linkFilter: document.querySelector("#link-filter"),
  siteSearch: document.querySelector("#site-search"),
  searchButton: document.querySelector("#search-button"),
  searchResults: document.querySelector("#search-results"),
  resetButton: document.querySelector("#reset-button"),
  aboutButton: document.querySelector("#about-button"),
  aboutDialog: document.querySelector("#about-dialog"),
  damageSiteCount: document.querySelector("#damage-site-count"),
  environmentalSiteCount: document.querySelector("#environmental-site-count"),
  damageRecordCount: document.querySelector("#damage-record-count"),
  environmentalRecordCount: document.querySelector("#environmental-record-count"),
  visibleSummary: document.querySelector("#visible-summary"),
};

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.add("visible");
  elements.status.classList.toggle("error", isError);
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(
    () => elements.status.classList.remove("visible"),
    isError ? 9000 : 4500
  );
}

function coordinates(site) {
  const lng = Number(site.POINT_X);
  const lat = Number(site.POINT_Y);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function recordsForFilter(records) {
  if (state.filter === "linked") {
    return records.filter((record) => record._eventLinked);
  }
  if (state.filter === "unlinked") {
    return records.filter((record) => !record._eventLinked);
  }
  return records;
}

function damageLevel(records) {
  return records.reduce((maximum, record) => {
    const label = String(record.Damage_Val ?? "").trim();
    return Math.max(maximum, DAMAGE_LEVELS[label] ?? 0);
  }, 0);
}

function damageLabel(level) {
  return ["Unknown", "Felt", "Light", "Moderate", "Heavy", "Severe"][level] ?? "Unknown";
}

function parseEsi(value) {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "unknown") return null;
  const numbers = text.match(/\d+(?:\.\d+)?/g);
  if (!numbers?.length) return null;
  return Math.max(...numbers.map(Number).filter(Number.isFinite));
}

function maximumEsi(records) {
  const values = records.map((record) => parseEsi(record.ESI_Val))
    .filter((value) => value !== null);
  return values.length ? Math.max(...values) : null;
}

function environmentalSize(esi) {
  if (esi === null) return 20;
  if (esi <= 6) return 22;
  if (esi <= 7) return 26;
  if (esi <= 8) return 30;
  if (esi <= 9) return 34;
  if (esi <= 10) return 38;
  return 42;
}

function effectTypes(records) {
  const types = new Set(
    records.map((record) => String(record.Env_Eff ?? "").trim() || "U")
  );
  return [...types].sort();
}

function pieSvg(types, size) {
  const radius = size / 2;
  const center = radius;
  const sliceCount = Math.max(types.length, 1);

  if (sliceCount === 1) {
    const color = ENV_COLORS[types[0]] ?? ENV_COLORS.U;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="2"
            fill="${color}" stroke="#fff" stroke-width="2"/>
    </svg>`;
  }

  const innerSize = size - 4;
  const segmentWidth = innerSize / sliceCount;
  const segments = types.map((type, index) => {
    const color = ENV_COLORS[type] ?? ENV_COLORS.U;
    const x = 2 + index * segmentWidth;
    const width = index === sliceCount - 1
      ? innerSize - index * segmentWidth
      : segmentWidth;
    return `<rect x="${x}" y="2" width="${width}" height="${innerSize}" fill="${color}"/>`;
  }).join("");

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    ${segments}
    <rect x="2" y="2" width="${innerSize}" height="${innerSize}" rx="2"
          fill="none" stroke="#fff" stroke-width="2"/>
  </svg>`;
}

function makeEnvironmentalIcon(records) {
  const esi = maximumEsi(records);
  const size = environmentalSize(esi);
  const types = effectTypes(records);
  return L.divIcon({
    className: "environmental-div-icon",
    html: pieSvg(types, size),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function makeMarker(group, layerName, records) {
  const latLng = coordinates(group.site);
  if (!latLng || records.length === 0) return null;

  let marker;
  if (layerName === "damage") {
    const level = damageLevel(records);
    marker = L.circleMarker(latLng, {
      radius: DAMAGE_RADII[level],
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#b64926",
      fillOpacity: 0.86,
    });
    marker.bindTooltip(
      `${group.site.SITE_NAME || "Unnamed site"} · ${records.length} record${records.length === 1 ? "" : "s"} · Maximum damage: ${damageLabel(level)}`,
      { direction: "top", offset: [0, -5] }
    );
  } else {
    const esi = maximumEsi(records);
    const types = effectTypes(records);
    marker = L.marker(latLng, { icon: makeEnvironmentalIcon(records) });
    marker.bindTooltip(
      `${group.site.SITE_NAME || "Unnamed site"} · ${records.length} record${records.length === 1 ? "" : "s"} · Maximum ESI: ${esi ?? "Unknown"} · Types: ${types.join(", ")}`,
      { direction: "top", offset: [0, -8] }
    );
  }

  marker.bindPopup(renderSitePopup(group, layerName, records), {
    maxWidth: 420,
    minWidth: 300,
  });

  marker._siteGlobalId = group.siteGlobalId;
  marker._layerName = layerName;
  return marker;
}

function rebuildLayer(layerName) {
  const layer = state.layers[layerName];
  const groups = state.database.layers[layerName];
  const markerIndex = state.markers[layerName];

  layer.clearLayers();
  markerIndex.clear();

  groups.forEach((group) => {
    const records = recordsForFilter(group.records);
    const marker = makeMarker(group, layerName, records);
    if (!marker) return;
    marker.addTo(layer);
    markerIndex.set(group.siteGlobalId, marker);
  });
}

function rebuildAllLayers() {
  rebuildLayer("damage");
  rebuildLayer("environmental");
  updateVisibleSummary();
  updateLegend();
}

function updateVisibleSummary() {
  elements.visibleSummary.textContent =
    `Visible markers: ${state.markers.damage.size} damage and ${state.markers.environmental.size} environmental.`;
}

function setLayerVisibility(layerName, visible) {
  const layer = state.layers[layerName];
  if (visible && !state.map.hasLayer(layer)) layer.addTo(state.map);
  if (!visible && state.map.hasLayer(layer)) state.map.removeLayer(layer);
  updateLegend();
}

function allVisibleMarkers() {
  const markers = [];
  if (elements.damageToggle.checked) markers.push(...state.markers.damage.values());
  if (elements.environmentalToggle.checked) markers.push(...state.markers.environmental.values());
  return markers;
}

function fitInitialBounds() {
  state.map.fitBounds(INITIAL_BOUNDS, { padding: [15, 15] });
}

function populateSummary() {
  const counts = state.database.report.counts;
  elements.damageSiteCount.textContent = counts.damageSites.toLocaleString();
  elements.environmentalSiteCount.textContent = counts.environmentalSites.toLocaleString();
  elements.damageRecordCount.textContent = counts.damageRecords.toLocaleString();
  elements.environmentalRecordCount.textContent = counts.environmentalRecords.toLocaleString();
}

function siteSearchIndex() {
  const index = new Map();
  for (const layerName of ["damage", "environmental"]) {
    state.database.layers[layerName].forEach((group) => {
      const current = index.get(group.siteGlobalId) ?? {
        siteGlobalId: group.siteGlobalId,
        name: group.site.SITE_NAME || "Unnamed site",
        layers: [],
      };
      if (!current.layers.includes(layerName)) current.layers.push(layerName);
      index.set(group.siteGlobalId, current);
    });
  }
  return [...index.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderSearchResults(query) {
  const normalized = query.trim().toLowerCase();
  elements.searchResults.replaceChildren();
  if (!normalized) {
    elements.searchResults.classList.remove("active");
    return;
  }

  const results = siteSearchIndex()
    .filter((item) => item.name.toLowerCase().includes(normalized))
    .slice(0, 20);

  if (!results.length) {
    const message = document.createElement("div");
    message.className = "search-result";
    message.textContent = "No matching sites";
    elements.searchResults.append(message);
    elements.searchResults.classList.add("active");
    return;
  }

  results.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.setAttribute("role", "option");
    button.textContent = `${item.name} (${item.layers.join(", ")})`;
    button.addEventListener("click", () => {
      focusSite(item);
      elements.searchResults.classList.remove("active");
      elements.siteSearch.value = item.name;
    });
    elements.searchResults.append(button);
  });
  elements.searchResults.classList.add("active");
}

function focusSite(item) {
  for (const layerName of ["damage", "environmental"]) {
    const marker = state.markers[layerName].get(item.siteGlobalId);
    if (!marker) continue;
    if (layerName === "damage") elements.damageToggle.checked = true;
    else elements.environmentalToggle.checked = true;
    setLayerVisibility(layerName, true);
    state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 9), { animate: true });
    marker.openPopup();
    return;
  }
  showStatus("This site has no visible records under the current filter.");
}

function damageLegendHtml() {
  const items = [
    [1, "Felt"], [2, "Light"], [3, "Moderate"], [4, "Heavy"], [5, "Severe"]
  ].map(([level, label]) => `
    <div class="legend-row">
      <span class="legend-circle" style="width:${DAMAGE_RADII[level]*2}px;height:${DAMAGE_RADII[level]*2}px"></span>
      <span>${label}</span>
    </div>`).join("");

  return `<section class="legend-section">
    <strong>Earthquake Damage</strong>
    <small>Circle size: highest Damage_Val at site</small>
    ${items}
  </section>`;
}

function environmentalLegendHtml() {
  const presentTypes = new Set();
  state.database.layers.environmental.forEach((group) => {
    recordsForFilter(group.records).forEach((record) => {
      presentTypes.add(String(record.Env_Eff ?? "").trim() || "U");
    });
  });

  const typeRows = [...presentTypes].sort().map((type) => `
    <div class="legend-row">
      <span class="legend-swatch" style="background:${ENV_COLORS[type] ?? ENV_COLORS.U}"></span>
      <span>${ENV_LABELS[type] ?? type}</span>
    </div>`).join("");

  return `<section class="legend-section">
    <strong>Environmental Effects</strong>
    <small>Square color: Env_Eff</small>
    <div class="legend-scroll">${typeRows}</div>
  </section>`;
}

function updateLegend() {
  if (!state.legend || !state.database) return;
  const container = state.legend.getContainer();
  const sections = [];
  if (elements.damageToggle.checked) sections.push(damageLegendHtml());
  if (elements.environmentalToggle.checked) sections.push(environmentalLegendHtml());
  container.innerHTML = sections.join("");
  container.style.display = sections.length ? "block" : "none";
}

function initializeMap() {
  state.map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
  });

  state.baseLayers = {
    "Light map": L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }
    ),
    "OpenStreetMap": L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }
    ),
    "Satellite": L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri and imagery contributors",
      }
    ),
  };

  state.baseLayers["OpenStreetMap"].addTo(state.map);
  state.layers.damage.addTo(state.map);
  state.layers.environmental.addTo(state.map);

  L.control.layers(state.baseLayers, null, {
    position: "topright",
    collapsed: false,
  }).addTo(state.map);

  L.control.scale({ imperial: false }).addTo(state.map);

  state.legend = L.control({ position: "bottomleft" });
  state.legend.onAdd = () => L.DomUtil.create("div", "map-legend");
  state.legend.addTo(state.map);

  fitInitialBounds();
}

function bindControls() {
  elements.damageToggle.addEventListener("change", (event) => {
    setLayerVisibility("damage", event.target.checked);
    updateVisibleSummary();
  });

  elements.environmentalToggle.addEventListener("change", (event) => {
    setLayerVisibility("environmental", event.target.checked);
    updateVisibleSummary();
  });

  elements.linkFilter.addEventListener("change", (event) => {
    state.filter = event.target.value;
    rebuildAllLayers();
    showStatus(
      state.filter === "all"
        ? "Showing all records."
        : state.filter === "linked"
          ? "Showing linked event records only."
          : "Showing records with no linked event record."
    );
  });

  elements.siteSearch.addEventListener("input", (event) => renderSearchResults(event.target.value));
  elements.searchButton.addEventListener("click", () => renderSearchResults(elements.siteSearch.value));

  elements.siteSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderSearchResults(elements.siteSearch.value);
    }
    if (event.key === "Escape") elements.searchResults.classList.remove("active");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-row") && !event.target.closest(".search-results")) {
      elements.searchResults.classList.remove("active");
    }
  });

  elements.resetButton.addEventListener("click", () => {
    state.filter = "all";
    elements.linkFilter.value = "all";
    elements.damageToggle.checked = true;
    elements.environmentalToggle.checked = true;
    setLayerVisibility("damage", true);
    setLayerVisibility("environmental", true);
    elements.siteSearch.value = "";
    elements.searchResults.classList.remove("active");
    rebuildAllLayers();
    fitInitialBounds();
  });

  elements.aboutButton.addEventListener("click", () => elements.aboutDialog.showModal());
}

async function start() {
  try {
    initializeMap();
    bindControls();
    state.database = await loadEarthquakeDatabase();

    const issues = state.database.report.issues;
    if (issues.damageUnlinkedSites.length || issues.environmentalUnlinkedSites.length) {
      throw new Error("One or more effect records could not be linked to a site.");
    }

    rebuildAllLayers();
    populateSummary();
    elements.loading.classList.add("hidden");

    const counts = state.database.report.counts;
    showStatus(
      `Loaded ${counts.damageRecords.toLocaleString()} damage records and ` +
      `${counts.environmentalRecords.toLocaleString()} environmental records.`
    );
  } catch (error) {
    elements.loading.classList.add("hidden");
    showStatus(error.message || "The map could not be loaded.", true);
    console.error(error);
  }
}

start();
