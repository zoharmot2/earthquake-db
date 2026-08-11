# earthquake-db v1.2 — Release Candidate Preparation

Status: **Functional QA complete; external deployment and publication pending.**

This release candidate contains the functionally tested v1.2 application. No visual redesign was performed as part of final pre-release QA.

## Functional scope completed

- Accumulated damage/environmental-effects map retained and regression-tested.
- Selected-earthquake map implemented in the second tab.
- Earthquake selector and event-Confidence filtering implemented.
- Selected-event map statistics and layer toggles implemented.
- `?embed=1` Embed Mode implemented and functionally tested in a generic iframe harness.
- Expanded damage schema supported with `Refrences` and `Links`.
- Damage popups and tooltips in both map views display the new fields.
- HTTP/HTTPS values in `Links` are rendered as safe clickable links; other identifiers remain text.
- Local CSS/JS assets use v1.2 release cache-busting parameters.

## Functional QA result

**PASS — no v1.2 functional regression blocker found.**

Validated data counts:

- 1,000 sites
- 389 events
- 1,297 damage records
- 241 environmental-effect records

No duplicate primary identifiers or broken Site/Event links were found in the tested release candidate.

The 1927-07-11 event was used as a selected-earthquake benchmark and produced 140 mapped damage records at 140 sites and 32 mapped environmental-effect records at 32 sites.

## Deliberately deferred

- Visual/responsive redesign and symbology refinements.
- Automated Data Export & Publication Pipeline (moved to v1.3).
- Internal Admin Web Application (future version, not assigned to v1.2).

## Remaining before stable publication

1. Deploy the release candidate to GitHub Pages.
2. Verify real Leaflet/PapaParse CDN loading and OpenStreetMap/CARTO/Esri basemap tiles.
3. Verify both maps on the deployed site.
4. Verify `?embed=1` using the deployed URL and production WordPress/iframe context.
5. Create the final Git tag and GitHub Release for v1.2.
6. Publish/update the Zenodo v1.2 record, then insert the version-specific DOI into `CITATION.cff` if desired.
