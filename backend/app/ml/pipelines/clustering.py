from __future__ import annotations

import json
from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

from .base import BasePipeline


class ClusteringPipeline(BasePipeline):
    name = "clustering"
    version = "0.1.0"
    run_type = "clustering"

    def default_params(self) -> Dict[str, Any]:
        return {
            "eps": 0.9,
            "min_samples": 8,
        }

    async def run(self, pool, config) -> Dict[str, Any]:
        if not config.bbox:
            raise ValueError("bbox is required for clustering pipeline")

        params = {**self.default_params(), **(config.params or {})}
        eps = float(params["eps"])
        min_samples = int(params["min_samples"])

        min_lon, min_lat, max_lon, max_lat = config.bbox
        track_param = int(config.track) if config.track is not None else None

        query = """
            SELECT
                code,
                track,
                velocity,
                season_amp,
                coherence,
                ST_X(ST_Transform(geom, 32633)) AS x_m,
                ST_Y(ST_Transform(geom, 32633)) AS y_m
            FROM insar_points
            WHERE ST_Intersects(geom, ST_MakeEnvelope($1,$2,$3,$4,4326))
              AND ($5::integer IS NULL OR track = $5)
        """

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                query, min_lon, min_lat, max_lon, max_lat, track_param
            )

        if not rows:
            return {
                "total_points": 0,
                "clusters": 0,
                "noise_points": 0,
                "assigned_points": 0,
                "assigned_buildings": 0,
            }

        features: List[Tuple[float, float, float, float, float]] = []
        keys: List[Tuple[str, int]] = []
        for r in rows:
            keys.append((r["code"], r["track"]))
            features.append(
                (
                    r["x_m"],
                    r["y_m"],
                    r["velocity"] if r["velocity"] is not None else 0.0,
                    r["season_amp"] if r["season_amp"] is not None else 0.0,
                    r["coherence"] if r["coherence"] is not None else 0.0,
                )
            )

        feature_array = np.array(features, dtype=float)
        feature_array = np.nan_to_num(feature_array, nan=0.0)

        scaled = StandardScaler().fit_transform(feature_array)
        model = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(scaled)

        cluster_count = len({label for label in labels if label >= 0})
        noise_count = int(np.sum(labels == -1))

        records = []
        for (code, track), label in zip(keys, labels, strict=True):
            if label == -1:
                cluster_id = "noise"
            else:
                cluster_id = f"cluster_{label}"
            records.append(
                (
                    config.run_id,
                    code,
                    track,
                    cluster_id,
                    None,
                    None,
                    None,
                    None,
                    json.dumps({"method": "dbscan"}),
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
            "clusters": cluster_count,
            "noise_points": noise_count,
            "assigned_points": 0,
            "assigned_buildings": 0,
        }
