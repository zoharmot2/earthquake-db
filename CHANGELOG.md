# Changelog


## [1.3.0] - 2026-08-21

### Added
- Released the secure web-based administration application replacing the former Microsoft Access administration front end.
- Added authenticated Administrator and Editor workflows for Events and Damage & Environmental Effects.
- Added SDE-safe write handling using the existing `dbo.next_rowid` procedure.
- Added the Spatial Data view/private-edit workflow, authoritative Site revalidation, and new-Damage `No Effect (Id=15)` defaults.

### Changed
- Advanced the overall earthquake-db project version to 1.3.0.
- Updated release, citation, and Zenodo metadata for the administration-focused release.

### Public application and data
- Public GitHub Pages map functionality is unchanged from v1.2.
- Published CSV datasets are unchanged from v1.2.
- Further public-map development is deferred to the next release.

## v1.2.0

### Added
- Selected-earthquake map in the second tab.
- Earthquake selector with event-Confidence filtering.
- Selected-earthquake statistics and layer controls.
- Iframe-friendly Embed Mode using `?embed=1`.
- Damage tooltip rendering shared across both map views.
- Support for the `Refrences` and `Links` fields in `v_damage_dst_unified.csv`.
- Safe clickable rendering for HTTP/HTTPS values in `Links`.
- Versioned local asset URLs for cache busting.

### Changed
- Expanded the second tab from a placeholder into a functional earthquake-specific exploration view.
- Updated damage popup/tooltip content to expose source-reference and link information.
- Updated local asset cache-busting identifiers from the v1.2 review build to the v1.2 release identifier.
- Updated release metadata and documentation for v1.2.

### Data
- Sites: 1,000.
- Events: 389.
- Damage records: 1,297.
- Environmental-effect records: 241.

### QA
- Final pre-release functional QA completed with no release-blocking regression found.
- Visual/responsive design changes intentionally deferred to later versions.

## v1.1.0

### Added
- Interactive Leaflet web map.
- Direct client-side CSV loading.
- Three selectable basemaps.
- Shared confidence filter.
- Improved popups and legend.

### Changed
- New site title: Dead Sea Transform Historical Earthquakes.
- Updated documentation.
- Refined user interface.

### Fixed
- Data integrity verification.
- Confidence handling supporting both U and Unknown.