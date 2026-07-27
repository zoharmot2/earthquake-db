const DATA_FILES = Object.freeze({
  sites: "./data/v_sites_geo.csv",
  events: "./data/v_events_dst_reliable.csv",
  damage: "./data/v_damage_dst_reliable.csv",
  environmental: "./data/v_env_effects_dst_reliable.csv",
});

const REQUIRED_COLUMNS = Object.freeze({
  sites: ["GlobalID", "SITE_NAME", "POINT_X", "POINT_Y"],
  events: ["Id", "Full_Date"],
  damage: ["Id", "Sites_GlobalID", "Event_Id"],
  environmental: ["Id", "Sites_GlobalID", "Event_Id"],
});

function key(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberOrNull(value) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadCsv(url) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}v=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }

  const parsed = Papa.parse(await response.text(), {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length) {
    const details = parsed.errors.slice(0, 8)
      .map((error) => `row ${error.row ?? "?"}: ${error.message}`)
      .join("; ");
    throw new Error(`CSV parsing failed for ${url}: ${details}`);
  }

  return parsed.data;
}

function requireColumns(name, rows) {
  if (!rows.length) throw new Error(`${name} contains no records.`);
  const available = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_COLUMNS[name].filter((column) => !available.has(column));
  if (missing.length) {
    throw new Error(`${name} is missing required columns: ${missing.join(", ")}`);
  }
}

function uniqueIndex(rows, field, name) {
  const index = new Map();
  const duplicates = [];
  const missing = [];

  rows.forEach((row, arrayIndex) => {
    const value = key(row[field]);
    if (!value) {
      missing.push({ csvRow: arrayIndex + 2, row });
      return;
    }
    if (index.has(value)) {
      duplicates.push({ value, first: index.get(value), duplicate: row });
      return;
    }
    index.set(value, row);
  });

  if (duplicates.length) {
    throw new Error(`${name} contains duplicate ${field} values.`);
  }

  return { index, missing };
}

function enrichRecords(rows, layerName, siteIndex, eventIndex) {
  const records = [];
  const unlinkedSites = [];
  const unlinkedEvents = [];

  rows.forEach((row, arrayIndex) => {
    const siteGlobalId = key(row.Sites_GlobalID);
    const eventId = key(row.Event_Id);
    const site = siteIndex.get(siteGlobalId) ?? null;
    const event = eventId ? eventIndex.get(eventId) ?? null : null;

    if (!site) {
      unlinkedSites.push({
        csvRow: arrayIndex + 2,
        recordId: key(row.Id),
        siteGlobalId,
      });
    }

    if (!event) {
      unlinkedEvents.push({
        csvRow: arrayIndex + 2,
        recordId: key(row.Id),
        eventId,
      });
    }

    records.push({
      ...row,
      _layer: layerName,
      _siteGlobalId: siteGlobalId,
      _eventId: eventId,
      _site: site,
      _event: event,
      _siteLinked: Boolean(site),
      _eventLinked: Boolean(event),
    });
  });

  return { records, unlinkedSites, unlinkedEvents };
}

function chronologicalSort(a, b) {
  const aOrder = numberOrNull(a.Order_Date ?? a.Numeric_Date);
  const bOrder = numberOrNull(b.Order_Date ?? b.Numeric_Date);

  if (aOrder !== null && bOrder !== null) return aOrder - bOrder;
  if (aOrder !== null) return -1;
  if (bOrder !== null) return 1;
  return String(a.Full_Date ?? "").localeCompare(String(b.Full_Date ?? ""));
}

function groupBySite(records) {
  const groups = new Map();

  records.forEach((record) => {
    if (!record._siteLinked) return;

    if (!groups.has(record._siteGlobalId)) {
      groups.set(record._siteGlobalId, {
        siteGlobalId: record._siteGlobalId,
        site: record._site,
        records: [],
      });
    }

    groups.get(record._siteGlobalId).records.push(record);
  });

  groups.forEach((group) => group.records.sort(chronologicalSort));
  return groups;
}

export async function loadEarthquakeDatabase() {
  if (typeof Papa === "undefined") {
    throw new Error("Papa Parse is not available.");
  }

  const [sites, events, damage, environmental] = await Promise.all([
    loadCsv(DATA_FILES.sites),
    loadCsv(DATA_FILES.events),
    loadCsv(DATA_FILES.damage),
    loadCsv(DATA_FILES.environmental),
  ]);

  requireColumns("sites", sites);
  requireColumns("events", events);
  requireColumns("damage", damage);
  requireColumns("environmental", environmental);

  const siteResult = uniqueIndex(sites, "GlobalID", "v_sites_geo.csv");
  const eventResult = uniqueIndex(events, "Id", "v_events_dst_reliable.csv");

  const damageResult = enrichRecords(
    damage, "damage", siteResult.index, eventResult.index
  );
  const environmentalResult = enrichRecords(
    environmental, "environmental", siteResult.index, eventResult.index
  );

  const damageGroups = groupBySite(damageResult.records);
  const environmentalGroups = groupBySite(environmentalResult.records);

  return {
    raw: { sites, events, damage, environmental },
    indexes: {
      sitesByGlobalId: siteResult.index,
      eventsById: eventResult.index,
    },
    layers: {
      damage: damageGroups,
      environmental: environmentalGroups,
    },
    report: {
      counts: {
        sites: sites.length,
        events: events.length,
        damageRecords: damage.length,
        environmentalRecords: environmental.length,
        damageSites: damageGroups.size,
        environmentalSites: environmentalGroups.size,
        damageUnlinkedEvents: damageResult.unlinkedEvents.length,
        environmentalUnlinkedEvents: environmentalResult.unlinkedEvents.length,
      },
      issues: {
        sitesMissingGlobalId: siteResult.missing,
        eventsMissingId: eventResult.missing,
        damageUnlinkedSites: damageResult.unlinkedSites,
        environmentalUnlinkedSites: environmentalResult.unlinkedSites,
        damageUnlinkedEvents: damageResult.unlinkedEvents,
        environmentalUnlinkedEvents: environmentalResult.unlinkedEvents,
      },
    },
  };
}
