from __future__ import annotations


ML_SCHEMA_STATEMENTS = [
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
]


async def ensure_ml_schema(conn) -> None:
    for statement in ML_SCHEMA_STATEMENTS:
        await conn.execute(statement)
