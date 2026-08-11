const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const present = (value) => value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim().toUpperCase() !== "NULL";
const display = (value) => present(value) ? escapeHtml(value) : "—";
const confidenceDisplay = (value) => ["U","UNKNOWN"].includes(String(value ?? "").trim().toUpperCase()) ? "Unknown" : display(value);

function safeHttpUrl(value) {
  const raw = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}
function renderLinksValue(value) {
  if (!present(value)) return "—";
  const parts = String(value).split(/\s*;\s*/).filter(Boolean);
  return parts.map((part) => {
    const url = safeHttpUrl(part);
    return url ? `<a class="popup-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(part)}</a>` : escapeHtml(part);
  }).join("; ");
}

function coordinateText(site) {
  const lng = Number(site.POINT_X);
  const lat = Number(site.POINT_Y);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "Coordinates unavailable";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function rows(record, fields) {
  return fields.map(([label, field]) => {
    const isConfidence = field === "Rel";
    const isSeverity = field === "Damage_Val" || field === "ESI_Val";
    const value = field === "Links" ? renderLinksValue(record[field]) : isConfidence || isSeverity ? confidenceDisplay(record[field]) : display(record[field]);
    return `<div class="popup-field${isConfidence ? " popup-field-confidence" : ""}">
      <dt>${escapeHtml(label)}</dt><dd>${value}</dd>
    </div>`;
  }).join("");
}

function eventKey(record) { return String(record.Event_Id ?? "").trim(); }

function groupByEvent(records) {
  const groups = new Map();
  for (const record of records) {
    const key = eventKey(record);
    if (!groups.has(key)) groups.set(key, { event: record._event, records: [] });
    groups.get(key).records.push(record);
  }
  return [...groups.values()];
}

const DAMAGE_FIELDS = [
  ["Confidence", "Rel"], ["Damage", "Damage_Val"], ["Casualties class", "Causalties_Val"],
  ["EMS-98", "EMS98_Value"], ["MSK", "MSK_Value"], ["Other intensity", "Other_Intensity"],
  ["Total buildings", "Total_Bld"], ["Damaged buildings", "Damaged_Bld"], ["Total population", "Total_Pop"],
  ["Casualties", "Casualties"], ["Injuries", "Injuries"], ["Description", "Description"],
  ["References", "Refrences"], ["Links", "Links"],
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
  return `<section class="earthquake-group">
    <h4 class="earthquake-date">${display(date)}</h4>
    <div class="earthquake-group-body">
      ${group.records.map((record, index) => renderRecord(record, fields, index, group.records.length)).join("")}
    </div>
  </section>`;
}

export function renderSitePopup(group, layerName, records) {
  const siteName = group.site.SITE_NAME || group.site.S_NAME || "Unnamed site";
  const events = groupByEvent(records);
  return `<div class="popup-header">
      <h3>${display(siteName)}</h3>
      <p class="popup-coordinates">${coordinateText(group.site)}</p>
    </div>
    <div class="popup-body">${events.map((event) => renderEventGroup(event, layerName)).join("")}</div>`;
}

export function renderDamageTooltip(group, records) {
  const siteName = group.site.SITE_NAME || group.site.S_NAME || "Unnamed site";
  const references = [...new Set(records.map((record) => String(record.Refrences ?? "").trim()).filter((value) => value && value.toUpperCase() !== "NULL"))];
  const links = [...new Set(records.map((record) => String(record.Links ?? "").trim()).filter((value) => value && value.toUpperCase() !== "NULL"))];
  const countText = `${records.length} damage occurrence${records.length === 1 ? "" : "s"}`;
  return `<div class="damage-tooltip">
    <strong>${display(siteName)}</strong>
    <span>${escapeHtml(countText)}</span>
    <span><b>References:</b> ${references.length ? references.map(escapeHtml).join("; ") : "—"}</span>
    <span><b>Links:</b> ${links.length ? links.map(renderLinksValue).join("; ") : "—"}</span>
  </div>`;
}
