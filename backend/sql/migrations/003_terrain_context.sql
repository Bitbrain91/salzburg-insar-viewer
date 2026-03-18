CREATE TABLE IF NOT EXISTS insar_point_terrain (
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    terrain_source TEXT NOT NULL,
    terrain_resolution_m DOUBLE PRECISION,
    terrain_elevation_m DOUBLE PRECISION,
    slope_deg DOUBLE PRECISION,
    aspect_deg DOUBLE PRECISION,
    PRIMARY KEY (code, track)
);

CREATE INDEX IF NOT EXISTS insar_point_terrain_source_idx
    ON insar_point_terrain (terrain_source);

CREATE TABLE IF NOT EXISTS building_terrain_context (
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
    PRIMARY KEY (building_source, building_id)
);

CREATE INDEX IF NOT EXISTS building_terrain_context_source_idx
    ON building_terrain_context (terrain_source, building_source);
