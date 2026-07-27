# Map Data Dictionary

## Site key

| Dataset | Field | Role |
|---|---|---|
| `v_sites_geo.csv` | `GlobalID` | Unique site identifier |
| Damage CSV | `Sites_GlobalID` | Foreign key to the site table |
| Environmental CSV | `Sites_GlobalID` | Foreign key to the site table |

## Event key

| Dataset | Field | Role |
|---|---|---|
| `v_events_dst_reliable.csv` | `Id` | Unique event identifier |
| Damage CSV | `Event_Id` | Foreign key to the event table |
| Environmental CSV | `Event_Id` | Foreign key to the event table |

## Map symbology

| Layer | Field | Use |
|---|---|---|
| Earthquake Damage | `Damage_Val` | Circle size |
| Environmental Effects | `Env_Eff` | Square color |
| Environmental Effects | `ESI_Val` | Square size |

For `ESI_Val` ranges such as `7-8`, the upper value is used for marker sizing.
Unknown values use the smallest marker.
