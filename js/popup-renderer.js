const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const present = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const display = (value) => present(value) ? escapeHtml(value) : "—";

function coordinateText(site) {
  const lng = Number(site.POINT_X);
  const lat = Number(site.POINT_Y);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Coordinates unavailable";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function rows(record, fields) {
  return fields.map(([label, field]) => `
    <div class="popup-field">
      <dt>${escapeHtml(label)}</dt><dd>${display(record[field])}</dd>
    </div>`).join("");
}

function eventKey(record) { return String(record.Event_Id ?? "").trim(); }

function groupByEvent(records) {
  const groups = new Map();
  for (const record of records) {
    const key = eventKey(record);
    if (!groups.has(key)) groups.set(key, { eventId: key, event: record._event, records: [] });
    groups.get(key).records.push(record);
  }
  return [...groups.values()];
}

const DAMAGE_FIELDS = [
  ["Confidence", "Rel"], ["Damage", "Damage_Val"], ["Casualties class", "Causalties_Val"],
  ["EMS-98", "EMS98_Value"], ["MSK", "MSK_Value"], ["Other intensity", "Other_Intensity"],
  ["Total buildings", "Total_Bld"], ["Damaged buildings", "Damaged_Bld"], ["Total population", "Total_Pop"],
  ["Casualties", "Casualties"], ["Injuries", "Injuries"], ["Description", "Description"],
];

const ENV_FIELDS = [
  ["Confidence", "Rel"], ["Effect code", "Env_Eff"], ["Environmental effect", "Env_Eff_Val"],
  ["Category", "Category"], ["Description", "Description"], ["ESI-2007", "ESI_Val"],
];

function renderRecord(record, fields, index, count) {
  return `<article class="event-record${count > 1 ? " repeated" : ""}">
    ${count > 1 ? `<h5>Occurrence ${index + 1}</h5>` : ""}
    <dl class="popup-fields">${rows(record, fields)}</dl>
  </article>`;
}

function renderEventGroup(group, layerName) {
  const date = group.event?.Full_Date || group.records[0]?.Full_Date || "Undated earthquake";
  const fields = layerName === "damage" ? DAMAGE_FIELDS : ENV_FIELDS;
  return `<details class="earthquake-group" open>
    <summary><strong>${display(date)}</strong><span>Event ${display(group.eventId)} · ${group.records.length} occurrence${group.records.length === 1 ? "" : "s"}</span></summary>
    <div class="earthquake-group-body">
      ${group.records.map((record, index) => renderRecord(record, fields, index, group.records.length)).join("")}
    </div>
  </details>`;
}

export function renderSitePopup(group, layerName, records) {
  const siteName = group.site.SITE_NAME || group.site.S_NAME || "Unnamed site";
  const subtitle = layerName === "damage" ? "Earthquake Damage" : "Environmental Effects";
  const events = groupByEvent(records);
  return `<div class="popup-header">
      <p class="popup-layer-label">${subtitle}</p>
      <h3>${display(siteName)}</h3>
      <p class="popup-coordinates">${coordinateText(group.site)}</p>
      <div class="popup-site-meta"><span>${records.length} occurrence${records.length === 1 ? "" : "s"}</span><span>${events.length} earthquake${events.length === 1 ? "" : "s"}</span></div>
    </div>
    <div class="popup-body">${events.map((event) => renderEventGroup(event, layerName)).join("")}</div>`;
}
