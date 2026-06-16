CREATE INDEX IF NOT EXISTS insar_points_code_lower_prefix_idx
    ON insar_points (lower(code) text_pattern_ops);

CREATE INDEX IF NOT EXISTS gba_buildings_gba_id_lower_prefix_idx
    ON gba_buildings (lower(gba_id) text_pattern_ops);

CREATE INDEX IF NOT EXISTS osm_buildings_osm_id_lower_prefix_idx
    ON osm_buildings (lower(osm_id::text) text_pattern_ops);

CREATE INDEX IF NOT EXISTS osm_buildings_tags_gin_idx
    ON osm_buildings USING GIN (tags);

CREATE INDEX IF NOT EXISTS ml_runs_run_id_lower_prefix_idx
    ON ml_runs (lower(run_id::text) text_pattern_ops);

CREATE INDEX IF NOT EXISTS ml_runs_mlflow_run_id_lower_prefix_idx
    ON ml_runs (lower(mlflow_run_id) text_pattern_ops);
