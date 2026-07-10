from __future__ import annotations

import json
from datetime import datetime, timezone

# Kennzahlen, die die Run-Liste je Karte anzeigt; bewusst kleine Whitelist,
# damit das 5s-Polling der Liste keinen vollen Metrik-Join zieht.
RUN_LIST_METRIC_KEYS = (
    "assigned_points",
    "assigned_buildings",
    "buildings_with_clusters",
    "suspect_points",
    "outlier_points",
    "cross_track_improvement",
)

# Einzige per PATCH veraenderbare Spalten; niemals aus Nutzereingaben ableiten.
RUN_META_COLUMNS = ("label", "notes")


def _load_json(value, fallback):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value if value is not None else fallback


async def create_run_record(
    conn,
    run_id: str,
    pipeline: str,
    pipeline_version: str,
    run_type: str,
    area_id: str,
    dataset_id: str,
    source: str | None,
    track: int | None,
    bbox: tuple[float, float, float, float] | None,
    params: dict,
    label: str | None = None,
) -> None:
    await conn.execute(
        """
        INSERT INTO ml_runs (
            run_id, pipeline, pipeline_version, run_type, area_id, dataset_id, source, track,
            bbox, params, status, label, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13)
        """,
        run_id,
        pipeline,
        pipeline_version,
        run_type,
        area_id,
        dataset_id,
        source,
        track,
        json.dumps(list(bbox) if bbox else None),
        json.dumps(params or {}),
        "queued",
        label,
        datetime.now(timezone.utc),
    )


async def fetch_runs(conn, limit: int = 100):
    rows = await conn.fetch(
        """
        SELECT r.run_id, r.status, r.pipeline, r.run_type, r.created_at, r.started_at,
               r.finished_at, r.area_id, r.dataset_id, r.source, r.track,
               r.label, r.notes, r.bbox,
               r.params->>'experiment_id' AS experiment_id,
               m.metrics
        FROM ml_runs r
        LEFT JOIN LATERAL (
            SELECT jsonb_object_agg(metric, value) AS metrics
            FROM ml_run_metrics
            WHERE run_id = r.run_id AND metric = ANY($2::text[])
        ) m ON TRUE
        ORDER BY r.created_at DESC
        LIMIT $1
        """,
        limit,
        list(RUN_LIST_METRIC_KEYS),
    )
    runs = []
    for row in rows:
        run = dict(row)
        run["bbox"] = _load_json(run.get("bbox"), None)
        run["metrics"] = _load_json(run.get("metrics"), {}) or {}
        runs.append(run)
    return runs


async def fetch_run_summary(conn, run_id: str):
    row = await conn.fetchrow(
        """
        SELECT r.run_id, r.status, r.pipeline, r.run_type, r.created_at, r.started_at,
               r.finished_at, r.area_id, r.dataset_id, r.source, r.track,
               r.label, r.notes, r.bbox,
               r.params->>'experiment_id' AS experiment_id,
               m.metrics
        FROM ml_runs r
        LEFT JOIN LATERAL (
            SELECT jsonb_object_agg(metric, value) AS metrics
            FROM ml_run_metrics
            WHERE run_id = r.run_id AND metric = ANY($2::text[])
        ) m ON TRUE
        WHERE r.run_id = $1
        """,
        run_id,
        list(RUN_LIST_METRIC_KEYS),
    )
    if row is None:
        return None
    run = dict(row)
    run["bbox"] = _load_json(run.get("bbox"), None)
    run["metrics"] = _load_json(run.get("metrics"), {}) or {}
    return run


async def update_run_meta(conn, run_id: str, fields: dict):
    """Aktualisiert nur label/notes (RUN_META_COLUMNS); gibt die Zeile zurueck oder None."""
    updates = {k: v for k, v in fields.items() if k in RUN_META_COLUMNS}
    if not updates:
        return None
    set_clauses = ", ".join(
        f"{column} = ${idx + 2}" for idx, column in enumerate(updates)
    )
    return await conn.fetchrow(
        f"""
        UPDATE ml_runs
        SET {set_clauses}
        WHERE run_id = $1
        RETURNING run_id, label, notes
        """,
        run_id,
        *updates.values(),
    )


async def fetch_run_detail(conn, run_id: str):
    run = await conn.fetchrow(
        """
        SELECT run_id, status, pipeline, pipeline_version, run_type, created_at,
               started_at, finished_at, area_id, dataset_id, source, track, bbox,
               params, mlflow_run_id, error, label, notes
        FROM ml_runs
        WHERE run_id = $1
        """,
        run_id,
    )
    if not run:
        return None
    params = run["params"]
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except json.JSONDecodeError:
            params = {}
    bbox = run["bbox"]
    if isinstance(bbox, str):
        try:
            bbox = json.loads(bbox)
        except json.JSONDecodeError:
            bbox = None
    run = dict(run)
    run["params"] = params
    run["bbox"] = bbox
    metrics = await conn.fetch(
        """
        SELECT metric, value
        FROM ml_run_metrics
        WHERE run_id = $1
        """,
        run_id,
    )
    return run, metrics


async def fail_incomplete_runs(
    conn,
    *,
    finished_at: datetime | None = None,
    error_message: str | None = None,
):
    finished_at = finished_at or datetime.now(timezone.utc)
    error_message = (
        error_message
        or "Run marked failed on startup because the backend process restarted before completion."
    )
    return await conn.fetch(
        """
        UPDATE ml_runs
        SET status = 'failed',
            finished_at = COALESCE(finished_at, $1),
            error = COALESCE(error, $2)
        WHERE status IN ('queued', 'running')
        RETURNING run_id, pipeline, status, started_at, finished_at, mlflow_run_id
        """,
        finished_at,
        error_message,
    )
