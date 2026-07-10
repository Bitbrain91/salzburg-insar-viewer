export type AttributeContext =
  | "insar-point"
  | "terrain"
  | "timeseries"
  | "ml-point"
  | "ml-building"
  | "ml-run"
  | "bev"
  | "gba"
  | "osm"
  | "building"
  | "raw";

export type AttributeMetadata = {
  key: string;
  label: string;
  description: string;
  unit?: string;
  source?: string;
  context?: AttributeContext;
  known: boolean;
};

type AttributeMetadataDefinition = Omit<AttributeMetadata, "known" | "context"> & {
  aliases?: string[];
  contexts?: AttributeContext[];
};

const SOURCE_INSAR = "InSAR-Bewegungsdaten, PostGIS `insar_points`";
const SOURCE_TS = "InSAR-Zeitreihen, PostGIS `insar_timeseries` / `insar_amplitude_timeseries`";
const SOURCE_TERRAIN = "Terrain-Kontext, SRTM-abgeleitete Tabellen";
const SOURCE_ML_POINT = "ML-Punktanalyse `anomaly_local_v1`, `ml_point_results`";
const SOURCE_ML_BUILDING = "ML-Gebäude-Rollup `anomaly_local_v1`";
const SOURCE_ML_RUN = "ML-Run-Metriken und Run-Parameter";
const SOURCE_BEV = "BEV DLM-Bauwerke / `bev_buildings`";
const SOURCE_GBA = "Global Building Atlas / `gba_buildings.properties`";
const SOURCE_OSM = "OpenStreetMap / `osm_buildings.tags`";

const definitions: AttributeMetadataDefinition[] = [
  {
    key: "code",
    aliases: ["CODE"],
    label: "Punkt-Code",
    description: "Eindeutige Messpunktkennung. Zusammen mit Track ist sie der stabile Schlüssel für Punktdetails und Zeitreihen.",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "timeseries", "ml-point", "raw"],
  },
  {
    key: "track",
    aliases: ["TRACK"],
    label: "Track",
    description: "Orbit-Track innerhalb des jeweiligen Sensor-Datasets.",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "timeseries", "ml-point", "ml-building", "raw"],
  },
  {
    key: "los",
    aliases: ["LOS"],
    label: "LOS / Geometrie",
    description: "`A` steht für Ascending, `D` für Descending. Alle Bewegungswerte sind entlang der Radar-Blicklinie gemessen.",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "timeseries", "ml-point", "raw"],
  },
  {
    key: "velocity",
    aliases: ["vel", "VEL"],
    label: "Geschwindigkeit",
    description: "Mittlere Bewegung entlang der Radar-Blicklinie. Positive Werte bedeuten Bewegung zum Satelliten, negative Werte weg vom Satelliten.",
    unit: "mm/Jahr",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "raw"],
  },
  {
    key: "velocity_std",
    aliases: ["v_stdev", "V_STDEV"],
    label: "Geschwindigkeits-Unsicherheit",
    description: "Standardabweichung der mittleren LOS-Geschwindigkeit. Hohe Werte sprechen für unsichere oder verrauschte Bewegungsschätzung.",
    unit: "mm/Jahr",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "raw"],
  },
  {
    key: "coherence",
    aliases: ["COHERENCE"],
    label: "Kohärenz",
    description: "Signal- und Modellstabilitaet im Bereich 0-1. Höhere Werte bedeuten in dieser Verarbeitung robustere Punktzeitreihen.",
    unit: "0-1",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "raw"],
  },
  {
    key: "std_def",
    aliases: ["STD_DEF"],
    label: "Deformations-Standardabweichung",
    description: "Streuung der modellierten LOS-Deformation über die Zeitreihe. Hohe Werte weisen auf unruhigere oder weniger stabile Punktzeitreihen hin.",
    unit: "mm",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "height",
    aliases: ["H", "HEIGHT"],
    label: "InSAR-Höhe",
    description: "SAR-abgeleitete ellipsoidische Punkt-Höhe. Sie ist kein direktes Gebäude- oder Terrainhöhenmass.",
    unit: "m",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "height",
    label: "Höhe",
    description: "Höhenattribut. Die fachliche Bedeutung hängt vom Kontext ab: InSAR-Punkthöhe, Gebäudehöhe oder Rohdatenfeld.",
    unit: "m",
    source: "Kontextabhängiges Attribut",
  },
  {
    key: "height_std",
    aliases: ["h_stdev", "H_STDEV"],
    label: "Höhen-Unsicherheit",
    description: "Standardabweichung der SAR-abgeleiteten Punkt-Höhe. Nuetzlich als Hinweis auf unsichere Höhenlage.",
    unit: "m",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "acceleration",
    aliases: ["acc", "ACC"],
    label: "Beschleunigung",
    description: "Aus der LOS-Zeitreihe abgeleitete Aenderung der Geschwindigkeit. Sie beschreibt keine unabhängige 3D-Bewegung.",
    unit: "mm/Jahr^2",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "raw"],
  },
  {
    key: "acceleration_std",
    aliases: ["a_stdev", "A_STDEV"],
    label: "Beschleunigungs-Unsicherheit",
    description: "Standardabweichung der abgeleiteten Beschleunigung. Hohe Werte deuten auf weniger belastbare Beschleunigungswerte hin.",
    unit: "mm/Jahr^2",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "season_amp",
    aliases: ["SEASON_AMP", "SEAS"],
    label: "Saisonale Amplitude",
    description: "Amplitude des saisonalen Bewegungsanteils in der LOS-Zeitreihe, zum Beispiel thermische oder jahreszeitliche Effekte.",
    unit: "mm",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "raw"],
  },
  {
    key: "season_phs",
    aliases: ["SEASON_PHS"],
    label: "Saisonale Phase",
    description: "Phasenlage des saisonalen Bewegungsanteils. Sie beschreibt den Zeitpunkt des saisonalen Maximums im Modell.",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "s_amp_std",
    aliases: ["S_AMP_STD"],
    label: "Unsicherheit saisonale Amplitude",
    description: "Standardabweichung der saisonalen Amplitude. Hohe Werte schwächen saisonale Interpretationen.",
    unit: "mm",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "s_phs_std",
    aliases: ["S_PHS_STD"],
    label: "Unsicherheit saisonale Phase",
    description: "Standardabweichung der saisonalen Phase. Hohe Werte sprechen gegen eine klare saisonale Lage.",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "incidence_angle",
    aliases: ["INCIDENCE_ANGLE", "incidence_angle_deg"],
    label: "Einfallswinkel",
    description: "Radar-Einfallswinkel am Punkt. Er wird für Reichweitenversatz und vertikale Proxy-Werte verwendet.",
    unit: "Grad",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "ml-building", "raw"],
  },
  {
    key: "default_incidence_deg",
    label: "Standard-Einfallswinkel",
    description: "Fallback-Winkel aus der Track-Geometrie, wenn kein Punkt- oder Gebäude-Median verfügbar ist.",
    unit: "Grad",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-building"],
  },
  {
    key: "eff_area",
    aliases: ["EFF_AREA"],
    label: "Effektive Fläche",
    description: "Effektive Fläche des Streuers. `0` deutet auf Permanent Scatterer hin, größere Werte auf Distributed-Scatterer-Flächen.",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "ml-point", "raw"],
  },
  {
    key: "amp_mean",
    label: "Mittlere Amplitude",
    description: "Mittelwert der SAR-Amplitudenzeitreihe. Beschreibt die mittlere Rückstreuintensitaet, nicht direkt Bewegung.",
    source: SOURCE_TS,
    contexts: ["insar-point", "timeseries", "ml-point"],
  },
  {
    key: "amp_std",
    label: "Amplitude-Standardabweichung",
    description: "Streuung der SAR-Amplitude über die Zeit. Hohe Werte können auf instabile Rückstreuung hinweisen.",
    source: SOURCE_TS,
    contexts: ["insar-point", "timeseries", "ml-point"],
  },
  {
    key: "lon",
    aliases: ["longitude", "x"],
    label: "Längengrad",
    description: "Geografische Punktposition in WGS84.",
    unit: "Grad",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "lat",
    aliases: ["latitude", "y"],
    label: "Breitengrad",
    description: "Geografische Punktposition in WGS84.",
    unit: "Grad",
    source: SOURCE_INSAR,
    contexts: ["insar-point", "raw"],
  },
  {
    key: "geometry",
    aliases: ["geom"],
    label: "Geometrie",
    description: "Raeumliche Geometrie des Objekts, in der API meist als GeoJSON geliefert.",
    source: "PostGIS / GeoJSON",
    contexts: ["insar-point", "building", "gba", "osm", "raw"],
  },
  {
    key: "fid",
    label: "Rohdaten-FID",
    description: "Feature-ID aus der ursprünglichen Geodatenquelle. Für Fachlogik nicht stabiler als der kanonische Punkt- oder Gebäudeschluessel.",
    source: "GPKG-Rohdaten",
    contexts: ["raw"],
  },
  {
    key: "file_id",
    label: "Datei-ID",
    description: "Rohes Herkunftsfeld aus der Bewegungsdatei. Wird für die App-Logik nicht als fachlicher Schlüssel verwendet.",
    source: "GPKG-Rohdaten",
    contexts: ["raw"],
  },
  {
    key: "date",
    label: "Datum",
    description: "Messdatum eines Zeitreihenwertes.",
    source: SOURCE_TS,
    contexts: ["timeseries", "raw"],
  },
  {
    key: "displacement",
    label: "Verschiebung",
    description: "LOS-Verschiebung relativ zum Referenzzeitpunkt. Positive Werte bedeuten Bewegung zum Satelliten.",
    unit: "mm",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point", "raw"],
  },
  {
    key: "amplitude",
    label: "Amplitude",
    description: "SAR-Rückstreuintensitaet am Messdatum. Dies ist kein Bewegungswert.",
    source: SOURCE_TS,
    contexts: ["timeseries", "raw"],
  },
  {
    key: "measurements",
    label: "Messungen",
    description: "Liste der Zeitreihenmessungen für einen Punkt und Track.",
    source: SOURCE_TS,
    contexts: ["timeseries"],
  },

  {
    key: "source",
    aliases: ["terrain_source"],
    label: "Quelle",
    description: "Datenquelle des jeweiligen Kontextes, zum Beispiel `srtm`, `gba` oder `osm`.",
    source: "API-Kontextfeld",
    contexts: ["terrain", "building", "ml-run", "raw"],
  },
  {
    key: "resolution_m",
    aliases: ["terrain_resolution_m"],
    label: "Terrain-Auflösung",
    description: "Rasteraufloesung des verwendeten Terrain-Kontexts.",
    unit: "m",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "insar-point", "building", "raw"],
  },
  {
    key: "elevation_m",
    aliases: ["terrain_elevation_m"],
    label: "Terrain-Höhe",
    description: "Terrainhöhe am Punkt aus dem Rasterkontext.",
    unit: "m",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "insar-point", "raw"],
  },
  {
    key: "elevation_mean_m",
    aliases: ["terrain_elevation_mean_m"],
    label: "Mittlere Terrain-Höhe",
    description: "Mittlere Terrainhöhe innerhalb des Gebäudekontexts.",
    unit: "m",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "building", "ml-building", "raw"],
  },
  {
    key: "elevation_min_m",
    aliases: ["terrain_elevation_min_m"],
    label: "Minimale Terrain-Höhe",
    description: "Niedrigste Terrainhöhe im Gebäudekontext.",
    unit: "m",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "building", "raw"],
  },
  {
    key: "elevation_max_m",
    aliases: ["terrain_elevation_max_m"],
    label: "Maximale Terrain-Höhe",
    description: "Hoechste Terrainhöhe im Gebäudekontext.",
    unit: "m",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "building", "raw"],
  },
  {
    key: "slope_deg",
    aliases: ["terrain_slope_deg"],
    label: "Hangneigung",
    description: "Terrainneigung am Punkt. Steiles Terrain kann InSAR-Sichtbarkeit und Interpretation beeinflussen.",
    unit: "Grad",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "insar-point", "raw"],
  },
  {
    key: "aspect_deg",
    aliases: ["terrain_aspect_deg"],
    label: "Exposition",
    description: "Richtung der Hangexposition im Terrainraster.",
    unit: "Grad",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "insar-point", "raw"],
  },
  {
    key: "slope_mean_deg",
    aliases: ["terrain_slope_mean_deg"],
    label: "Mittlere Hangneigung",
    description: "Mittlere Neigung im Gebäudeumfeld. Wird als Kontext für zulassige Track-Differenzen genutzt.",
    unit: "Grad",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "building", "ml-point", "ml-building", "raw"],
  },
  {
    key: "slope_max_deg",
    aliases: ["terrain_slope_max_deg"],
    label: "Maximale Hangneigung",
    description: "Maximale Neigung im Gebäudeumfeld.",
    unit: "Grad",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "building", "ml-point", "ml-building", "raw"],
  },
  {
    key: "relief_range_m",
    aliases: ["terrain_relief_range_m"],
    label: "Reliefspanne",
    description: "Höhenunterschied im Gebäudeumfeld.",
    unit: "m",
    source: SOURCE_TERRAIN,
    contexts: ["terrain", "building", "ml-point", "ml-building", "raw"],
  },

  {
    key: "run_id",
    label: "Run-ID",
    description: "Eindeutige Kennung eines ML-Laufs.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-point", "ml-building"],
  },
  {
    key: "mlflow_run_id",
    label: "MLflow-Run-ID",
    description: "Zuordnung des App-Runs zum MLflow-Tracking-Run.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "pipeline",
    label: "Pipeline",
    description: "Name der ausgefuehrten Analysepipeline.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-point", "ml-building"],
  },
  {
    key: "pipeline_version",
    label: "Pipeline-Version",
    description: "Persistierte Version der Pipeline-Definition.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "run_type",
    label: "Run-Typ",
    description: "Technischer Typ des ML-Laufs, etwa interaktiv oder Batch.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-point", "ml-building"],
  },
  {
    key: "status",
    label: "Status",
    description: "Aktueller Ausfuehrungsstatus des ML-Runs.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "created_at",
    label: "Erstellt am",
    description: "Zeitpunkt, zu dem der Run angelegt wurde.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "started_at",
    label: "Gestartet am",
    description: "Zeitpunkt, zu dem die Verarbeitung begonnen hat.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "finished_at",
    label: "Beendet am",
    description: "Zeitpunkt, zu dem die Verarbeitung abgeschlossen wurde.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "error",
    label: "Fehler",
    description: "Persistierte Fehlermeldung eines fehlgeschlagenen Runs.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "bbox",
    label: "Kartenausschnitt",
    description: "Bounding Box, für die der ML-Run gestartet wurde.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "params",
    label: "Run-Parameter",
    description: "Parametrierung des ML-Runs, zum Beispiel Distanz-, Puffer- und Höhenannahmen.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "max_distance_m",
    label: "Maximale Zuordnungsdistanz",
    description: "Maximale Distanz für die Punkt-Gebäude-Zuordnung in der Pipeline.",
    unit: "m",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-point"],
  },
  {
    key: "buffer_multiplier",
    label: "Puffer-Multiplikator",
    description: "Faktor für den sensorseitigen Kandidatenpuffer aus Gebäudehöhe und Einfallswinkel.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-building"],
  },
  {
    key: "min_buffer_m",
    label: "Minimaler Puffer",
    description: "Untergrenze des Kandidatenpuffers für Punkt-Gebäude-Zuordnung.",
    unit: "m",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-building"],
  },
  {
    key: "max_buffer_m",
    label: "Maximaler Puffer",
    description: "Obergrenze des Kandidatenpuffers für Punkt-Gebäude-Zuordnung.",
    unit: "m",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-building"],
  },
  {
    key: "default_height_m",
    label: "Standard-Gebäudehöhe",
    description: "Fallback-Höhe, wenn keine Gebäudehöhe aus der Quelle verfügbar ist.",
    unit: "m",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-building"],
  },
  {
    key: "lateral_slack_m",
    label: "Seitlicher Zusatzpuffer",
    description: "Seitlicher Toleranzpuffer für Kandidatenflächen.",
    unit: "m",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run", "ml-building"],
  },

  {
    key: "cluster_id",
    label: "Cluster-ID",
    description:
      "Kennung des lokalen Punktclusters innerhalb eines Gebäudes und Tracks. " +
      "Suffixe: cluster_<n> (regulär), annex_0/annex_weak (abgetrennter Bauteil-/Anbau-Kandidat), " +
      "foreign (als Fremdpunkt separiert, z.B. Anti-Layover), noise/excluded.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "cluster_role",
    label: "Cluster-Rolle",
    description:
      "Rolle des Punkts im lokalen Cluster: core, weak_support (schwache Stützung, " +
      "u.a. annex_weak- und foreign-Cluster; fliesst nicht in Bewertung/Differential ein), " +
      "noise, excluded oder insufficient_support.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "cluster_kind",
    label: "Cluster-Typ",
    description:
      "Semantischer Cluster-Typ: standard für reguläre Cluster, annex für getrennte Bauteile oder Anbauten und foreign für separierte Fremdreflektoren.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "cluster_probability",
    label: "Cluster-Wahrscheinlichkeit",
    description: "Konfidenz, dass der Punkt zum zugewiesenen Cluster passt.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "cluster_outlier_score",
    label: "Cluster-Ausreißerwert",
    description: "Ausreißerstaerke relativ zum lokalen Cluster. Höhere Werte sind auffälliger.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "cluster_color_index",
    label: "Cluster-Farbindex",
    description: "Technischer Farbindex für die Kartenvisualisierung; keine fachliche Metrik.",
    source: "Frontend/Tile-Visualisierung",
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "quality_score",
    aliases: ["score"],
    label: "Qualitätswert",
    description: "Punktqualität im Bereich 0-1. Höher bedeutet belastbarer; er kombiniert Anomalie, Track-Konsistenz, lokalen Support und Signalqualität.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "anomaly_score",
    label: "Anomaliewert",
    description: "Auffälligkeit des Punkts im Bereich 0-1. Höher bedeutet auffälliger; der Wert kombiniert Cluster-Ausreißer, lokale Abweichung und fachliche Regel-Penalties.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "cross_track_consistency",
    label: "Cross-Track-Konsistenz",
    description: "Konsistenz zwischen Ascending und Descending auf Gebäude-/Clusterkontext. Höher ist besser.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "label",
    label: "ML-Label",
    description: "Abgeleitete Klasse des Punkts: normal, suspect oder outlier.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "feature_set_version",
    label: "Feature-Set-Version",
    description: "Version der erzeugten ML-Features.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "model_set_version",
    label: "Modell-Set-Version",
    description: "Version der Bewertungslogik oder Modellfamilie.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "detector_scores",
    label: "Detektorwerte",
    description: "Teilbewertungen, aus denen der Anomaliewert entsteht.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "cluster_outlier",
    label: "Cluster-Ausreißer-Komponente",
    description: "Teilscore der ML-Punktbewertung aus der Clusterabweichung.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "local_deviation",
    label: "Lokale Abweichung",
    description: "Lokaler Ausreißerwert im Bereich 0-1. Er vergleicht den Punkt mit Punkten desselben Gebäudes und Tracks anhand von Bewegung, Beschleunigung, Zeitreihensprung, Lage zur Radar-Blickrichtung, Höhenrang und Kohärenz. 1 bedeutet: mindestens eine dieser Dimensionen ist maximal auffällig.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "rule_penalty",
    label: "Regel-Penalty",
    description: "Teilscore aus fachlichen Warnregeln wie unsichere Zuordnung, hohe Unsicherheit oder schwacher Support.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "feature_flags",
    label: "Feature-Flags",
    description: "Technische und fachliche Statusflags der Punktbewertung.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "degraded_reason",
    label: "Degradierungsgrund",
    description: "Wichtigster Grund, warum die Punktbewertung herabgestuft wurde.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "height_band",
    label: "Höhenband",
    description: "Abgeleitetes Band der Punktposition relativ zur Gebäudehöhe.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "gate_excluded",
    label: "Durch Gate ausgeschlossen",
    description: "Kennzeichnet Punkte, die vor der Scoring-Logik wegen harter Qualitätsregeln ausgeschlossen wurden.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "gate_reasons",
    label: "Gate-Gründe",
    description: "Liste der harten Ausschlussgründe, zum Beispiel fehlende Gebäudezuordnung, zu wenige Epochen oder niedrige Kohärenz.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "kept_for_scoring",
    label: "Für Scoring behalten",
    description: "Gibt an, ob der Punkt nach den Gates in die normale Bewertung einging.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "explain_top_features",
    label: "Top-Gründe",
    description: "Wichtigste erklärende Faktoren für die Punktbewertung.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "severity",
    label: "Stärke",
    description: "Stärke eines erklärenden Faktors oder Warnsignals.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "summary",
    label: "Zusammenfassung",
    description: "Kurztext eines erklärenden Faktors.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "building_context",
    label: "Gebäude-Kontext",
    description: "Punktbezogene Zuordnungs-, Geometrie-, Terrain- und Nachbarschaftsfeatures zum Gebäude.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "building_source",
    label: "Gebäudequelle",
    description: "Quelle des zugeordneten Gebäudes, aktuell BEV, GBA oder OSM.",
    source: "Gebäude-API / ML-Zuordnung",
    contexts: ["ml-point", "ml-building", "building", "bev", "gba", "osm"],
  },
  {
    key: "building_id",
    label: "Gebäude-ID",
    description: "Kennung des zugeordneten oder ausgewählten Gebäudes in seiner Quelle.",
    source: "Gebäude-API / ML-Zuordnung",
    contexts: ["ml-point", "ml-building", "building", "bev", "gba", "osm"],
  },
  {
    key: "distance_m",
    label: "Distanz zum Gebäude",
    description: "Distanz des Punkts zur zugeordneten Gebäudegeometrie oder zum Kandidatenkontext.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "assignment_method",
    label: "Zuordnungsmethode",
    description: "Methode der Punkt-Gebäude-Zuordnung, zum Beispiel innerhalb Polygon, directional_buffer oder nearest.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "within_building",
    label: "Innerhalb Gebäude",
    description: "Kennzeichnet, ob der Punkt direkt innerhalb der Gebäudegeometrie liegt.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "track_point_count",
    aliases: ["building_track_point_count"],
    label: "Punkte im Track",
    description: "Anzahl zugeordneter Punkte für dieses Gebäude und diesen Track.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "kept_point_count_track",
    label: "Behaltene Punkte im Track",
    description: "Anzahl nicht ausgeschlossener Punkte für Gebäude und Track.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "excluded_point_count_track",
    label: "Ausgeschlossene Punkte im Track",
    description: "Anzahl durch Gates ausgeschlossener Punkte für Gebäude und Track.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "cluster_count_track",
    label: "Cluster im Track",
    description: "Anzahl lokaler Cluster für Gebäude und Track.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "noise_point_count_track",
    label: "Noise-Punkte im Track",
    description: "Anzahl als Noise bewerteter Punkte für Gebäude und Track.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "cluster_member_count",
    label: "Cluster-Mitglieder",
    description: "Anzahl Punkte im zugeordneten lokalen Cluster.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "small_n_fallback",
    label: "Small-N-Fallback",
    description: "Kennzeichnet eine Speziallogik für sehr wenige Punkte, bei der kein vollwertiges Density-Clustering möglich ist.",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "height_rank_in_building",
    label: "Höhenrang im Gebäude",
    description: "Relativer Rang der InSAR-Punkthöhe innerhalb der Punkte am Gebäude. Wird nur als weiches Kontextfeature genutzt.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "building_height",
    aliases: ["building_height_m", "height_m"],
    label: "Gebäudehöhe",
    description: "Höhe des Gebäudes aus GBA oder Fallback. Wird für Kandidatenpuffer und Visualisierung genutzt.",
    unit: "m",
    source: SOURCE_GBA,
    contexts: ["building", "gba", "ml-point", "ml-building"],
  },
  {
    key: "local_density",
    label: "Lokale Punktdichte",
    description: "Normierter Hinweis auf lokale Punktunterstützung innerhalb des Gebäudekontexts.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "step_support",
    label: "Sprung-Support",
    description: "Lokale Unterstützung für einen grossen Zeitreihensprung. Niedrige Werte deuten auf isolierte Spruenge hin.",
    unit: "0-1",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "range_offset_m",
    label: "Reichweitenversatz",
    description: "Sensorseitiger Offset aus Gebäudehöhe und Einfallswinkel für die Kandidatenfläche.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "look_bearing_deg",
    label: "Look-Bearing",
    description: "Radar-Blickrichtung als Azimut im Uhrzeigersinn ab Norden.",
    unit: "Grad",
    source: "Track-Geometrie",
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "sensor_bearing_deg",
    label: "Sensor-Bearing",
    description: "Richtung zum Sensor beziehungsweise Near-Range-Richtung für die Kandidatenverschiebung.",
    unit: "Grad",
    source: "Track-Geometrie",
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "range_dx",
    label: "Range-Vektor X",
    description: "Ost-West-Komponente des sensorseitigen Range-Vektors im metrischen Arbeitsraum.",
    source: "Track-Geometrie",
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "range_dy",
    label: "Range-Vektor Y",
    description: "Nord-Sued-Komponente des sensorseitigen Range-Vektors im metrischen Arbeitsraum.",
    source: "Track-Geometrie",
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "range_shift_x_m",
    label: "Range-Shift X",
    description: "Metrische Ost-West-Verschiebung der Kandidatenfläche.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "range_shift_y_m",
    label: "Range-Shift Y",
    description: "Metrische Nord-Sued-Verschiebung der Kandidatenfläche.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "buffer_m",
    label: "Kandidatenpuffer",
    description: "Effektiver Puffer für die Zuordnung eines Punkts zum sensorseitigen Gebäudekandidaten.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "along_look_offset_m",
    label: "Offset entlang Look",
    description: "Punktposition relativ zum Gebäude entlang der Look-Richtung.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "cross_look_offset_m",
    label: "Offset quer zum Look",
    description: "Punktposition relativ zum Gebäude quer zur Look-Richtung.",
    unit: "m",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point"],
  },
  {
    key: "vertical_proxy",
    aliases: ["median_vertical_proxy_mm_a"],
    label: "Vertikal-Proxy",
    description: "Vorzeichenbewahrende Näherung aus LOS-Geschwindigkeit und Einfallswinkel. Keine echte 3D- oder 2D-Dekomposition.",
    unit: "mm/Jahr",
    source: SOURCE_ML_POINT,
    contexts: ["ml-point", "ml-building"],
  },

  {
    key: "valid_epoch_count",
    label: "Gueltige Epochen",
    description: "Anzahl verfügbarer Verschiebungsmessungen in der Punktzeitreihe.",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "valid_epoch_ratio",
    label: "Zeitreihen-Abdeckung",
    description: "Anteil verfügbarer Verschiebungsepochen gegenüber der erwarteten Track-Zeitreihe.",
    unit: "0-1",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "timeseries_available",
    label: "Zeitreihe verfügbar",
    description: "Kennzeichnet, ob genügend Verschiebungswerte für Zeitreihenfeatures vorhanden sind.",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "ts_slope",
    label: "Zeitreihen-Trend",
    description: "Aus der Verschiebungszeitreihe geschätzter Trend.",
    unit: "mm/Jahr",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "ts_residual_std",
    label: "Zeitreihen-Reststreuung",
    description: "Standardabweichung der Residuen gegenüber einem linearen Trend.",
    unit: "mm",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "ts_max_abs_delta",
    aliases: ["ts_primary_step_abs"],
    label: "Groesster Zeitreihensprung",
    description: "Groesste absolute Differenz zwischen zwei aufeinanderfolgenden Verschiebungswerten.",
    unit: "mm",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "ts_roughness",
    label: "Zeitreihen-Rauigkeit",
    description: "Mittlere absolute Aenderung zwischen benachbarten Zeitpunkten.",
    unit: "mm",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "ts_missing_rate",
    label: "Fehlende Zeitreihenwerte",
    description: "Anteil fehlender Verschiebungsepochen.",
    unit: "0-1",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "amplitude_available",
    label: "Amplitude verfügbar",
    description: "Kennzeichnet, ob Amplituden-Zeitreihenwerte für den Punkt vorliegen.",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "amp_ts_mean",
    label: "Amplitude-Zeitreihenmittel",
    description: "Mittelwert der Amplitudenzeitreihe.",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "amp_ts_std",
    label: "Amplitude-Zeitreihenstreuung",
    description: "Standardabweichung der Amplitudenzeitreihe.",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "amp_ts_cv",
    label: "Amplitude-Variationskoeffizient",
    description: "Relative Streuung der Amplitude. Hohe Werte deuten auf instabilere Rückstreuung hin.",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },
  {
    key: "amp_ts_spike_rate",
    label: "Amplitude-Spike-Rate",
    description: "Anteil auffälliger Amplitudenausreißer in der Amplitudenzeitreihe.",
    unit: "0-1",
    source: SOURCE_TS,
    contexts: ["timeseries", "ml-point"],
  },

  {
    key: "cross_track_summary",
    label: "Cross-Track-Zusammenfassung",
    description: "Gebäudeweite Zusammenfassung des Ascending/Descending-Vergleichs.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "allowed_diff_mm_a",
    label: "Zulaessige Track-Differenz",
    description: "Terrainabhängige Toleranz für Differenzen zwischen Track-Bewegungen.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "diff_before_mm_a",
    label: "Track-Differenz vor Filterung",
    description: "Differenz der Track-Bewegung vor lokaler Cluster-/Gate-Filterung.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "diff_after_mm_a",
    label: "Track-Differenz nach Filterung",
    description: "Differenz der Hauptcluster-Bewegung nach lokaler Filterung.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "consistency",
    label: "Konsistenz",
    description: "Normierte Cross-Track-Konsistenz. Höher ist besser.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "full_support",
    label: "Voller Track-Support",
    description: "Beide Tracks haben ausreichenden Hauptcluster-Support für einen belastbaren Vergleich.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },

  {
    key: "point_count",
    label: "Punktanzahl",
    description: "Anzahl der Punkte in einem Gebäude-, Cluster- oder Visualisierungskontext.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-run"],
  },
  {
    key: "kept_point_count",
    label: "Behaltene Punkte",
    description: "Anzahl Punkte, die nicht durch harte Gates ausgeschlossen wurden.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-run"],
  },
  {
    key: "excluded_point_count",
    label: "Ausgeschlossene Punkte",
    description: "Anzahl Punkte, die durch harte Gates ausgeschlossen wurden.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-run"],
  },
  {
    key: "noise_point_count",
    aliases: ["noise_points"],
    label: "Noise-Punkte",
    description: "Anzahl Punkte, die als lokales Clusterrauschen markiert wurden.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-run"],
  },
  {
    key: "cluster_count",
    label: "Clusteranzahl",
    description: "Anzahl erkannter lokaler Cluster.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-run"],
  },
  {
    key: "reliable_cluster_count",
    label: "Verlaessliche Cluster",
    description: "Anzahl Cluster mit ausreichendem Support und Signal für Gebäuderollups.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "building_motion_mm_a",
    label: "Gebäudebewegung",
    description: "Gebäudeweiter Bewegungswert aus den Hauptclustern. Es ist ein vorsichtiger Rollup, keine zertifizierte Bauwerksdiagnose.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "building_reliability_score",
    label: "Gebäude-Verlaesslichkeit",
    description: "Konfidenz des Gebäuderollups aus Support, Signal, Zuordnungsqualität und Track-Konsistenz.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "building_reliability_band",
    label: "Verlaesslichkeitsband",
    description: "Diskrete Einordnung des Gebäude-Reliability-Scores, zum Beispiel high, medium oder low.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "track_agreement_score",
    label: "Track-Übereinstimmung",
    description: "Gebäudeweite Übereinstimmung zwischen den Hauptclustern der verfügbaren Tracks.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "weak_secondary_track_flag",
    label: "Schwacher Sekundärtrack",
    description: "Flag für zu schwachen Support in einem der verfügbaren Sekundärtracks.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "agreement_tension_flag",
    label: "Track-Spannung",
    description: "Flag für sehr niedrige Track-Übereinstimmung trotz grundsätzlichem Support.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "reliability_penalties",
    label: "Reliability-Anpassungen",
    description: "Liste weicher Abwertungen oder Band-Caps für die Gebäude-Verlaesslichkeit.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "score_delta",
    label: "Score-Aenderung",
    description: "Numerische Anpassung eines Reliability-Penalty.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "cap_band",
    label: "Band-Obergrenze",
    description: "Maximal erlaubtes Reliability-Band nach einer Penalty-Regel.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "threshold_min_points",
    label: "Mindestpunkt-Schwelle",
    description: "Schwellenwert einer Reliability-Regel für minimale Punktanzahl.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "threshold_max_score",
    label: "Maximaler Score-Schwellenwert",
    description: "Schwellenwert einer Reliability-Regel für niedrige Scores.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "observed_score",
    label: "Beobachteter Score",
    description: "Tatsaechlich beobachteter Score, der eine Reliability-Regel ausgeloest hat.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "differential_motion_level",
    label: "Differentielle Bewegung (Stufe)",
    description: "Vierstufige Bewertung der differentiellen Bewegung: keine, Kandidat (Delta überschreitet Schwelle), signifikant (Delta > 2*Sigma) oder bestätigt (zweite Geometrie bestätigt das Vorzeichen). Ein leerer Wert kennzeichnet einen historischen Modellstand ohne Differential-Level. Plausibilitaets-Downgrades (Saisonamplitude, instabile Amplitude) drücken zurück auf Kandidat.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "building_status",
    label: "Gebäudestatus",
    description: "Fachlicher Status des Gebäuderollups, etwa ok, single_track_only, small_n oder insufficient_support.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "main_cluster_by_track",
    label: "Hauptcluster je Track",
    description: "Hauptcluster-IDs pro konfiguriertem Track.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "track_motion_mm_a",
    label: "Track-Bewegung",
    description: "Bewegungswerte der Hauptcluster je Track.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "track_counts",
    label: "Punktanzahl je Track",
    description: "Zähler der zugeordneten Punkte nach Track.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "label_counts",
    label: "Label-Zähler",
    description: "Zähler der Punktlabels im Gebäudekontext.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "assignment_methods",
    label: "Zuordnungsmethoden",
    description: "Zähler der verwendeten Punkt-Gebäude-Zuordnungsmethoden.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "avg_quality_score",
    label: "Mittlere Punktqualität",
    description: "Durchschnittlicher Qualitätswert der Punkte am Gebäude.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "avg_anomaly_score",
    label: "Mittlere Anomalie",
    description: "Durchschnittlicher Anomaliewert der Punkte am Gebäude.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "avg_cross_track_consistency",
    label: "Mittlere Cross-Track-Konsistenz",
    description: "Durchschnittliche Cross-Track-Konsistenz der Punkte am Gebäude.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "median_distance_m",
    label: "Median-Distanz",
    description: "Median der Punktdistanzen zur Gebäudezuordnung.",
    unit: "m",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "clusters",
    label: "Cluster",
    description: "Liste der Clusterzusammenfassungen für das Gebäude.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "top_points",
    label: "Auffällige Punkte",
    description: "Auswahl der niedrigsten Qualitätswerte beziehungsweise auffälligsten Punkte am Gebäude.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "cluster_rank",
    label: "Cluster-Rang",
    description: "Sortierter Rang eines Clusters innerhalb von Gebäude und Track. Rang 1 ist der Hauptcluster.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "is_main_cluster",
    label: "Hauptcluster",
    description: "Kennzeichnet den Hauptcluster eines Tracks am Gebäude.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building", "ml-point"],
  },
  {
    key: "median_velocity_mm_a",
    label: "Median-Geschwindigkeit",
    description: "Median der LOS-Geschwindigkeit im Cluster.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "median_coherence",
    label: "Median-Kohärenz",
    description: "Median der Kohärenzwerte im Cluster.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "median_height_rank",
    label: "Median-Höhenrang",
    description: "Median des relativen Höhenrangs der Clusterpunkte am Gebäude.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "cluster_reliability_score",
    label: "Cluster-Verlaesslichkeit",
    description: "Konfidenz eines lokalen Clusters aus Support, Signal und Zuordnungsqualität.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "motion_delta_to_main_mm_a",
    label: "Differenz zum Hauptcluster",
    description: "Absolute Bewegungsdifferenz zwischen Cluster und Hauptcluster desselben Tracks.",
    unit: "mm/Jahr",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "cluster_centroid_x_m",
    label: "Clusterzentrum X",
    description: "Metrische X-Koordinate des Clusterzentrums im Arbeits-CRS.",
    unit: "m",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "cluster_centroid_y_m",
    label: "Clusterzentrum Y",
    description: "Metrische Y-Koordinate des Clusterzentrums im Arbeits-CRS.",
    unit: "m",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },

  {
    key: "neighbour_context",
    label: "Nachbarschaftskontext",
    description: "Kontext zu benachbarten Gebäuden und Clustern zur Plausibilisierung der Zuordnung.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "context_available",
    aliases: ["neighbour_context_available"],
    label: "Nachbarschaft verfügbar",
    description: "Gibt an, ob verwertbarer Nachbarschaftskontext vorhanden ist.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "candidate_neighbour_count",
    aliases: ["neighbour_candidate_building_count"],
    label: "Nachbar-Kandidaten",
    description: "Anzahl benachbarter Gebäude, die für Kontextprüfung betrachtet wurden.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "eligible_neighbour_cluster_count",
    label: "Verwertbare Nachbarcluster",
    description: "Anzahl Nachbarcluster mit ausreichendem Support für einen Punktvergleich.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "best_neighbour_building_id",
    label: "Bester Nachbar",
    description: "Gebäude-ID des am besten passenden Nachbarclusters.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "best_neighbour_cluster_id",
    label: "Bester Nachbarcluster",
    description: "Cluster-ID des am besten passenden Nachbarclusters.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "own_cluster_fit_score",
    label: "Fit eigener Cluster",
    description: "Wie gut der Punkt zum eigenen Cluster passt. Höher ist besser.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point"],
  },
  {
    key: "neighbour_fit_score",
    label: "Fit Nachbarcluster",
    description: "Wie gut der Punkt zu einem Nachbarcluster passen würde. Höher ist besser.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point"],
  },
  {
    key: "neighbour_fit_delta",
    label: "Nachbar-Fit-Delta",
    description: "Differenz zwischen bestem Nachbarfit und eigenem Clusterfit. Hohe positive Werte können Fehlzuordnung anzeigen.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point"],
  },
  {
    key: "own_fit_weak_flag",
    label: "Schwacher Eigenfit",
    description: "Flag für schwachen Fit des Punkts zum eigenen Cluster.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point"],
  },
  {
    key: "neighbour_misassignment_flag",
    label: "Mögliche Fehlzuordnung",
    description: "Flag, wenn der Punkt fachlich besser zu einem Nachbarcluster passen könnte.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point"],
  },
  {
    key: "neighbour_misassignment_point_count",
    label: "Fehlzuordnungs-Punkte",
    description: "Anzahl Punkte am Gebäude mit möglichem besserem Nachbarfit.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "neighbour_misassignment_share",
    label: "Fehlzuordnungs-Anteil",
    description: "Anteil der behaltenen Punkte mit möglichem besserem Nachbarfit.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "neighbour_event_flag",
    aliases: ["neighbour_event_candidate_flag"],
    label: "Nachbarschaftsereignis",
    description: "Flag für ein durch benachbarte Gebäude unterstütztes Bewegungsereignis.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "neighbour_event_score",
    label: "Nachbarschaftsereignis-Score",
    description: "Stärke eines durch Nachbarcluster gestützten Ereignisses.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "neighbour_consistency_score",
    aliases: ["best_neighbour_consistency_score"],
    label: "Nachbarschafts-Konsistenz",
    description: "Konsistenz der Gebäudebewegung mit unterstützenden Nachbarclustern.",
    unit: "0-1",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },
  {
    key: "supporting_neighbour_count",
    aliases: ["supporting_neighbour_building_count"],
    label: "Unterstützende Nachbarn",
    description: "Anzahl Nachbargebäude, deren Cluster das Ereignis oder den Kontext stützen.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-point", "ml-building"],
  },
  {
    key: "supporting_track_count",
    label: "Unterstützende Tracks",
    description: "Anzahl Tracks mit Nachbarschaftsunterstützung.",
    source: SOURCE_ML_BUILDING,
    contexts: ["ml-building"],
  },

  {
    key: "total_points",
    label: "Punkte gesamt",
    description: "Anzahl aller vom Run betrachteten Punkte.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "assigned_points",
    label: "Zugeordnete Punkte",
    description: "Anzahl Punkte mit Gebäudezuordnung.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "assigned_buildings",
    label: "Zugeordnete Gebäude",
    description: "Anzahl Gebäude mit mindestens einem zugeordneten Punkt.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "kept_points",
    label: "Behaltene Punkte",
    description: "Anzahl Punkte, die nach den Gates in die Bewertung eingingen.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "gate_excluded_points",
    label: "Gate-ausgeschlossene Punkte",
    description: "Anzahl Punkte, die wegen harter Qualitätsregeln ausgeschlossen wurden.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "normal_points",
    label: "Normale Punkte",
    description: "Anzahl Punkte mit Label `normal`.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "suspect_points",
    label: "Verdachts-Punkte",
    description: "Anzahl Punkte mit Label `suspect`.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "outlier_points",
    label: "Ausreißer-Punkte",
    description: "Anzahl Punkte mit Label `outlier`.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "buildings_with_clusters",
    label: "Gebäude mit Clustern",
    description: "Anzahl Gebäude, für die Cluster gebildet wurden.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "multi_cluster_buildings",
    label: "Mehrcluster-Gebäude",
    description: "Anzahl Gebäude mit mehr als einem verlässlichen Cluster.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "small_n_buildings",
    label: "Small-N-Gebäude",
    description: "Anzahl Gebäude mit sehr wenig Punktunterstützung.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "full_cross_track_points",
    label: "Punkte mit vollem Cross-Track-Support",
    description: "Anzahl Punkte in Gebäuden mit verwertbarem Support aus allen relevanten Tracks.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "buildings_with_full_track_support",
    label: "Gebäude mit vollem Track-Support",
    description: "Anzahl Gebäude mit behaltenen Punkten in mehreren Tracks.",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "median_cross_track_diff_before",
    label: "Median-Differenz vor Filterung",
    description: "Median der Track-Differenzen vor lokaler Filterung.",
    unit: "mm/Jahr",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "median_cross_track_diff_after",
    label: "Median-Differenz nach Filterung",
    description: "Median der Track-Differenzen nach lokaler Filterung.",
    unit: "mm/Jahr",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },
  {
    key: "cross_track_improvement",
    label: "Cross-Track-Verbesserung",
    description: "Differenz zwischen Median-Differenz vor und nach lokaler Filterung. Positive Werte bedeuten bessere Track-Übereinstimmung nach Filterung.",
    unit: "mm/Jahr",
    source: SOURCE_ML_RUN,
    contexts: ["ml-run"],
  },

  {
    key: "id",
    label: "ID",
    description: "Quell-ID eines Objekts. Im Fachkontext sollte nach Quelle unterschieden werden.",
    source: "Gebäude- oder Rohdatenquelle",
    contexts: ["building", "bev", "gba", "osm", "raw"],
  },
  {
    key: "bev_id",
    label: "BEV-ID",
    description: "Eindeutige Objektkennung aus dem BEV DLM-Bauwerke Import.",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "height_m",
    aliases: ["height_median_m"],
    label: "BEV-Gebäudehöhe",
    description: "Normalisierte BEV-Objekthöhe. Bevorzugt wird die Medianhöhe, ersatzweise die Maximalhöhe.",
    unit: "m",
    source: SOURCE_BEV,
    contexts: ["bev", "building", "ml-building"],
  },
  {
    key: "height_max_m",
    label: "BEV-Maximalhöhe",
    description: "Maximale BEV-Objekthöhe des Bauwerks.",
    unit: "m",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "height_eaves_m",
    label: "BEV-Traufhöhe",
    description: "BEV-Traufhöhe des Bauwerks, falls vorhanden.",
    unit: "m",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "ground_median_m",
    label: "BEV-Bodenhöhe Median",
    description: "Median der BEV-Bodenhöhe am Bauwerk.",
    unit: "m",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "height_quality",
    label: "Höhenqualität",
    description: "Aus der BEV-Erfassungsart abgeleitete Höhenqualität, zum Beispiel measured, default oder unknown.",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "agwr_object_number",
    label: "AGWR-Objektnummer",
    description: "AGWR-Objektnummer, falls das BEV-Bauwerk damit verknüpft ist.",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "building_function",
    label: "Bauwerksfunktion",
    description: "BEV-Funktions-/Nutzungsklasse des Bauwerks.",
    source: SOURCE_BEV,
    contexts: ["bev", "building"],
  },
  {
    key: "gba_id",
    label: "GBA-ID",
    description: "Eindeutige Gebäude-ID aus dem Global Building Atlas Import.",
    source: SOURCE_GBA,
    contexts: ["gba", "building"],
  },
  {
    key: "osm_id",
    label: "OSM-ID",
    description: "OpenStreetMap Objekt-ID des Gebäudes.",
    source: SOURCE_OSM,
    contexts: ["osm", "building"],
  },
  {
    key: "height",
    aliases: ["Height", "HEIGHT", "bldg_height"],
    label: "Gebäudehöhe",
    description: "Gebäudehöhe aus der Gebäudequelle oder normalisiertem Import.",
    unit: "m",
    source: `${SOURCE_BEV} / ${SOURCE_GBA}`,
    contexts: ["bev", "gba", "building"],
  },
  {
    key: "properties",
    label: "Gebäude-Rohattribute",
    description: "JSON-Objekt mit beim Import erhaltenen BEV- oder GBA-Attributen.",
    source: `${SOURCE_BEV} / ${SOURCE_GBA}`,
    contexts: ["bev", "gba", "building", "raw"],
  },
  {
    key: "tags",
    label: "OSM-Tags",
    description: "JSON-Objekt mit OSM-Tags des Gebäudes.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "name",
    label: "Name",
    description: "Name des Objekts, falls in der Quelle vorhanden.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "building",
    label: "OSM-Gebäudetyp",
    description: "OSM-Tag `building`, zum Beispiel yes, residential, commercial oder church.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "building_type",
    label: "Gebäudetyp",
    description: "Normalisierter Gebäudetyp aus dem OSM-Tag `building`.",
    source: SOURCE_OSM,
    contexts: ["osm", "building"],
  },
  {
    key: "building:levels",
    aliases: ["levels"],
    label: "OSM-Geschosse",
    description: "OSM-Angabe zur Anzahl oberirdischer Gebäudeebenen.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "building:material",
    label: "OSM-Baumaterial",
    description: "OSM-Angabe zum Gebäudematerial, falls gepflegt.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "building:use",
    label: "OSM-Nutzung",
    description: "OSM-Angabe zur Gebäudenutzung, falls gepflegt.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "roof:shape",
    label: "OSM-Dachform",
    description: "OSM-Angabe zur Dachform.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "roof:levels",
    label: "OSM-Dachebenen",
    description: "OSM-Angabe zur Anzahl der Dachebenen.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "roof:height",
    label: "OSM-Dachhöhe",
    description: "OSM-Angabe zur Dachhöhe.",
    unit: "m",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "addr:street",
    label: "OSM-Strasse",
    description: "OSM-Adress-Tag für die Strasse.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "addr:housenumber",
    label: "OSM-Hausnummer",
    description: "OSM-Adress-Tag für die Hausnummer.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "addr:postcode",
    label: "OSM-Postleitzahl",
    description: "OSM-Adress-Tag für die Postleitzahl.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "addr:city",
    label: "OSM-Ort",
    description: "OSM-Adress-Tag für Ort oder Stadt.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "amenity",
    label: "OSM-Einrichtung",
    description: "OSM-Tag für eine Einrichtung oder Nutzungsart, zum Beispiel school oder hospital.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "shop",
    label: "OSM-Shop",
    description: "OSM-Tag für Einzelhandelsnutzung.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "tourism",
    label: "OSM-Tourismus",
    description: "OSM-Tag für touristische Nutzung oder Objekte.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "historic",
    label: "OSM-Historisch",
    description: "OSM-Tag für historische Objekte oder Schutzkontext.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "layer",
    label: "OSM-Layer",
    description: "OSM-Layer-Tag für vertikale Zeichnungs-/Topologieebenen.",
    source: SOURCE_OSM,
    contexts: ["osm", "building", "raw"],
  },
  {
    key: "source",
    label: "OSM-Quellhinweis",
    description: "OSM-Tag für den vom Mapper angegebenen Datenquellenhinweis.",
    source: SOURCE_OSM,
    contexts: ["osm", "raw"],
  },
];

export const attributeMetadataEntries: AttributeMetadata[] = definitions.map(
  ({ aliases: _aliases, contexts: _contexts, ...metadata }) => ({
    ...metadata,
    known: true,
  })
);

/**
 * Alle bekannten Attribut-Eintraege für das Glossar, dedupliziert nach
 * Key + Label (Kontextvarianten mit identischem Label erscheinen einmal).
 */
export function listAttributeMetadata(): AttributeMetadata[] {
  const seen = new Set<string>();
  const entries: AttributeMetadata[] = [];
  for (const entry of attributeMetadataEntries) {
    const dedupeKey = `${entry.key}::${entry.label}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    entries.push(entry);
  }
  return entries.sort((a, b) => a.label.localeCompare(b.label, "de"));
}

const globalMetadata = new Map<string, AttributeMetadata>();
const contextualMetadata = new Map<string, AttributeMetadata>();

function normalizeAttributeKey(key: string) {
  return key.trim().replace(/\s+/g, "_").toLowerCase();
}

function contextualKey(context: AttributeContext, key: string) {
  return `${context}:${normalizeAttributeKey(key)}`;
}

function registerMetadata(
  map: Map<string, AttributeMetadata>,
  mapKey: string,
  metadata: AttributeMetadata
) {
  if (!map.has(mapKey)) {
    map.set(mapKey, metadata);
  }
}

for (const definition of definitions) {
  const { aliases = [], contexts, ...metadataBase } = definition;
  const keys = [definition.key, ...aliases];
  if (contexts?.length) {
    for (const context of contexts) {
      const metadata: AttributeMetadata = {
        ...metadataBase,
        context,
        known: true,
      };
      for (const key of keys) {
        registerMetadata(contextualMetadata, contextualKey(context, key), metadata);
      }
    }
  } else {
    const metadata: AttributeMetadata = {
      ...metadataBase,
      known: true,
    };
    for (const key of keys) {
      registerMetadata(globalMetadata, normalizeAttributeKey(key), metadata);
    }
  }
}

const contextFallbacks: Record<AttributeContext, AttributeContext[]> = {
  "insar-point": ["insar-point", "raw"],
  terrain: ["terrain", "raw"],
  timeseries: ["timeseries", "insar-point", "raw"],
  "ml-point": ["ml-point", "insar-point", "timeseries", "terrain", "raw"],
  "ml-building": ["ml-building", "building", "terrain", "raw"],
  "ml-run": ["ml-run", "raw"],
  bev: ["bev", "building", "raw"],
  gba: ["gba", "building", "raw"],
  osm: ["osm", "building", "raw"],
  building: ["building", "bev", "gba", "osm", "terrain", "raw"],
  raw: ["raw"],
};

export function getAttributeMetadata(
  key: string,
  context?: AttributeContext
): AttributeMetadata {
  const normalized = normalizeAttributeKey(key);
  if (context) {
    for (const candidateContext of contextFallbacks[context]) {
      const contextual = contextualMetadata.get(contextualKey(candidateContext, normalized));
      if (contextual) {
        return contextual;
      }
    }
  }

  const global = globalMetadata.get(normalized);
  if (global) {
    return global;
  }

  return getFallbackMetadata(key, context);
}

export function formatAttributeLabel(key: string, context?: AttributeContext) {
  return getAttributeMetadata(key, context).label;
}

export function hasKnownAttributeMetadata(key: string, context?: AttributeContext) {
  return getAttributeMetadata(key, context).known;
}

function getFallbackMetadata(key: string, context?: AttributeContext): AttributeMetadata {
  const date = parseDateField(key);
  if (date) {
    const isAmplitudeContext = context === "timeseries" || context === "raw";
    return {
      key,
      label: isAmplitudeContext
        ? `Zeitreihenwert ${date}`
        : `Verschiebung ${date}`,
      description:
        "Rohes Datumsfeld aus einer Zeitreihenquelle. Je nach Ursprungsdatei steht es für LOS-Verschiebung oder SAR-Amplitude.",
      source: SOURCE_TS,
      context,
      known: false,
    };
  }

  const source = fallbackSource(context, key);
  return {
    key,
    label: humanizeAttributeKey(key),
    description: fallbackDescription(context, key),
    source,
    context,
    known: false,
  };
}

function parseDateField(key: string) {
  const match = key.trim().match(/^[dD](\d{4})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function fallbackSource(context: AttributeContext | undefined, key: string) {
  if (context === "osm" || key.includes(":")) {
    return SOURCE_OSM;
  }
  if (context === "bev") {
    return SOURCE_BEV;
  }
  if (context === "gba") {
    return SOURCE_GBA;
  }
  if (context === "terrain") {
    return SOURCE_TERRAIN;
  }
  if (context === "ml-point") {
    return SOURCE_ML_POINT;
  }
  if (context === "ml-building") {
    return SOURCE_ML_BUILDING;
  }
  if (context === "ml-run") {
    return SOURCE_ML_RUN;
  }
  if (context === "timeseries") {
    return SOURCE_TS;
  }
  if (context === "insar-point") {
    return SOURCE_INSAR;
  }
  return "Rohattribut";
}

function fallbackDescription(context: AttributeContext | undefined, key: string) {
  if (context === "osm" || key.includes(":")) {
    return "OSM-Roh-Tag ohne spezifische Fachbeschreibung im Registry. Wert direkt aus den importierten OSM-Tags prüfen.";
  }
  if (context === "bev") {
    return "BEV-Rohattribut ohne spezifische Fachbeschreibung im Registry. Wert direkt aus den importierten BEV-DLM-Bauwerksattributen prüfen.";
  }
  if (context === "gba") {
    return "GBA-Rohattribut ohne spezifische Fachbeschreibung im Registry. Wert direkt aus den importierten GBA-Properties prüfen.";
  }
  if (context === "ml-point" || context === "ml-building" || context === "ml-run") {
    return "ML-Attribut ohne spezifische Fachbeschreibung im Registry. Wert als technische Pipeline-Ausgabe interpretieren und bei Bedarf gegen die Pipeline-Dokumentation prüfen.";
  }
  if (context === "terrain") {
    return "Terrain-Attribut ohne spezifische Fachbeschreibung im Registry. Wert stammt aus dem Terrain-Kontext.";
  }
  if (context === "timeseries") {
    return "Zeitreihenattribut ohne spezifische Fachbeschreibung im Registry. Wert stammt aus der Punkt-Zeitreihe.";
  }
  if (context === "insar-point") {
    return "InSAR-Punktattribut ohne spezifische Fachbeschreibung im Registry. Wert stammt aus den normalisierten Punktdaten.";
  }
  return "Rohattribut ohne spezifische Fachbeschreibung im Registry. Wert im Quellkontext prüfen.";
}

function humanizeAttributeKey(key: string) {
  const words = key
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/:/g, ": ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "Unbekanntes Attribut";
  }

  return words.map(formatWord).join(" ");
}

function formatWord(word: string) {
  const lower = word.toLowerCase();
  const acronyms = new Set([
    "id",
    "bev",
    "osm",
    "gba",
    "agwr",
    "als",
    "los",
    "ml",
    "ps",
    "ds",
    "srtm",
    "utm",
    "x",
    "y",
  ]);
  if (acronyms.has(lower)) {
    return lower.toUpperCase();
  }
  return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
}
