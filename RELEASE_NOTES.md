# Release Notes — Version 1.2

Version 1.2 expands earthquake-db from a single accumulated-effects map into a two-view interactive exploration interface and adds support for embedded deployment.

## Highlights

- Added a selected-earthquake map in the second tab.
- Added an earthquake selector with event-Confidence filtering.
- Added selected-event damage and environmental-effect statistics.
- Added independent layer toggles for the selected-earthquake map.
- Added iframe-friendly Embed Mode activated with `?embed=1`.
- Added compatibility with the expanded `v_damage_dst_unified.csv` schema.
- Added user-facing `Refrences` and `Links` fields to damage popups and tooltips in both map views.
- Added safe clickable rendering for HTTP/HTTPS links while retaining non-URL identifiers as plain text.
- Added cache-busting version parameters for local CSS and JavaScript assets.

## Data in this release candidate

- 1,000 sites.
- 389 earthquake events.
- 1,297 earthquake-damage records.
- 241 environmental-effect records.

Compared with v1.1, the event and environmental-effect CSVs are unchanged. The current validated data contain one fewer site and one fewer damage record; mapped site counts remain 518 damage sites and 171 environmental-effect sites.

## QA

Final pre-release functional QA passed with no v1.2 regression blocker identified. Tested functionality included both map views, confidence filtering, layer toggles, site search, reset, About dialog, earthquake selection, selected-event statistics, popup/tooltip rendering, Embed Mode, iframe behavior, and the `Refrences`/`Links` schema extension.

Visual and responsive design refinement is intentionally outside the v1.2 release scope and is deferred to later versions.

## Remaining release steps

Before publication, perform the external deployment check on GitHub Pages, create the GitHub v1.2 release/tag, and publish the v1.2 Zenodo record with its final version-specific DOI and links.
