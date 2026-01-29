from __future__ import annotations

from collections import defaultdict
import json
from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

from .base import BasePipeline


class HybridPipeline(BasePipeline):
    name = "hybrid"
    version = "0.1.0"
    run_type = "hybrid"

    def default_params(self) -> Dict[str, Any]:
        return {
            "max_distance_m": 30.0,
            "buffer_multiplier": 1.0,
            "min_buffer_m": 3.0,
            "default_height_m": 12.0,
            "eps": 0.9,
            "min_samples": 6,
        }

    async def run(self, pool, config) -> Dict[str, Any]:
        if not config.bbox:
            raise ValueError("bbox is required for hybrid pipeline")

        source = config.source or "gba"
        if source not in {"gba", "osm"}:
            raise ValueError("source must be 'gba' or 'osm'")

        params = {**self.default_params(), **(config.params or {})}
        max_distance = float(params["max_distance_m"])
        buffer_multiplier = float(params["buffer_multiplier"])
        min_buffer = float(params["min_buffer_m"])
        default_height = float(params["default_height_m"])
        eps = float(params["eps"])
        min_samples = int(params["min_samples"])

        min_lon, min_lat, max_lon, max_lat = config.bbox
        track_param = int(config.track) if config.track is not None else None

        building_table = "gba_buildings" if source == "gba" else "osm_buildings"
        building_id = "gba_id" if source == "gba" else "osm_id"
        height_expr = "height" if source == "gba" else "NULL"

        query = f"""
            WITH pts AS (
                SELECT
                    p.code,
                    p.track,
                    p.velocity,
                    p.season_amp,
                    p.coherence,
                    p.incidence_angle,
                    ST_X(ST_Transform(p.geom, 32633)) AS x_m,
                    ST_Y(ST_Transform(p.geom, 32633)) AS y_m,
                    p.geom
                FROM insar_points p
                WHERE ST_Intersects(p.geom, ST_MakeEnvelope($1,$2,$3,$4,4326))
                  AND ($5::integer IS NULL OR p.track = $5)
            ),
            buildings AS (
                SELECT {building_id} AS building_id, geom, {height_expr} AS height_m
                FROM {building_table}
            )
            SELECT
                p.code,
                p.track,
                p.velocity,
                p.season_amp,
                p.coherence,
                p.x_m,
                p.y_m,
                cand.building_id,
                cand.distance_m,
                cand.method,
                cand.buffer_m
            FROM pts p
            LEFT JOIN LATERAL (
                SELECT building_id, distance_m, buffer_m, method
                FROM (
                    SELECT
                        b.building_id,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        GREATEST(
                            $7::double precision,
                            COALESCE(b.height_m, $8::double precision)
                            * tan(radians(COALESCE(p.incidence_angle, 38.5))) * $6::double precision
                        ) AS buffer_m,
                        'buffer' AS method
                    FROM buildings b
                    WHERE ST_DWithin(
                        p.geom::geography,
                        b.geom::geography,
                        GREATEST(
                            $7::double precision,
                            COALESCE(b.height_m, $8::double precision)
                            * tan(radians(COALESCE(p.incidence_angle, 38.5))) * $6::double precision
                        )
                    )
                    UNION ALL
                    SELECT
                        b.building_id,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        NULL::double precision AS buffer_m,
                        'nearest' AS method
                    FROM buildings b
                    WHERE ST_DWithin(p.geom::geography, b.geom::geography, $9::double precision)
                ) candidates
                ORDER BY CASE WHEN method = 'buffer' THEN 0 ELSE 1 END, distance_m
                LIMIT 1
            ) cand ON true
        """

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                query,
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                track_param,
                buffer_multiplier,
                min_buffer,
                default_height,
                max_distance,
            )

        if not rows:
            return {"total_points": 0, "assigned_points": 0, "clusters": 0}

        by_building: dict[str, list] = defaultdict(list)
        unassigned: list = []

        for r in rows:
            record = {
                "code": r["code"],
                "track": r["track"],
                "velocity": r["velocity"],
                "season_amp": r["season_amp"],
                "coherence": r["coherence"],
                "x_m": r["x_m"],
                "y_m": r["y_m"],
                "building_id": r["building_id"],
                "distance_m": r["distance_m"],
                "method": r["method"],
                "buffer_m": r["buffer_m"],
            }
            if r["building_id"] is None:
                unassigned.append(record)
            else:
                by_building[str(r["building_id"])].append(record)

        records = []
        cluster_total = 0

        for building_id_val, items in by_building.items():
            features = []
            keys = []
            for item in items:
                keys.append(item)
                features.append(
                    (
                        item["x_m"],
                        item["y_m"],
                        item["velocity"] if item["velocity"] is not None else 0.0,
                        item["season_amp"] if item["season_amp"] is not None else 0.0,
                        item["coherence"] if item["coherence"] is not None else 0.0,
                    )
                )

            feature_array = np.array(features, dtype=float)
            feature_array = np.nan_to_num(feature_array, nan=0.0)
            scaled = StandardScaler().fit_transform(feature_array)
            labels = DBSCAN(eps=eps, min_samples=min_samples).fit_predict(scaled)

            cluster_total += len({label for label in labels if label >= 0})

            for item, label in zip(keys, labels, strict=True):
                if label == -1:
                    cluster_id = f"{building_id_val}:noise"
                else:
                    cluster_id = f"{building_id_val}:cluster_{label}"
                records.append(
                    (
                        config.run_id,
                        item["code"],
                        item["track"],
                        cluster_id,
                        source,
                        building_id_val,
                        item["distance_m"],
                        None,
                        json.dumps(
                            {
                                "method": item["method"],
                                "buffer_m": item["buffer_m"],
                                "stage": "hybrid",
                            }
                        ),
                    )
                )

        for item in unassigned:
            records.append(
                (
                    config.run_id,
                    item["code"],
                    item["track"],
                    "unassigned",
                    source,
                    None,
                    None,
                    None,
                    json.dumps({"method": "unassigned"}),
                )
            )

        insert_query = """
            INSERT INTO ml_point_results (
                run_id, code, track, cluster_id, building_source, building_id,
                distance_m, score, meta
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
        """
        async with pool.acquire() as conn:
            await conn.executemany(insert_query, records)

        return {
            "total_points": len(rows),
            "assigned_points": sum(len(v) for v in by_building.values()),
            "clusters": cluster_total,
        }
