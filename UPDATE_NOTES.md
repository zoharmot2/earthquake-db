# earthquake-db v1.1 review update package

This package documents the next approved UI changes for implementation.

## Popup
- Remove the 'Earthquakes' label and earthquake count.
- Replace tabbed earthquake navigation with a vertically scrollable list.
- Show only the earthquake date as the header for each earthquake section.
- Remove event number and event label.
- Emphasize the Confidence field visually.
- Keep popup offset slightly right/up while retaining Leaflet auto-pan.

## Confidence filter
- All aligned with left column.
- Left: Poor, Doubtful, Unknown.
- Right: Moderate, High, Very High.
- Unknown maps to CSV value U.

## Legend
- Damage: occurrence-size legend only.
- Environmental Effects: effect-type symbology only.
