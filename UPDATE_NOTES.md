# earthquake-db v1.1 — Real correction package

Status: **Review update only**. This package does not close or release v1.1.

## Replace these files

- `index.html`
- `js/map-app.js`
- `js/popup-renderer.js`
- `css/map.css`

The QA report is supplied as:
- `docs/v1.1-correction-qa.json`

## Implemented corrections

### Confidence filter
- Uses a fixed scale instead of deriving the interface from the current data.
- `All` is aligned with the left column.
- Left column, top to bottom: Poor, Doubtful, Unknown.
- Right column, top to bottom: Moderate, High, Very High.
- Both `U` and `Unknown` are treated as the displayed/filter value `Unknown`.
- The two-column arrangement is retained on narrow screens.

### Popup
- Removes the thematic layer label.
- Removes the earthquake count and occurrence count from the popup header.
- Removes event ID and event label from earthquake headings.
- Displays only the earthquake date as stored in the data.
- Displays earthquake sections sequentially in one vertically scrollable popup.
- Visually emphasizes the Confidence field.
- Offsets the popup slightly right and upward while retaining Leaflet auto-pan and keep-in-view behavior.

### Legend
- Earthquake Damage retains occurrence-size classes.
- Environmental Effects show only effect-type color symbology, without occurrence-size classes.

### About dialog
- Updated to describe the fixed shared Confidence scale.
- Updated to describe the scrollable date-only earthquake sections.
- Clarifies that environmental occurrence-size classes are not repeated in the legend.

## QA completed

- JavaScript syntax checks passed for all three JS modules.
- 1,001 sites, 389 events, 1,298 damage records, and 241 environmental records checked.
- No missing or invalid site links.
- No missing or invalid event links.
- All six Confidence values occur in the current datasets.
- Browser-based visual testing is still required before v1.1 Stable.


### Site title
- Updated the browser/page title to `Dead Sea Transform Historical Earthquakes`.
- Updated the main visible site heading to `Dead Sea Transform Historical Earthquakes`.

## v1.2 development — selected-earthquake map r5
- Suppress records assigned to the `Unknown` site from the second map; report them separately as additional unassigned reports in event statistics/summary.
- Normalize severity `U` to `Unknown` in user-facing popup/statistical displays, and sort Unknown last in statistical breakdowns.
- Remove permanent site-name labels from the second map; site names remain available on marker hover.
- Render valid HTTP/HTTPS values in the damage `Links` field as clickable links opening in a new browser tab in tooltips (both maps) and popups.
- Harden `?embed=1` layout by explicitly forcing the accumulated map panel to fill the iframe viewport and re-invalidating/refitting the Leaflet map after embed initialization.
