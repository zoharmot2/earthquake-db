# Release Notes — Version 1.3.0

## earthquake-db v1.3.0 — Administration Web Application Release

Version 1.3 is an administration-focused project release.

The major v1.3 milestone is the replacement of the former Microsoft Access administration front end with a secure web-based administration application connected to the existing SQL Server / Enterprise Geodatabase.

The public GitHub Pages mapping application and the published CSV datasets are intentionally unchanged from v1.2 in this release. Further public-map development is deferred to the next version.

## Administration milestone

The v1.3 administration application provides:

- authenticated username/password access;
- Administrator and Editor roles;
- Events search, view, create, and edit workflows;
- Damage & Environmental Effects search, view, create, and edit workflows;
- SDE-safe OBJECTID allocation through the existing `dbo.next_rowid` procedure;
- concurrency-safe application-managed business-ID allocation;
- authoritative Site selection and Save-time Site revalidation;
- `No Effect (Id=15)` defaults for both required environmental-effect fields on new Damage records;
- a public read-only Spatial Data viewer;
- a separate private ArcGIS spatial editing workflow for Sites and geometry;
- Administrator user management;
- read-only lookup viewing and System Health;
- production deployment behind IIS/HTTPS with server-side authentication and database credentials.

The scientific SQL Server / Enterprise Geodatabase schema was not altered for this release.

## Public application and data

The v1.2 public-map functionality is retained without functional modification in v1.3:

- accumulated damage/environmental-effects map;
- earthquake-specific map;
- event Confidence filtering;
- selected-event statistics and layer controls;
- `?embed=1` embed mode;
- expanded `v_damage_dst_unified.csv` compatibility;
- `Refrences` and `Links` display;
- safe HTTP/HTTPS link rendering.

The published CSV datasets are unchanged from the v1.2 public release.

## Deferred to the next release

- further public-map/application development and integration;
- additional public UI/visual refinement;
- generic lookup editing in the administration application;
- database index/performance maintenance;
- other non-critical enhancements identified during routine use.

## Reproducibility and citation

The public repository remains the versioned release point for the earthquake-db project and is archived through Zenodo.

Please cite the specific Zenodo DOI assigned to v1.3.0 when using this release.

## License

Creative Commons Attribution 4.0 International (CC BY 4.0).
