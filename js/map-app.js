import { loadEarthquakeDatabase } from "./data-loader.js";
import { renderSitePopup } from "./popup-renderer.js";

const INITIAL_VIEW = Object.freeze({
  center: [31.7, 35.3],
  zoom: 6,
});

const COLORS = Object.freeze({
  damage: "#b64926",
  environmental: "#277a6b",
});

const state = {
  database: null,
  map: null,
  layers: {
    damage: L.layerGroup(),
    environmental: L.layerGroup(),
  },
  markers: {
    damage: new Map(),
    environmental: new Map(),
  },
  filter: "all",
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

function markerRadius(count) {
  return Math.max(6, Math.min(15, 6 + Math.log2(Math.max(count, 1)) * 1.7));
}

function makeMarker(group, layerName, records) {
  const latLng = coordinates(group.site);
  if (!latLng || records.length === 0) return null;

  const marker = L.circleMarker(latLng, {
    radius: markerRadius(records.length),
    color: "#ffffff",
    weight: 1.5,
    fillColor: COLORS[layerName],
    fillOpacity: 0.86,
  });

  marker.bindTooltip(
    `${group.site.SITE_NAME || "Unnamed site"} · ${records.length} record${records.length === 1 ? "" : "s"}`,
    { direction: "top", offset: [0, -5] }
  );

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
}

function updateVisibleSummary() {
  const damageMarkers = state.markers.damage.size;
  const environmentalMarkers = state.markers.environmental.size;
  elements.visibleSummary.textContent =
    `Visible markers: ${damageMarkers} damage and ${environmentalMarkers} environmental.`;
}

function setLayerVisibility(layerName, visible) {
  const layer = state.layers[layerName];
  if (visible && !state.map.hasLayer(layer)) {
    layer.addTo(state.map);
  } else if (!visible && state.map.hasLayer(layer)) {
    state.map.removeLayer(layer);
  }
}

function allVisibleMarkers() {
  const markers = [];
  if (elements.damageToggle.checked) {
    markers.push(...state.markers.damage.values());
  }
  if (elements.environmentalToggle.checked) {
    markers.push(...state.markers.environmental.values());
  }
  return markers;
}

function fitVisibleMarkers() {
  const markers = allVisibleMarkers();
  if (!markers.length) {
    state.map.setView(INITIAL_VIEW.center, INITIAL_VIEW.zoom);
    return;
  }

  const group = L.featureGroup(markers);
  const bounds = group.getBounds();
  if (bounds.isValid()) state.map.fitBounds(bounds.pad(0.08));
}

function populateSummary() {
  const counts = state.database.report.counts;
  elements.damageSiteCount.textContent = counts.damageSites.toLocaleString();
  elements.environmentalSiteCount.textContent =
    counts.environmentalSites.toLocaleString();
  elements.damageRecordCount.textContent =
    counts.damageRecords.toLocaleString();
  elements.environmentalRecordCount.textContent =
    counts.environmentalRecords.toLocaleString();
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
    button.textContent =
      `${item.name} (${item.layers.map((layer) =>
        layer === "damage" ? "damage" : "environmental"
      ).join(", ")})`;

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
  const preferredOrder = ["damage", "environmental"];
  for (const layerName of preferredOrder) {
    const marker = state.markers[layerName].get(item.siteGlobalId);
    if (!marker) continue;

    if (layerName === "damage") {
      elements.damageToggle.checked = true;
    } else {
      elements.environmentalToggle.checked = true;
    }
    setLayerVisibility(layerName, true);

    state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 9), {
      animate: true,
    });
    marker.openPopup();
    return;
  }

  showStatus("This site has no visible records under the current filter.");
}

function addMapLegend() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "leaflet-control leaflet-bar");
    div.style.background = "white";
    div.style.padding = "8px 10px";
    div.style.lineHeight = "1.55";
    div.style.fontSize = "12px";
    div.innerHTML = `
      <strong>Layers</strong><br>
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS.damage};margin-right:6px"></span>Earthquake Damage<br>
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS.environmental};margin-right:6px"></span>Environmental Effects
    `;
    return div;
  };

  legend.addTo(state.map);
}

function initializeMap() {
  state.map = L.map("map", {
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    zoomControl: true,
    preferCanvas: true,
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(state.map);

  state.layers.damage.addTo(state.map);
  state.layers.environmental.addTo(state.map);
  L.control.scale({ imperial: false }).addTo(state.map);
  addMapLegend();
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

  elements.siteSearch.addEventListener("input", (event) => {
    renderSearchResults(event.target.value);
  });

  elements.searchButton.addEventListener("click", () => {
    renderSearchResults(elements.siteSearch.value);
  });

  elements.siteSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderSearchResults(elements.siteSearch.value);
    }
    if (event.key === "Escape") {
      elements.searchResults.classList.remove("active");
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-row") &&
        !event.target.closest(".search-results")) {
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
    fitVisibleMarkers();
  });

  elements.aboutButton.addEventListener("click", () => {
    elements.aboutDialog.showModal();
  });
}

async function start() {
  try {
    initializeMap();
    bindControls();

    state.database = await loadEarthquakeDatabase();

    const issues = state.database.report.issues;
    if (issues.damageUnlinkedSites.length ||
        issues.environmentalUnlinkedSites.length) {
      throw new Error(
        "One or more effect records could not be linked to a site."
      );
    }

    rebuildAllLayers();
    populateSummary();
    fitVisibleMarkers();

    const counts = state.database.report.counts;
    elements.loading.classList.add("hidden");

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
