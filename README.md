# earthquake-db

**earthquake-db** is a harmonized geospatial dataset and interactive map of
historical earthquake damage and environmental effects in the Dead Sea
Transform region.

This repository is currently preparing **Version 1.1**. The map is functional,
but the release has not yet been declared stable.

## Interactive map

The GitHub Pages map loads the repository CSV files directly in the browser.
There is no backend and no build-time data aggregation.

### Thematic layers

#### Earthquake Damage

- Symbol: circle
- Symbol size: highest visible `Damage_Val` at the site
- Ordered values:
  - Felt
  - Light
  - Moderate
  - Heavy
  - Severe
- Unknown and missing values use the smallest circle.

#### Environmental Effects

- Symbol: square
- Symbol color: `Env_Eff`
- Symbol size: highest visible `ESI_Val` at the site
- If several environmental-effect types occur at a site, the square is divided
  into colored segments.

### Base maps

Users can select:

- OpenStreetMap — default
- Light map
- Satellite

## Data relationships

All joins are identifier-based.

```text
v_sites_geo.GlobalID
        ↓
Sites_GlobalID
```

This relationship connects sites to both damage and environmental-effect
records.

```text
v_events_dst_reliable.Id
        ↓
Event_Id
```

This relationship connects effect records to the reliable event catalogue.

The application never uses site names, event names, dates, magnitudes, or
coordinates as fallback join keys.

## Records without linked events

A record remains visible when its `Event_Id` is not found in the reliable event
catalogue. Its popup displays:

```text
No linked event record
```

Current expected status:

- 151 damage records without a linked event
- 4 environmental-effect records without a linked event

These records will be corrected in a later data-maintenance stage.

## Repository structure

```text
earthquake-db/
├── index.html
├── css/
│   └── map.css
├── js/
│   ├── data-loader.js
│   ├── map-app.js
│   └── popup-renderer.js
├── data/
│   ├── v_sites_geo.csv
│   ├── v_events_dst_reliable.csv
│   ├── v_damage_dst_reliable.csv
│   ├── v_env_effects_dst_reliable.csv
│   └── other existing project data files
└── docs/
    ├── v1.1-testing-checklist.md
    ├── data-dictionary-map.md
    └── qa-report.json
```

All existing data files retain their filenames and remain directly under the
single `data/` directory.

## Local testing

Run from the repository root:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Do not open the page with `file://`, because browsers usually prevent direct
CSV loading from local files.

## GitHub Pages deployment

The intended deployment is:

- branch: `main`
- folder: repository root
- source: Deploy from a branch

Updated CSV files are reflected on the next map load or refresh.

## Current v1.1 status

Completed:

- direct CSV loading;
- identifier-only joins;
- one marker per site per thematic layer;
- aggregated popups;
- three selectable base maps;
- damage and environmental symbology;
- dynamic layer legends;
- site search;
- linked/unlinked event filter;
- responsive interface;
- improved popup readability;
- automated structural QA report.

Still required before declaring v1.1 stable:

- manual browser testing;
- mobile-device testing;
- final review of popup content;
- final documentation and release-note review;
- confirmation that no console errors occur on GitHub Pages.

## Citation and licence

Citation instructions and licensing information should be finalized before the
v1.1 release is published.
