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

function field(record, ...names) {
  for (const name of names) {
    const text = String(record?.[name] ?? "").trim();
    if (text) return text;
  }
  return "";
}

function detailsRows(rows) {
  return rows
    .filter(([, content]) => String(content ?? "").trim())
    .map(([label, content]) => `
      <div class="popup-field">
        <dt>${escapeHtml(label)}</dt>
        <dd>${value(content)}</dd>
      </div>`)
    .join("");
}

function eventSection(record) {
  if (!record._eventLinked) {
    return `
      <aside class="event-link event-link-unlinked" aria-label="Event linkage status">
        <span class="event-link-icon" aria-hidden="true">!</span>
        <div>
          <strong>No linked event record</strong>
          <span>Event ID: ${value(record._eventId, "Not provided")}</span>
        </div>
      </aside>`;
  }

  const event = record._event;
  return `
    <section class="event-link event-link-linked">
      <div class="event-link-title">Linked event</div>
      <dl class="popup-fields">
        ${detailsRows([
          ["Event ID", event.Id],
          ["Date", event.Full_Date],
          ["Event type", event.Type],
          ["Magnitude", field(event, "Magnitude_Avg", "Magnitude")],
          ["Region", event.Region],
        ])}
      </dl>
    </section>`;
}

function descriptionBlock(record) {
  const description = field(record, "Description");
  if (!description) return "";
  return `
    <details class="record-details">
      <summary>Show description</summary>
      <p class="description">${escapeHtml(description)}</p>
    </details>`;
}

function referencesBlock(record) {
  const reference = field(record, "Reference", "References", "Source");
  if (!reference) return "";
  return `
    <details class="record-details">
      <summary>Show source information</summary>
      <p class="description">${escapeHtml(reference)}</p>
    </details>`;
}

function renderDamageRecord(record, index) {
  const severity = field(record, "Damage_Val", "Damage") || "Not available";
  return `
    <details class="popup-record" ${index === 0 ? "open" : ""}>
      <summary>
        <span>
          <span class="record-number">Damage record ${index + 1}</span>
          <strong>${value(record.Full_Date, "Undated record")}</strong>
        </span>
        <span class="severity-badge">${value(severity)}</span>
      </summary>
      <div class="popup-record-content">
        <dl class="popup-fields">
          ${detailsRows([
            ["Damage severity", severity],
            ["Reliability", record.Rel],
            ["Intensity", field(record, "EMS98_Value", "MSK_Value", "Other_Intensity")],
            ["Casualties", field(record, "Causalties_Val", "Casualties")],
            ["Record ID", record.Id],
          ])}
        </dl>
        ${descriptionBlock(record)}
        ${referencesBlock(record)}
        ${eventSection(record)}
      </div>
    </details>`;
}

function renderEnvironmentalRecord(record, index) {
  const effect = field(record, "Env_Eff_Val", "Env_Eff") || "Not available";
  return `
    <details class="popup-record" ${index === 0 ? "open" : ""}>
      <summary>
        <span>
          <span class="record-number">Environmental record ${index + 1}</span>
          <strong>${value(record.Full_Date, "Undated record")}</strong>
        </span>
        <span class="severity-badge">${value(record.Env_Eff || "Unknown")}</span>
      </summary>
      <div class="popup-record-content">
        <dl class="popup-fields">
          ${detailsRows([
            ["Effect type", effect],
            ["Category", record.Category],
            ["ESI 2007", field(record, "ESI_Val", "ESI_Num")],
            ["Reliability", record.Rel],
            ["Record ID", record.Id],
          ])}
        </dl>
        ${descriptionBlock(record)}
        ${referencesBlock(record)}
        ${eventSection(record)}
      </div>
    </details>`;
}

export function renderSitePopup(group, layerName, records) {
  const siteName = value(group.site.SITE_NAME, "Unnamed site");
  const subtitle = layerName === "damage"
    ? "Earthquake Damage"
    : "Environmental Effects";
  const linkedCount = records.filter((record) => record._eventLinked).length;
  const unlinkedCount = records.length - linkedCount;

  const renderedRecords = records
    .map((record, index) =>
      layerName === "damage"
        ? renderDamageRecord(record, index)
        : renderEnvironmentalRecord(record, index)
    )
    .join("");

  return `
    <div class="popup-header">
      <p class="popup-layer-label">${subtitle}</p>
      <h3>${siteName}</h3>
      <div class="popup-site-meta">
        <span>${records.length} record${records.length === 1 ? "" : "s"}</span>
        <span>${linkedCount} linked</span>
        ${unlinkedCount ? `<span class="meta-warning">${unlinkedCount} unlinked</span>` : ""}
      </div>
    </div>
    <div class="popup-body">${renderedRecords}</div>`;
}
