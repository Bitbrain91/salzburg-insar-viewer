CREATE TABLE IF NOT EXISTS insar_point_terrain (
    area_id TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    terrain_source TEXT NOT NULL,
    terrain_resolution_m DOUBLE PRECISION,
    terrain_elevation_m DOUBLE PRECISION,
    slope_deg DOUBLE PRECISION,
    aspect_deg DOUBLE PRECISION,
    PRIMARY KEY (area_id, dataset_id, code, track)
);

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

CREATE TABLE IF NOT EXISTS building_terrain_context (
    area_id TEXT NOT NULL,
    building_source TEXT NOT NULL,
    building_id TEXT NOT NULL,
    terrain_source TEXT NOT NULL,
    terrain_resolution_m DOUBLE PRECISION,
    terrain_elevation_mean_m DOUBLE PRECISION,
    terrain_elevation_min_m DOUBLE PRECISION,
    terrain_elevation_max_m DOUBLE PRECISION,
    slope_mean_deg DOUBLE PRECISION,
    slope_max_deg DOUBLE PRECISION,
    relief_range_m DOUBLE PRECISION,
    PRIMARY KEY (area_id, building_source, building_id)
);

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
