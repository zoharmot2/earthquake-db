# earthquake-db v1.1 update package

This package contains the accumulated-effects map prepared for the v1.1 review cycle.

## Run locally

From the package directory on Windows:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`.

## Data files

The map loads these files directly from `data/`:

- `v_sites_geo.csv`
- `v_events_dst.csv`
- `v_damage_dst_unified.csv`
- `v_env_effects_dst_unified.csv`

Keep these filenames unchanged. Replacing a CSV with a corrected version will be reflected on the next browser reload.

## Main interface behavior

- OpenStreetMap is the default basemap.
- Confidence options are generated from unique `Rel` values in both effect datasets.
- Marker size represents the filtered number of occurrences at each site.
- Popups organize records by linked earthquake.
- The second tab is intentionally reserved and contains no map functionality yet.
