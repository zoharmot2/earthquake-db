# earthquake-db v1.1 — Stage 3 Interactive Map

This package contains a working Leaflet implementation for the v1.1
interactive map.

## Included functionality

- Direct browser loading of the existing CSV files.
- Site joins only through `Sites_GlobalID → GlobalID`.
- Event joins only through `Event_Id → Id`.
- One marker per site in each thematic layer.
- Two independently controlled layers:
  - Earthquake Damage
  - Environmental Effects
- Site popups aggregating all records in chronological order.
- Records without a linked event remain visible and display:
  `No linked event record`.
- Site search.
- Event-link filter:
  - All records
  - Linked event records only
  - No linked event record only
- Responsive layout, scale bar, legend, summary counts and reset control.
- English-only interface.

## Repository placement

Place the files at repository root as follows:

```text
earthquake-db/
├── index.html
├── css/
│   └── map.css
├── js/
│   ├── data-loader.js
│   ├── popup-renderer.js
│   └── map-app.js
├── data/
│   ├── v_sites_geo.csv
│   ├── v_events_dst_reliable.csv
│   ├── v_damage_dst_reliable.csv
│   └── v_env_effects_dst_reliable.csv
└── docs/
    └── stage3-map.md
```

The package contains copies of the current CSVs only to make local testing
immediate. In the repository, retain all other existing files directly under
the same `data/` directory.

## Local test

From the package directory, run:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Do not open `index.html` directly through `file://`, because browsers normally
block `fetch()` access to local CSV files.

## GitHub Pages

The map requires no backend and no build process. After publishing the files to
the repository, GitHub Pages serves `index.html`, and the current CSV contents
are loaded on each page refresh.

## Current expected data status

- 1,000 unique site `GlobalID` values.
- 1,415 damage records, all linked to a site.
- 166 environmental-effect records, all linked to a site.
- 151 damage records without a linked event.
- 4 environmental-effect records without a linked event.

The unlinked-event records are intentionally retained.
