CREATE INDEX IF NOT EXISTS ml_point_results_building_history_idx
    ON ml_point_results (area_id, building_source, building_id, run_id);
