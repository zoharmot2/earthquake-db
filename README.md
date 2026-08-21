# earthquake-db v1.3

Version 1.3 is an administration-focused project release. The public web-mapping application retains the v1.2 functionality and direct client-side CSV architecture.

## Version 1.3 release focus

Version 1.3 is the **Administration Web Application release** for the earthquake-db project. The principal milestone is the replacement of the former Microsoft Access administration front end with a secure web-based administration system while preserving the existing SQL Server / Enterprise Geodatabase schema.

The public GitHub Pages mapping application and published CSV datasets are intentionally unchanged from v1.2 in this release. The v1.2 public-map functionality remains the public baseline, and further public-map development is deferred to the next release.

## Run locally

From the package directory on Windows:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`.

## Data files

Both map views load the authoritative repository CSV files directly from `data/`:

- `v_sites_geo.csv`
- `v_events_dst.csv`
- `v_damage_dst_unified.csv`
- `v_env_effects_dst_unified.csv`

Keep these filenames unchanged. Replacing a CSV with a validated corrected version is reflected on the next browser reload.

## Public web application baseline (v1.2, retained in v1.3)

- Retains the accumulated damage/environmental-effects map from v1.1.
- Adds a second map for exploring damage and environmental effects by a selected earthquake.
- Adds event-Confidence filtering for the earthquake selector.
- Adds selected-earthquake statistics and layer controls.
- Adds iframe-friendly Embed Mode using `?embed=1`.
- Supports the expanded `v_damage_dst_unified.csv` schema, including `Refrences` and `Links`.
- Displays valid HTTP/HTTPS values from `Links` as safe clickable links while preserving non-URL identifiers as text.
- Uses versioned local CSS/JavaScript URLs for cache busting.

## Functional QA status

Final pre-release functional QA passed for the v1.2 release candidate. Visual and responsive design refinements are intentionally deferred to later versions.

The final external deployment check must still confirm real CDN and basemap-tile availability on the deployed GitHub Pages site and the production iframe/embed context.
