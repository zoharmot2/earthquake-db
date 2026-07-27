# Stage 3.1 — Symbology and Base Maps

## Base maps

The user can select one of three base maps:

- Light map
- OpenStreetMap
- Satellite

The Light map is the default.

## Opening extent

The map opens focused on the eastern Mediterranean, Levant, Egypt, and the
Dead Sea Transform study region rather than automatically fitting all records.

## Damage symbology

Damage is displayed with circles. Marker size represents the highest visible
`Damage_Val` at the site:

1. Felt
2. Light
3. Moderate
4. Heavy
5. Severe

Unknown, `U`, and missing values use the smallest symbol.

## Environmental-effect symbology

Environmental markers use:

- color for `Env_Eff`;
- size for the highest visible value parsed from `ESI_Val`.

When several `Env_Eff` codes occur at one site, the site marker is divided into
colored segments. This preserves the one-marker-per-site architecture without
discarding environmental-effect types.

For an ESI range such as `7-8`, the upper value is used for marker sizing.
`Unknown` values use the smallest environmental marker.

## Dynamic legend

The legend appears only for active thematic layers and is recalculated when
the event-link filter changes.

## About section

The site About dialog now explains all three visual encodings and the
ID-only linkage policy.
