const DATA_FILES = Object.freeze({
  sites: "./data/v_sites_geo.csv",
  events: "./data/v_events_dst.csv",
  damage: "./data/v_damage_dst_unified.csv",
  environmental: "./data/v_env_effects_dst_unified.csv",
});

const REQUIRED_COLUMNS = Object.freeze({
  sites: ["GlobalID", "SITE_NAME", "POINT_X", "POINT_Y"],
  events: ["Id", "Full_Date"],
  damage: ["Id", "Sites_GlobalID", "Event_Id", "Rel"],
  environmental: ["Id", "Sites_GlobalID", "Event_Id", "Rel"],
});

const key = (value) => value == null ? "" : String(value).trim();
const numberOrNull = (value) => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

async function loadCsv(url) {
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  const parsed = Papa.parse(await response.text(), {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length) {
    const details = parsed.errors.slice(0, 8).map((e) => `row ${e.row ?? "?"}: ${e.message}`).join("; ");
    throw new Error(`CSV parsing failed for ${url}: ${details}`);
  }
  return parsed.data;
}

function requireColumns(name, rows) {
  if (!rows.length) throw new Error(`${name} contains no records.`);
  const available = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_COLUMNS[name].filter((column) => !available.has(column));
  if (missing.length) throw new Error(`${name} is missing required columns: ${missing.join(", ")}`);
}

function uniqueIndex(rows, field, name) {
  const index = new Map();
  for (const row of rows) {
    const value = key(row[field]);
    if (!value) continue;
    if (index.has(value)) throw new Error(`${name} contains duplicate ${field}: ${value}`);
    index.set(value, row);
  }
  return index;
}

function enrichRecords(rows, layerName, siteIndex, eventIndex) {
  const unlinkedSites = [];
  const unlinkedEvents = [];
  const records = rows.map((row, arrayIndex) => {
    const siteGlobalId = key(row.Sites_GlobalID);
    const eventId = key(row.Event_Id);
    const site = siteIndex.get(siteGlobalId) ?? null;
    const event = eventIndex.get(eventId) ?? null;
    if (!site) unlinkedSites.push({ csvRow: arrayIndex + 2, recordId: key(row.Id), siteGlobalId });
    if (!event) unlinkedEvents.push({ csvRow: arrayIndex + 2, recordId: key(row.Id), eventId });
    return { ...row, _layer: layerName, _siteGlobalId: siteGlobalId, _eventId: eventId, _site: site, _event: event };
  });
  return { records, unlinkedSites, unlinkedEvents };
}

function chronologicalSort(a, b) {
  const av = numberOrNull(a.Order_Date ?? a.Numeric_Date ?? a._event?.Order_Date);
  const bv = numberOrNull(b.Order_Date ?? b.Numeric_Date ?? b._event?.Order_Date);
  if (av !== null && bv !== null) return av - bv;
  if (av !== null) return -1;
  if (bv !== null) return 1;
  return String(a.Full_Date ?? "").localeCompare(String(b.Full_Date ?? ""));
}

function groupBySite(records) {
  const groups = new Map();
  for (const record of records) {
    if (!record._site) continue;
    if (!groups.has(record._siteGlobalId)) {
      groups.set(record._siteGlobalId, { siteGlobalId: record._siteGlobalId, site: record._site, records: [] });
    }
    groups.get(record._siteGlobalId).records.push(record);
  }
  groups.forEach((group) => group.records.sort(chronologicalSort));
  return groups;
}

export async function loadEarthquakeDatabase() {
  if (typeof Papa === "undefined") throw new Error("Papa Parse is not available.");
  const [sites, events, damage, environmental] = await Promise.all([
    loadCsv(DATA_FILES.sites), loadCsv(DATA_FILES.events), loadCsv(DATA_FILES.damage), loadCsv(DATA_FILES.environmental),
  ]);
  requireColumns("sites", sites); requireColumns("events", events);
  requireColumns("damage", damage); requireColumns("environmental", environmental);

  const siteIndex = uniqueIndex(sites, "GlobalID", "v_sites_geo.csv");
  const eventIndex = uniqueIndex(events, "Id", "v_events_dst.csv");
  const damageResult = enrichRecords(damage, "damage", siteIndex, eventIndex);
  const environmentalResult = enrichRecords(environmental, "environmental", siteIndex, eventIndex);

  if (damageResult.unlinkedSites.length || environmentalResult.unlinkedSites.length) {
    throw new Error("One or more effect records could not be linked to a site.");
  }
  if (damageResult.unlinkedEvents.length || environmentalResult.unlinkedEvents.length) {
    throw new Error("One or more effect records could not be linked to an earthquake event.");
  }

  const damageGroups = groupBySite(damageResult.records);
  const environmentalGroups = groupBySite(environmentalResult.records);
  return {
    raw: { sites, events, damage, environmental },
    layers: { damage: damageGroups, environmental: environmentalGroups },
    report: { counts: {
      sites: sites.length, events: events.length,
      damageRecords: damage.length, environmentalRecords: environmental.length,
      damageSites: damageGroups.size, environmentalSites: environmentalGroups.size,
    }},
  };
}
