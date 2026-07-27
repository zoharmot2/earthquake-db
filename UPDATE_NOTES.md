# earthquake-db v1.1 Review — Update 03 (corrected)

## Implemented changes

### Confidence filter
- Uses a fixed list of values so `Unknown` is always visible.
- `All` is aligned with the left column.
- Left column: Poor, Doubtful, Unknown.
- Right column: Moderate, High, Very High.
- `Unknown` filters the underlying CSV value `U`.

### Popup
- Removes the thematic layer label at the top.
- Removes the earthquake count label from the popup header.
- Removes event number and event label from earthquake headings.
- Displays only the earthquake date for each earthquake section.
- Shows earthquake sections one after another in a vertically scrollable popup.
- Highlights the Confidence field.
- Offsets the popup slightly right and upward while retaining Leaflet auto-pan.

### Legend
- Damage retains occurrence-size classes.
- Environmental Effects retain effect-type symbology only.

## Files
- `js/map-app.js`
- `css/map.css`

This is a review update for v1.1, not a stable release.
