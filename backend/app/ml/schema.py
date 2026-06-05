from __future__ import annotations


ML_SCHEMA_STATEMENTS = [
    """
    ALTER TABLE IF EXISTS ml_runs
        ADD COLUMN IF NOT EXISTS area_id TEXT
    """,
    """
    ALTER TABLE IF EXISTS ml_runs
        ADD COLUMN IF NOT EXISTS dataset_id TEXT
    """,
    """
    UPDATE ml_runs
    SET area_id = 'salzburg'
    WHERE area_id IS NULL
    """,
    """
    UPDATE ml_runs
    SET dataset_id = 'salzburg_snt'
    WHERE dataset_id IS NULL
    """,
    """
    ALTER TABLE IF EXISTS ml_runs
        ALTER COLUMN area_id SET NOT NULL,
        ALTER COLUMN area_id DROP DEFAULT,
        ALTER COLUMN dataset_id SET NOT NULL,
        ALTER COLUMN dataset_id DROP DEFAULT
    """,
    """
    CREATE INDEX IF NOT EXISTS ml_runs_area_dataset_idx
        ON ml_runs (area_id, dataset_id)
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS area_id TEXT
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS dataset_id TEXT
    """,
    """
    UPDATE ml_point_results
    SET area_id = 'salzburg'
    WHERE area_id IS NULL
    """,
    """
    UPDATE ml_point_results
    SET dataset_id = 'salzburg_snt'
    WHERE dataset_id IS NULL
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ALTER COLUMN area_id SET NOT NULL,
        ALTER COLUMN area_id DROP DEFAULT,
        ALTER COLUMN dataset_id SET NOT NULL,
        ALTER COLUMN dataset_id DROP DEFAULT
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS anomaly_score DOUBLE PRECISION
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS cross_track_consistency DOUBLE PRECISION
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS label TEXT
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS feature_set_version TEXT
    """,
    """
    ALTER TABLE IF EXISTS ml_point_results
        ADD COLUMN IF NOT EXISTS model_set_version TEXT
    """,
    """
    CREATE INDEX IF NOT EXISTS ml_point_results_label_idx
        ON ml_point_results (run_id, label)
    """,
    """
    CREATE INDEX IF NOT EXISTS ml_point_results_quality_idx
        ON ml_point_results (run_id, quality_score)
    """,
    """
    CREATE INDEX IF NOT EXISTS ml_point_results_anomaly_idx
        ON ml_point_results (run_id, anomaly_score)
    """,
    """
    CREATE INDEX IF NOT EXISTS ml_point_results_area_dataset_idx
        ON ml_point_results (run_id, area_id, dataset_id)
    """,
    """
    CREATE INDEX IF NOT EXISTS ml_point_results_building_area_idx
        ON ml_point_results (run_id, area_id, building_source, building_id)
    """,
    """
    ALTER TABLE IF EXISTS ml_building_colors
        ADD COLUMN IF NOT EXISTS area_id TEXT
    """,
    """
    UPDATE ml_building_colors
    SET area_id = 'salzburg'
    WHERE area_id IS NULL
    """,
    """
    ALTER TABLE IF EXISTS ml_building_colors
        ALTER COLUMN area_id SET NOT NULL,
        ALTER COLUMN area_id DROP DEFAULT
    """,
]


async def ensure_ml_schema(conn) -> None:
    for statement in ML_SCHEMA_STATEMENTS:
        await conn.execute(statement)
