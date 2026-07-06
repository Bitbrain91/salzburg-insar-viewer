CREATE TABLE IF NOT EXISTS bev_buildings (
    area_id TEXT NOT NULL,
    bev_id TEXT NOT NULL,
    height DOUBLE PRECISION,
    height_m DOUBLE PRECISION,
    height_median_m DOUBLE PRECISION,
    height_max_m DOUBLE PRECISION,
    height_eaves_m DOUBLE PRECISION,
    ground_min_m DOUBLE PRECISION,
    ground_median_m DOUBLE PRECISION,
    ground_max_m DOUBLE PRECISION,
    footprint_area_m2 DOUBLE PRECISION,
    relief_range_m DOUBLE PRECISION,
    agwr_object_number TEXT,
    agwr_type TEXT,
    building_function TEXT,
    verification_lb TEXT,
    flight_year INTEGER,
    als_date TEXT,
    capture_method TEXT,
    height_source TEXT,
    height_quality TEXT,
    properties JSONB,
    geom GEOMETRY(MultiPolygon, 4326),
    PRIMARY KEY (area_id, bev_id)
);

CREATE INDEX IF NOT EXISTS bev_buildings_geom_idx ON bev_buildings USING GIST (geom);
CREATE INDEX IF NOT EXISTS bev_buildings_area_idx ON bev_buildings (area_id);
CREATE INDEX IF NOT EXISTS bev_buildings_bev_id_lower_prefix_idx ON bev_buildings (lower(bev_id) text_pattern_ops);
CREATE INDEX IF NOT EXISTS bev_buildings_agwr_lower_prefix_idx ON bev_buildings (lower(agwr_object_number) text_pattern_ops);
CREATE INDEX IF NOT EXISTS bev_buildings_properties_gin_idx ON bev_buildings USING GIN (properties);
