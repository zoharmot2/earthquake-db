# Stage 3 Hotfix

## Problem

The Leaflet stylesheet was blocked by the browser because the `integrity`
attribute in `index.html` did not match the downloaded CSS file.

Typical symptoms:

- map tiles displayed as scattered blocks;
- Leaflet controls incorrectly positioned or missing;
- markers not displayed in their correct positions.

## Fix

The invalid integrity attribute was removed from the Leaflet CSS link.

Replace the repository-root `index.html` with the corrected file in this
package, commit to `main`, push, and perform a hard refresh after GitHub Pages
finishes deploying.
