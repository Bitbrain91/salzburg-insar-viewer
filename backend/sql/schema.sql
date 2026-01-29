CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS insar_to_osm;
DROP TABLE IF EXISTS insar_to_gba;
DROP TABLE IF EXISTS insar_timeseries;
DROP TABLE IF EXISTS insar_points;
DROP TABLE IF EXISTS gba_buildings;
DROP TABLE IF EXISTS osm_buildings;
DROP TABLE IF EXISTS ml_run_metrics;
DROP TABLE IF EXISTS ml_point_results;
DROP TABLE IF EXISTS ml_runs;

CREATE TABLE insar_points (
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    los TEXT NOT NULL,
    velocity DOUBLE PRECISION NOT NULL,
    velocity_std DOUBLE PRECISION,
    coherence DOUBLE PRECISION,
    height DOUBLE PRECISION,
    height_std DOUBLE PRECISION,
    acceleration DOUBLE PRECISION,
    acceleration_std DOUBLE PRECISION,
    season_amp DOUBLE PRECISION,
    season_phs DOUBLE PRECISION,
    incidence_angle DOUBLE PRECISION,
    amp_mean DOUBLE PRECISION,
    amp_std DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326) NOT NULL,
    PRIMARY KEY (code, track)
);

CREATE INDEX insar_points_geom_idx ON insar_points USING GIST (geom);
CREATE INDEX insar_points_track_idx ON insar_points (track);

CREATE TABLE insar_timeseries (
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    date DATE NOT NULL,
    displacement DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (code, track, date)
);

CREATE INDEX insar_timeseries_code_idx ON insar_timeseries (code);

CREATE TABLE gba_buildings (
    gba_id TEXT PRIMARY KEY,
    height DOUBLE PRECISION,
    properties JSONB,
    geom GEOMETRY(MultiPolygon, 4326)
);

CREATE INDEX gba_buildings_geom_idx ON gba_buildings USING GIST (geom);

CREATE TABLE osm_buildings (
    osm_id BIGINT PRIMARY KEY,
    name TEXT,
    building_type TEXT,
    tags JSONB,
    geom GEOMETRY(MultiPolygon, 4326)
);

CREATE INDEX osm_buildings_geom_idx ON osm_buildings USING GIST (geom);

CREATE TABLE insar_to_gba (
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    gba_id TEXT NOT NULL,
    distance_m DOUBLE PRECISION,
    match_method TEXT NOT NULL,
    PRIMARY KEY (code, track, gba_id)
);

CREATE INDEX insar_to_gba_gba_idx ON insar_to_gba (gba_id);

CREATE TABLE insar_to_osm (
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    osm_id BIGINT NOT NULL,
    distance_m DOUBLE PRECISION,
    match_method TEXT NOT NULL,
    PRIMARY KEY (code, track, osm_id)
);

CREATE INDEX insar_to_osm_osm_idx ON insar_to_osm (osm_id);

CREATE TABLE ml_runs (
    run_id UUID PRIMARY KEY,
    mlflow_run_id TEXT,
    pipeline TEXT NOT NULL,
    pipeline_version TEXT NOT NULL,
    run_type TEXT NOT NULL,
    source TEXT,
    track INTEGER,
    bbox JSONB,
    params JSONB,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    error TEXT
);

CREATE INDEX ml_runs_status_idx ON ml_runs (status);
CREATE INDEX ml_runs_created_idx ON ml_runs (created_at);

CREATE TABLE ml_point_results (
    run_id UUID NOT NULL,
    code TEXT NOT NULL,
    track INTEGER NOT NULL,
    cluster_id TEXT,
    building_source TEXT,
    building_id TEXT,
    distance_m DOUBLE PRECISION,
    score DOUBLE PRECISION,
    meta JSONB,
    PRIMARY KEY (run_id, code, track)
);

CREATE INDEX ml_point_results_run_idx ON ml_point_results (run_id);
CREATE INDEX ml_point_results_cluster_idx ON ml_point_results (run_id, cluster_id);
CREATE INDEX ml_point_results_building_idx ON ml_point_results (run_id, building_id);

CREATE TABLE ml_run_metrics (
    run_id UUID NOT NULL,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION,
    meta JSONB,
    PRIMARY KEY (run_id, metric)
);
