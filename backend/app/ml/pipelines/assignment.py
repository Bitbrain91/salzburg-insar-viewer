from __future__ import annotations

from typing import Any, Dict

from .base import BasePipeline


class AssignmentPipeline(BasePipeline):
    name = "assignment"
    version = "0.1.0"
    run_type = "assignment"

    def default_params(self) -> Dict[str, Any]:
        return {
            "max_distance_m": 30.0,
            "buffer_multiplier": 1.0,
            "min_buffer_m": 3.0,
            "default_height_m": 12.0,
        }

    async def run(self, pool, config) -> Dict[str, Any]:
        if not config.bbox:
            raise ValueError("bbox is required for assignment pipeline")

        source = config.source or "gba"
        if source not in {"gba", "osm"}:
            raise ValueError("source must be 'gba' or 'osm'")

        params = {**self.default_params(), **(config.params or {})}
        max_distance = float(params["max_distance_m"])
        buffer_multiplier = float(params["buffer_multiplier"])
        min_buffer = float(params["min_buffer_m"])
        default_height = float(params["default_height_m"])

        min_lon, min_lat, max_lon, max_lat = config.bbox

        building_table = "gba_buildings" if source == "gba" else "osm_buildings"
        building_id = "gba_id" if source == "gba" else "osm_id"
        height_expr = "height" if source == "gba" else "NULL"

        track_param = int(config.track) if config.track is not None else None

        query = f"""
            WITH pts AS (
                SELECT p.code, p.track, p.incidence_angle, p.geom
                FROM insar_points p
                WHERE ST_Intersects(p.geom, ST_MakeEnvelope($1,$2,$3,$4,4326))
                  AND ($5::integer IS NULL OR p.track = $5)
            ),
            buildings AS (
                SELECT {building_id} AS building_id, geom, {height_expr} AS height_m
                FROM {building_table}
            )
            INSERT INTO ml_point_results (
                run_id, code, track, cluster_id, building_source, building_id,
                distance_m, score, meta
            )
            SELECT
                $6::uuid AS run_id,
                p.code,
                p.track,
                NULL::text AS cluster_id,
                $7::text AS building_source,
                cand.building_id,
                cand.distance_m,
                CASE WHEN cand.distance_m IS NULL THEN NULL ELSE 1.0 / (1.0 + cand.distance_m) END AS score,
                CASE
                    WHEN cand.building_id IS NULL THEN NULL
                    ELSE jsonb_build_object(
                        'method', cand.method,
                        'buffer_m', cand.buffer_m
                    )
                END AS meta
            FROM pts p
            LEFT JOIN LATERAL (
                SELECT building_id, distance_m, buffer_m, method
                FROM (
                    SELECT
                        b.building_id,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        GREATEST(
                            $9::double precision,
                            COALESCE(b.height_m, $10::double precision)
                            * tan(radians(COALESCE(p.incidence_angle, 38.5))) * $8::double precision
                        ) AS buffer_m,
                        'buffer' AS method
                    FROM buildings b
                    WHERE ST_DWithin(
                        p.geom::geography,
                        b.geom::geography,
                        GREATEST(
                            $9::double precision,
                            COALESCE(b.height_m, $10::double precision)
                            * tan(radians(COALESCE(p.incidence_angle, 38.5))) * $8::double precision
                        )
                    )
                    UNION ALL
                    SELECT
                        b.building_id,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        NULL::double precision AS buffer_m,
                        'nearest' AS method
                    FROM buildings b
                    WHERE ST_DWithin(p.geom::geography, b.geom::geography, $11::double precision)
                ) candidates
                ORDER BY CASE WHEN method = 'buffer' THEN 0 ELSE 1 END, distance_m
                LIMIT 1
            ) cand ON true
        """

        args = [
            min_lon,
            min_lat,
            max_lon,
            max_lat,
            track_param,
            config.run_id,
            source,
            buffer_multiplier,
            min_buffer,
            default_height,
            max_distance,
        ]

        async with pool.acquire() as conn:
            await conn.execute(query, *args)
            metrics_row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) AS total_points,
                    COUNT(building_id) AS assigned_points,
                    COUNT(*) FILTER (WHERE meta->>'method' = 'buffer') AS buffer_matches,
                    COUNT(*) FILTER (WHERE meta->>'method' = 'nearest') AS nearest_matches
                FROM ml_point_results
                WHERE run_id = $1
                """,
                config.run_id,
            )

        return {
            "total_points": metrics_row["total_points"],
            "assigned_points": metrics_row["assigned_points"],
            "buffer_matches": metrics_row["buffer_matches"],
            "nearest_matches": metrics_row["nearest_matches"],
        }
