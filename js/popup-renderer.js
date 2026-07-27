function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function value(value, fallback = "Not available") {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : fallback;
}

function eventSection(record) {
  if (!record._eventLinked) {
    return `
      <div class="event-warning">
        <strong>No linked event record</strong>
        <span>Event ID: ${value(record._eventId, "Not provided")}</span>
      </div>`;
  }

  const event = record._event;
  return `
    <dl>
      <dt>Linked event</dt>
      <dd>${value(event.Full_Date)}</dd>
      <dt>Event ID</dt>
      <dd>${value(event.Id)}</dd>
      <dt>Event type</dt>
      <dd>${value(event.Type)}</dd>
      <dt>Magnitude</dt>
      <dd>${value(event.Magnitude_Avg || event.Magnitude)}</dd>
      <dt>Region</dt>
      <dd>${value(event.Region)}</dd>
    </dl>`;
}

function recordDescription(record) {
  const description = String(record.Description ?? "").trim();
  return description
    ? `<p class="description">${escapeHtml(description)}</p>`
    : "";
}

function renderDamageRecord(record, index) {
  return `
    <article class="popup-record">
      <div class="record-number">Damage record ${index + 1}</div>
      <h4>${value(record.Full_Date, "Undated record")}</h4>
      <dl>
        <dt>Damage</dt>
        <dd>${value(record.Damage_Val || record.Damage)}</dd>
        <dt>Reliability</dt>
        <dd>${value(record.Rel)}</dd>
        <dt>Intensity</dt>
        <dd>${value(record.EMS98_Value || record.MSK_Value || record.Other_Intensity)}</dd>
        <dt>Casualties</dt>
        <dd>${value(record.Causalties_Val || record.Casualties)}</dd>
      </dl>
      ${recordDescription(record)}
      ${eventSection(record)}
    </article>`;
}

function renderEnvironmentalRecord(record, index) {
  return `
    <article class="popup-record">
      <div class="record-number">Environmental record ${index + 1}</div>
      <h4>${value(record.Full_Date, "Undated record")}</h4>
      <dl>
        <dt>Effect</dt>
        <dd>${value(record.Env_Eff_Val || record.Env_Eff)}</dd>
        <dt>Category</dt>
        <dd>${value(record.Category)}</dd>
        <dt>Reliability</dt>
        <dd>${value(record.Rel)}</dd>
        <dt>ESI value</dt>
        <dd>${value(record.ESI_Val || record.ESI_Num)}</dd>
      </dl>
      ${recordDescription(record)}
      ${eventSection(record)}
    </article>`;
}

export function renderSitePopup(group, layerName, records) {
  const siteName = value(group.site.SITE_NAME, "Unnamed site");
  const subtitle = layerName === "damage"
    ? "Earthquake Damage"
    : "Environmental Effects";

  const renderedRecords = records
    .map((record, index) =>
      layerName === "damage"
        ? renderDamageRecord(record, index)
        : renderEnvironmentalRecord(record, index)
    )
    .join("");

  return `
    <div class="popup-header">
      <h3>${siteName}</h3>
      <p>${subtitle} · ${records.length} record${records.length === 1 ? "" : "s"}</p>
    </div>
    <div class="popup-body">${renderedRecords}</div>`;
}
