ALTER TABLE IF EXISTS insar_points
    ADD COLUMN IF NOT EXISTS area_id TEXT,
    ADD COLUMN IF NOT EXISTS dataset_id TEXT,
    ADD COLUMN IF NOT EXISTS sensor TEXT,
    ADD COLUMN IF NOT EXISTS look_angle DOUBLE PRECISION;

UPDATE insar_points
SET area_id = COALESCE(area_id, 'salzburg'),
    dataset_id = COALESCE(dataset_id, 'salzburg_snt'),
    sensor = COALESCE(sensor, CASE
        WHEN COALESCE(dataset_id, 'salzburg_snt') IN ('salzburg_snt', 'bad_gastein_snt') THEN 'SNT'
        WHEN COALESCE(dataset_id, 'salzburg_snt') = 'bad_gastein_tsx_paz' THEN 'TSX/PAZ'
        ELSE NULL
    END)
WHERE area_id IS NULL OR dataset_id IS NULL OR sensor IS NULL;

ALTER TABLE IF EXISTS insar_points
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN dataset_id DROP DEFAULT,
    ALTER COLUMN sensor DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL,
    ALTER COLUMN dataset_id SET NOT NULL,
    ALTER COLUMN sensor SET NOT NULL;

ALTER TABLE IF EXISTS insar_points DROP CONSTRAINT IF EXISTS insar_points_pkey;
ALTER TABLE IF EXISTS insar_points ADD PRIMARY KEY (area_id, dataset_id, code, track);
CREATE INDEX IF NOT EXISTS insar_points_area_idx ON insar_points (area_id);
DROP INDEX IF EXISTS insar_points_track_idx;
CREATE INDEX insar_points_track_idx ON insar_points (area_id, dataset_id, track);

ALTER TABLE IF EXISTS insar_timeseries
    ADD COLUMN IF NOT EXISTS area_id TEXT,
    ADD COLUMN IF NOT EXISTS dataset_id TEXT;

UPDATE insar_timeseries
SET area_id = COALESCE(area_id, 'salzburg'),
    dataset_id = COALESCE(dataset_id, 'salzburg_snt')
WHERE area_id IS NULL OR dataset_id IS NULL;

ALTER TABLE IF EXISTS insar_timeseries
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN dataset_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL,
    ALTER COLUMN dataset_id SET NOT NULL;

ALTER TABLE IF EXISTS insar_timeseries DROP CONSTRAINT IF EXISTS insar_timeseries_pkey;
ALTER TABLE IF EXISTS insar_timeseries ADD PRIMARY KEY (area_id, dataset_id, code, track, date);
DROP INDEX IF EXISTS insar_timeseries_code_idx;
CREATE INDEX insar_timeseries_code_idx ON insar_timeseries (area_id, dataset_id, code, track);

ALTER TABLE IF EXISTS insar_amplitude_timeseries
    ADD COLUMN IF NOT EXISTS area_id TEXT,
    ADD COLUMN IF NOT EXISTS dataset_id TEXT;

UPDATE insar_amplitude_timeseries
SET area_id = COALESCE(area_id, 'salzburg'),
    dataset_id = COALESCE(dataset_id, 'salzburg_snt')
WHERE area_id IS NULL OR dataset_id IS NULL;

ALTER TABLE IF EXISTS insar_amplitude_timeseries
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN dataset_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL,
    ALTER COLUMN dataset_id SET NOT NULL;

ALTER TABLE IF EXISTS insar_amplitude_timeseries DROP CONSTRAINT IF EXISTS insar_amplitude_timeseries_pkey;
ALTER TABLE IF EXISTS insar_amplitude_timeseries ADD PRIMARY KEY (area_id, dataset_id, code, track, date);
DROP INDEX IF EXISTS insar_amplitude_timeseries_code_idx;
CREATE INDEX insar_amplitude_timeseries_code_idx ON insar_amplitude_timeseries (area_id, dataset_id, code, track);

ALTER TABLE IF EXISTS insar_point_terrain
    ADD COLUMN IF NOT EXISTS area_id TEXT,
    ADD COLUMN IF NOT EXISTS dataset_id TEXT;

UPDATE insar_point_terrain
SET area_id = COALESCE(area_id, 'salzburg'),
    dataset_id = COALESCE(dataset_id, 'salzburg_snt')
WHERE area_id IS NULL OR dataset_id IS NULL;

ALTER TABLE IF EXISTS insar_point_terrain
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN dataset_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL,
    ALTER COLUMN dataset_id SET NOT NULL;

ALTER TABLE IF EXISTS insar_point_terrain DROP CONSTRAINT IF EXISTS insar_point_terrain_pkey;
ALTER TABLE IF EXISTS insar_point_terrain ADD PRIMARY KEY (area_id, dataset_id, code, track);
DROP INDEX IF EXISTS insar_point_terrain_source_idx;
CREATE INDEX insar_point_terrain_source_idx
    ON insar_point_terrain (area_id, dataset_id, terrain_source);

ALTER TABLE IF EXISTS gba_buildings
    ADD COLUMN IF NOT EXISTS area_id TEXT;

UPDATE gba_buildings
SET area_id = COALESCE(area_id, 'salzburg')
WHERE area_id IS NULL;

ALTER TABLE IF EXISTS gba_buildings
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL;

ALTER TABLE IF EXISTS gba_buildings DROP CONSTRAINT IF EXISTS gba_buildings_pkey;
ALTER TABLE IF EXISTS gba_buildings ADD PRIMARY KEY (area_id, gba_id);
CREATE INDEX IF NOT EXISTS gba_buildings_area_idx ON gba_buildings (area_id);

ALTER TABLE IF EXISTS osm_buildings
    ADD COLUMN IF NOT EXISTS area_id TEXT;

UPDATE osm_buildings
SET area_id = COALESCE(area_id, 'salzburg')
WHERE area_id IS NULL;

ALTER TABLE IF EXISTS osm_buildings
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL;

ALTER TABLE IF EXISTS osm_buildings DROP CONSTRAINT IF EXISTS osm_buildings_pkey;
ALTER TABLE IF EXISTS osm_buildings ADD PRIMARY KEY (area_id, osm_id);
CREATE INDEX IF NOT EXISTS osm_buildings_area_idx ON osm_buildings (area_id);

ALTER TABLE IF EXISTS building_terrain_context
    ADD COLUMN IF NOT EXISTS area_id TEXT;

UPDATE building_terrain_context
SET area_id = COALESCE(area_id, 'salzburg')
WHERE area_id IS NULL;

ALTER TABLE IF EXISTS building_terrain_context
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL;

ALTER TABLE IF EXISTS building_terrain_context DROP CONSTRAINT IF EXISTS building_terrain_context_pkey;
ALTER TABLE IF EXISTS building_terrain_context ADD PRIMARY KEY (area_id, building_source, building_id);
DROP INDEX IF EXISTS building_terrain_context_source_idx;
CREATE INDEX building_terrain_context_source_idx
    ON building_terrain_context (area_id, terrain_source, building_source);

ALTER TABLE IF EXISTS ml_runs
    ADD COLUMN IF NOT EXISTS area_id TEXT,
    ADD COLUMN IF NOT EXISTS dataset_id TEXT;

UPDATE ml_runs
SET area_id = COALESCE(area_id, 'salzburg'),
    dataset_id = COALESCE(dataset_id, 'salzburg_snt')
WHERE area_id IS NULL OR dataset_id IS NULL;

ALTER TABLE IF EXISTS ml_runs
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN dataset_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL,
    ALTER COLUMN dataset_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ml_runs_area_dataset_idx ON ml_runs (area_id, dataset_id);

ALTER TABLE IF EXISTS ml_point_results
    ADD COLUMN IF NOT EXISTS area_id TEXT,
    ADD COLUMN IF NOT EXISTS dataset_id TEXT;

UPDATE ml_point_results
SET area_id = COALESCE(area_id, 'salzburg'),
    dataset_id = COALESCE(dataset_id, 'salzburg_snt')
WHERE area_id IS NULL OR dataset_id IS NULL;

ALTER TABLE IF EXISTS ml_point_results
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN dataset_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL,
    ALTER COLUMN dataset_id SET NOT NULL;

ALTER TABLE IF EXISTS ml_point_results DROP CONSTRAINT IF EXISTS ml_point_results_pkey;
ALTER TABLE IF EXISTS ml_point_results ADD PRIMARY KEY (run_id, area_id, dataset_id, code, track);
DROP INDEX IF EXISTS ml_point_results_cluster_idx;
CREATE INDEX ml_point_results_cluster_idx ON ml_point_results (run_id, dataset_id, cluster_id);
DROP INDEX IF EXISTS ml_point_results_building_idx;
CREATE INDEX ml_point_results_building_idx
    ON ml_point_results (run_id, area_id, building_source, building_id);

ALTER TABLE IF EXISTS ml_building_colors
    ADD COLUMN IF NOT EXISTS area_id TEXT;

UPDATE ml_building_colors
SET area_id = COALESCE(area_id, 'salzburg')
WHERE area_id IS NULL;

ALTER TABLE IF EXISTS ml_building_colors
    ALTER COLUMN area_id DROP DEFAULT,
    ALTER COLUMN area_id SET NOT NULL;

ALTER TABLE IF EXISTS ml_building_colors DROP CONSTRAINT IF EXISTS ml_building_colors_pkey;
ALTER TABLE IF EXISTS ml_building_colors ADD PRIMARY KEY (run_id, area_id, building_source, building_id);
