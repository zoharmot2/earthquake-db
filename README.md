## Earthquake-db project ##

Items included in the project: 

## data directory ##
Contains the following data files:
1. a_sites_geo.csv - This file contains the master gazetteer of archaeological, historical, and geographical sites referenced throughout the database. It includes site names, alternative names, geographic coordinates, elevation data, and unique identifiers used to spatially link earthquake damage and environmental effects records.

2. v_damage_dst_reliable.csv - This dataset contains reliable and moderately reliable records of earthquake-related damage within the Dead Sea Transform (DST) region. The file includes information on affected sites, damage severity, casualties, intensity estimates (EMS-98/MSK), geographic coordinates, and descriptive historical or archaeological evidence.

3. v_damage_jerusalem.csv - This file compiles earthquake damage reports specifically associated with Jerusalem across historical periods. It includes qualitative damage assessments, reliability evaluations, chronological information, and textual descriptions derived from historical, archaeological, and secondary scholarly sources.

4. v_env_effects_dst_reliable.csv - This dataset documents reliable and moderately reliable earthquake-induced environmental effects in the DST region. Recorded effects include phenomena such as ground ruptures, rock falls, landslides, liquefaction, and related Environmental Seismic Intensity (ESI) assessments, together with site coordinates and descriptive evidence.

5. v_events_dst_doubtful.csv -This file contains doubtful or weakly constrained earthquake events associated with the DST region. The dataset includes uncertain chronological, spatial, and descriptive information, allowing researchers to distinguish tentative or disputed events from more reliable earthquake catalogues.

6. v_events_dst_reliable.csv - This dataset provides the main catalogue of reliable and moderately reliable earthquakes associated with the Dead Sea Transform region. It includes event chronology, estimated magnitudes and intensities, epicentral information, tsunami occurrence, regional attribution, and supporting historical or geological evidence.

7. v_events_dst_reliable_damaging.csv - This file is a subset of reliable DST earthquakes that produced documented damage. In addition to the standard event parameters, the dataset includes aggregated damage indicators and maximum observed damage levels derived from historical, archaeological, and paleoseismic evidence.

8. v_events_dst_reliable_damaging_destructive.csv - This dataset contains the subset of reliable DST earthquakes classified as destructive events. These earthquakes are characterized by extensive regional damage, high intensities, or widespread societal impacts, and are accompanied by detailed historical descriptions, references, and evidence classifications.

9. v_events_off_dst_reliable.csv - This file contains reliable and moderately reliable earthquakes located outside the Dead Sea Transform region but considered relevant to the broader eastern Mediterranean seismic context. The dataset includes chronological, spatial, and descriptive parameters comparable to those used in the main DST earthquake catalogue.



## python directory ##
Contains the following files:

1. statistical_overview.ipynb - This Jupyter Notebook provides a simple exploratory statistical overview of the historical earthquake database and its associated datasets. The notebook includes basic descriptive statistics, temporal distributions, magnitude and intensity summaries, and spatial visualizations for earthquake events, damage records, environmental effects, and site locations across the Dead Sea Transform region and adjacent areas. This notebook was created using ChatGPT



## Other files ##

1. db-schema-ve2.jpg - schema of database version 2
