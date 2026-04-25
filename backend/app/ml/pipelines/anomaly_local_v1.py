from __future__ import annotations

import asyncio
import json
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import numpy as np
from sklearn.cluster import OPTICS
from sklearn.preprocessing import RobustScaler

try:
    import hdbscan  # type: ignore
except ImportError:  # pragma: no cover - exercised in runtime environments without hdbscan wheels
    hdbscan = None

from .base import BasePipeline


FEATURE_SET_VERSION = "anomaly_local_v1_phase1"
MODEL_SET_VERSION = "local_hdbscan_rulegate_v1"
EPSILON = 1e-9
NEIGHBOUR_BUILDING_RADIUS_M = 25.0
MAX_NEIGHBOUR_BUILDINGS = 8
OWN_FIT_WEAK_THRESHOLD = 0.45
NEIGHBOUR_FIT_SCORE_THRESHOLD = 0.60
NEIGHBOUR_FIT_DELTA_THRESHOLD = 0.15
PAIR_SUPPORT_THRESHOLD = 0.60
CLUSTER_FIT_SCALE_FLOORS = {
    "motion": 0.75,
    "along": 0.50,
    "cross": 0.50,
    "height": 0.10,
    "step": 0.75,
}


@dataclass
class LocalPointRecord:
    code: str
    track: int
    los: str | None
    lon: float
    lat: float
    x_m: float
    y_m: float
    velocity: float
    velocity_std: float | None
    coherence: float | None
    acceleration: float | None
    season_amp: float | None
    incidence_angle: float | None
    height: float | None
    amp_mean: float | None
    amp_std: float | None
    building_id: str | None
    building_height: float | None
    building_centroid_x_m: float | None
    building_centroid_y_m: float | None
    distance_m: float | None
    assignment_method: str | None
    range_offset_m: float | None
    buffer_m: float | None
    within_building: bool
    slope_mean_deg: float | None
    slope_max_deg: float | None
    relief_range_m: float | None
    displacement_dates: list[date] = field(default_factory=list)
    displacement_values: list[float] = field(default_factory=list)
    amplitude_dates: list[date] = field(default_factory=list)
    amplitude_values: list[float] = field(default_factory=list)
    features: dict[str, float] = field(default_factory=dict)
    flags: dict[str, Any] = field(default_factory=dict)
    building_context: dict[str, Any] = field(default_factory=dict)
    cross_track_summary: dict[str, Any] = field(default_factory=dict)
    detector_scores: dict[str, float] = field(default_factory=dict)
    explain_top_features: list[dict[str, Any]] = field(default_factory=list)
    cluster_rollup: dict[str, Any] = field(default_factory=dict)
    building_rollup: dict[str, Any] = field(default_factory=dict)
    neighbour_context: dict[str, Any] = field(default_factory=dict)
    gate_excluded: bool = False
    gate_reasons: list[str] = field(default_factory=list)
    kept_for_scoring: bool = False
    cluster_id: str | None = None
    cluster_role: str = "unassigned"
    cluster_probability: float | None = None
    cluster_outlier_score: float = 0.0
    local_deviation_score: float = 0.0
    rule_penalty: float = 0.0
    anomaly_score: float = 0.0
    quality_score: float = 0.0
    cross_track_consistency: float | None = None
    label: str = "suspect"
    small_n_fallback: bool = False
    primary_step_index: int | None = None
    primary_step_sign: int = 0


class AnomalyLocalV1Pipeline(BasePipeline):
    name = "anomaly_local_v1"
    version = "0.1.0"
    run_type = "anomaly"

    def default_params(self) -> dict[str, Any]:
        return {
            "source": "gba",
            "buffer_multiplier": 1.0,
            "min_buffer_m": 3.0,
            "max_buffer_m": 30.0,
            "lateral_slack_m": 2.0,
            "default_height_m": 12.0,
            "default_incidence_angle_deg": 38.5,
            "max_distance_m": 15.0,
            "min_valid_epochs": 24,
            "min_valid_epoch_ratio": 0.50,
            "coherence_floor": 0.45,
            "quality_normal_threshold": 0.70,
            "quality_outlier_threshold": 0.40,
            "small_n_noise_threshold": 0.80,
        }

    async def run(self, pool, config) -> dict[str, Any]:
        if not config.bbox:
            raise ValueError("bbox is required for anomaly_local_v1 pipeline")

        requested_source = (config.source or config.params.get("source") or "gba").lower()
        if requested_source != "gba":
            raise ValueError("anomaly_local_v1 currently requires source='gba'")

        params = {**self.default_params(), **(config.params or {})}
        base_rows, ts_rows, amp_rows = await self._fetch_inputs(pool, config, params)

        if not base_rows:
            return {
                "total_points": 0,
                "assigned_points": 0,
                "assigned_buildings": 0,
                "kept_points": 0,
                "gate_excluded_points": 0,
                "normal_points": 0,
                "suspect_points": 0,
                "outlier_points": 0,
                "noise_points": 0,
                "buildings_with_clusters": 0,
                "multi_cluster_buildings": 0,
                "small_n_buildings": 0,
                "full_cross_track_points": 0,
                "buildings_with_both_tracks_kept": 0,
                "median_cross_track_diff_before": 0.0,
                "median_cross_track_diff_after": 0.0,
                "cross_track_improvement": 0.0,
            }

        records, metrics = await asyncio.to_thread(self._compute_run, base_rows, ts_rows, amp_rows, params)
        await self._persist_results(pool, config.run_id, records)
        return metrics

    async def _fetch_inputs(self, pool, config, params: dict[str, Any]):
        min_lon, min_lat, max_lon, max_lat = config.bbox
        track_param = int(config.track) if config.track is not None else None

        points_query = """
            WITH envelope AS (
                SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom
            ),
            pts AS (
                SELECT
                    p.code,
                    p.track,
                    p.los,
                    p.velocity,
                    p.velocity_std,
                    p.coherence,
                    p.acceleration,
                    p.season_amp,
                    p.incidence_angle,
                    p.height,
                    p.amp_mean,
                    p.amp_std,
                    p.geom,
                    ST_Transform(p.geom, 32633) AS geom_utm,
                    ST_X(p.geom) AS lon,
                    ST_Y(p.geom) AS lat,
                    ST_X(ST_Transform(p.geom, 32633)) AS x_m,
                    ST_Y(ST_Transform(p.geom, 32633)) AS y_m
                FROM insar_points p, envelope
                WHERE ST_Intersects(p.geom, envelope.geom)
                  AND ($5::integer IS NULL OR p.track = $5)
            ),
            buildings AS (
                SELECT
                    b.gba_id::text AS building_id,
                    b.height AS building_height,
                    b.geom,
                    ST_Transform(b.geom, 32633) AS geom_utm,
                    ST_X(ST_Centroid(ST_Transform(b.geom, 32633))) AS centroid_x_m,
                    ST_Y(ST_Centroid(ST_Transform(b.geom, 32633))) AS centroid_y_m,
                    terrain.slope_mean_deg,
                    terrain.slope_max_deg,
                    terrain.relief_range_m
                FROM gba_buildings b
                LEFT JOIN building_terrain_context terrain
                  ON terrain.building_source = 'gba'
                 AND terrain.building_id = b.gba_id::text
                CROSS JOIN envelope
                WHERE ST_DWithin(
                    b.geom::geography,
                    envelope.geom::geography,
                    ($8::double precision + $12::double precision)
                )
            )
            SELECT
                p.code,
                p.track,
                p.los,
                p.velocity,
                p.velocity_std,
                p.coherence,
                p.acceleration,
                p.season_amp,
                p.incidence_angle,
                p.height,
                p.amp_mean,
                p.amp_std,
                p.lon,
                p.lat,
                p.x_m,
                p.y_m,
                cand.building_id,
                cand.building_height,
                cand.centroid_x_m,
                cand.centroid_y_m,
                cand.distance_m,
                cand.assignment_method,
                cand.range_offset_m,
                cand.buffer_m,
                cand.within_building,
                cand.slope_mean_deg,
                cand.slope_max_deg,
                cand.relief_range_m
            FROM pts p
            LEFT JOIN LATERAL (
                SELECT *
                FROM (
                    SELECT
                        b.building_id,
                        b.building_height,
                        b.centroid_x_m,
                        b.centroid_y_m,
                        0::double precision AS distance_m,
                        'within'::text AS assignment_method,
                        NULL::double precision AS range_offset_m,
                        NULL::double precision AS buffer_m,
                        true AS within_building,
                        b.slope_mean_deg,
                        b.slope_max_deg,
                        b.relief_range_m,
                        0 AS priority
                    FROM buildings b
                    WHERE ST_Covers(b.geom, p.geom)

                    UNION ALL

                    SELECT
                        b.building_id,
                        b.building_height,
                        b.centroid_x_m,
                        b.centroid_y_m,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        'directional_buffer'::text AS assignment_method,
                        b.range_offset_m,
                        (b.range_offset_m + $11::double precision) AS buffer_m,
                        false AS within_building,
                        b.slope_mean_deg,
                        b.slope_max_deg,
                        b.relief_range_m,
                        1 AS priority
                    FROM (
                        SELECT
                            base.*,
                            GREATEST(
                                $7::double precision,
                                LEAST(
                                    $8::double precision,
                                    COALESCE(base.building_height, $9::double precision)
                                    * tan(radians(COALESCE(p.incidence_angle, $10::double precision)))
                                    * $6::double precision
                                )
                            ) AS range_offset_m,
                            CASE
                                WHEN upper(COALESCE(p.los, '')) = 'A' OR p.track = 44 THEN -1.0
                                ELSE 1.0
                            END AS shift_sign
                        FROM buildings base
                    ) b
                    WHERE ST_Covers(
                        ST_Buffer(
                            ST_Union(
                                b.geom_utm,
                                ST_Translate(b.geom_utm, b.shift_sign * b.range_offset_m, 0.0)
                            ),
                            $11::double precision
                        ),
                        p.geom_utm
                    )

                    UNION ALL

                    SELECT
                        b.building_id,
                        b.building_height,
                        b.centroid_x_m,
                        b.centroid_y_m,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        'nearest'::text AS assignment_method,
                        NULL::double precision AS range_offset_m,
                        $12::double precision AS buffer_m,
                        false AS within_building,
                        b.slope_mean_deg,
                        b.slope_max_deg,
                        b.relief_range_m,
                        2 AS priority
                    FROM buildings b
                    WHERE ST_DWithin(p.geom::geography, b.geom::geography, $12::double precision)
                ) candidates
                ORDER BY priority, distance_m NULLS LAST
                LIMIT 1
            ) cand ON true
            ORDER BY p.track, p.code
        """

        timeseries_query = """
            WITH envelope AS (
                SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom
            )
            SELECT t.code, t.track, t.date, t.displacement
            FROM insar_timeseries t
            JOIN insar_points p ON p.code = t.code AND p.track = t.track
            JOIN envelope ON ST_Intersects(p.geom, envelope.geom)
            WHERE ($5::integer IS NULL OR p.track = $5)
            ORDER BY t.track, t.code, t.date
        """

        amplitude_query = """
            WITH envelope AS (
                SELECT ST_MakeEnvelope($1, $2, $3, $4, 4326) AS geom
            )
            SELECT t.code, t.track, t.date, t.amplitude
            FROM insar_amplitude_timeseries t
            JOIN insar_points p ON p.code = t.code AND p.track = t.track
            JOIN envelope ON ST_Intersects(p.geom, envelope.geom)
            WHERE ($5::integer IS NULL OR p.track = $5)
            ORDER BY t.track, t.code, t.date
        """

        async with pool.acquire() as conn:
            base_rows = await conn.fetch(
                points_query,
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                track_param,
                float(params["buffer_multiplier"]),
                float(params["min_buffer_m"]),
                float(params["max_buffer_m"]),
                float(params["default_height_m"]),
                float(params["default_incidence_angle_deg"]),
                float(params["lateral_slack_m"]),
                float(params["max_distance_m"]),
            )
            ts_rows = await conn.fetch(
                timeseries_query,
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                track_param,
            )
            amp_rows = await conn.fetch(
                amplitude_query,
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                track_param,
            )

        return base_rows, ts_rows, amp_rows

    def _compute_run(self, base_rows, ts_rows, amp_rows, params: dict[str, Any]):
        records = self._build_records(base_rows, ts_rows, amp_rows)
        self._compute_series_features(records)
        track_stats = self._compute_track_stats(records)
        self._compute_building_group_features(records, track_stats)
        self._apply_gate_rules(records, track_stats, params)
        self._cluster_building_groups(records, params)
        cross_track_metrics = self._compute_phase1_rollups(records)
        self._compute_neighbourhood_rollups(records)
        self._score_records(records, track_stats, params)
        metrics = self._evaluate_run(records, cross_track_metrics)
        return records, metrics

    def _build_records(self, base_rows, ts_rows, amp_rows) -> list[LocalPointRecord]:
        records: dict[tuple[str, int], LocalPointRecord] = {}
        for row in base_rows:
            key = (row["code"], row["track"])
            records[key] = LocalPointRecord(
                code=row["code"],
                track=row["track"],
                los=row.get("los"),
                lon=float(row["lon"]),
                lat=float(row["lat"]),
                x_m=float(row["x_m"]),
                y_m=float(row["y_m"]),
                velocity=float(row["velocity"] or 0.0),
                velocity_std=self._float_or_none(row["velocity_std"]),
                coherence=self._float_or_none(row["coherence"]),
                acceleration=self._float_or_none(row["acceleration"]),
                season_amp=self._float_or_none(row["season_amp"]),
                incidence_angle=self._float_or_none(row["incidence_angle"]),
                height=self._float_or_none(row["height"]),
                amp_mean=self._float_or_none(row["amp_mean"]),
                amp_std=self._float_or_none(row["amp_std"]),
                building_id=row["building_id"],
                building_height=self._float_or_none(row["building_height"]),
                building_centroid_x_m=self._float_or_none(row["centroid_x_m"]),
                building_centroid_y_m=self._float_or_none(row["centroid_y_m"]),
                distance_m=self._float_or_none(row["distance_m"]),
                assignment_method=row["assignment_method"],
                range_offset_m=self._float_or_none(row["range_offset_m"]),
                buffer_m=self._float_or_none(row["buffer_m"]),
                within_building=bool(row["within_building"]),
                slope_mean_deg=self._float_or_none(row["slope_mean_deg"]),
                slope_max_deg=self._float_or_none(row["slope_max_deg"]),
                relief_range_m=self._float_or_none(row["relief_range_m"]),
            )

        for row in ts_rows:
            key = (row["code"], row["track"])
            record = records.get(key)
            if not record:
                continue
            record.displacement_dates.append(row["date"])
            record.displacement_values.append(float(row["displacement"]))

        for row in amp_rows:
            key = (row["code"], row["track"])
            record = records.get(key)
            if not record:
                continue
            record.amplitude_dates.append(row["date"])
            record.amplitude_values.append(float(row["amplitude"]))

        return list(records.values())

    def _compute_series_features(self, records: list[LocalPointRecord]) -> None:
        track_dates: dict[int, set[date]] = defaultdict(set)
        for record in records:
            track_dates[record.track].update(record.displacement_dates)

        for record in records:
            disp = np.asarray(record.displacement_values, dtype=float)
            disp_dates = record.displacement_dates
            total_dates = max(len(track_dates.get(record.track, ())), 1)
            record.features["valid_epoch_count"] = float(len(disp_dates))
            record.features["valid_epoch_ratio"] = float(len(disp_dates) / total_dates)
            record.features["velocity"] = record.velocity
            record.features["velocity_std"] = self._safe_value(record.velocity_std)
            record.features["acceleration"] = self._safe_value(record.acceleration)
            record.features["season_amp"] = self._safe_value(record.season_amp)
            record.features["coherence"] = self._safe_value(record.coherence)
            record.features["coherence_penalty"] = 1.0 - np.clip(self._safe_value(record.coherence), 0.0, 1.0)
            record.features["incidence_angle"] = self._safe_value(record.incidence_angle, 38.5)
            record.features["amp_mean"] = self._safe_value(record.amp_mean)
            record.features["amp_std"] = self._safe_value(record.amp_std)
            record.features["building_height"] = self._safe_value(record.building_height)
            record.features["slope_mean_deg"] = self._safe_value(record.slope_mean_deg)
            record.features["slope_max_deg"] = self._safe_value(record.slope_max_deg)
            record.features["relief_range_m"] = self._safe_value(record.relief_range_m)
            record.flags["assignment_method"] = record.assignment_method or "unassigned"
            record.flags["within_building"] = record.within_building

            if len(disp) >= 2 and len(disp_dates) >= 2:
                x = np.asarray([(value - disp_dates[0]).days for value in disp_dates], dtype=float)
                if np.allclose(x, x[0]):
                    x = np.arange(len(disp), dtype=float)
                coeffs = np.polyfit(x, disp, deg=1)
                trend = coeffs[0] * x + coeffs[1]
                residuals = disp - trend
                diffs = np.diff(disp)
                step_index = int(np.argmax(np.abs(diffs))) if diffs.size else None
                step_abs = float(np.max(np.abs(diffs))) if diffs.size else 0.0
                step_sign = int(np.sign(diffs[step_index])) if step_index is not None else 0
                record.primary_step_index = step_index
                record.primary_step_sign = step_sign
                record.features["ts_slope"] = float(coeffs[0] * 365.25)
                record.features["ts_residual_std"] = float(np.std(residuals))
                record.features["ts_max_abs_delta"] = step_abs
                record.features["ts_roughness"] = float(np.mean(np.abs(diffs))) if diffs.size else 0.0
                record.features["ts_missing_rate"] = max(0.0, 1.0 - (len(disp) / total_dates))
                record.features["ts_primary_step_abs"] = step_abs
                record.flags["timeseries_available"] = True
            else:
                record.primary_step_index = None
                record.primary_step_sign = 0
                record.features["ts_slope"] = 0.0
                record.features["ts_residual_std"] = 0.0
                record.features["ts_max_abs_delta"] = 0.0
                record.features["ts_roughness"] = 0.0
                record.features["ts_missing_rate"] = 1.0
                record.features["ts_primary_step_abs"] = 0.0
                record.flags["timeseries_available"] = False

            amp = np.asarray(record.amplitude_values, dtype=float)
            if amp.size:
                amp_std = float(np.std(amp))
                amp_mean = float(np.mean(amp))
                amp_cv = amp_std / max(abs(amp_mean), 0.5)
                amp_spikes = float(np.mean(np.abs(amp - amp_mean) > (2 * max(amp_std, 0.5))))
                record.features["amp_ts_mean"] = amp_mean
                record.features["amp_ts_std"] = amp_std
                record.features["amp_ts_cv"] = amp_cv
                record.features["amp_ts_spike_rate"] = amp_spikes
                record.flags["amplitude_available"] = True
            else:
                record.features["amp_ts_mean"] = 0.0
                record.features["amp_ts_std"] = 0.0
                record.features["amp_ts_cv"] = 0.0
                record.features["amp_ts_spike_rate"] = 0.0
                record.flags["amplitude_available"] = False

    def _compute_track_stats(self, records: list[LocalPointRecord]) -> dict[int, dict[str, float]]:
        stats: dict[int, dict[str, float]] = {}
        for track in {record.track for record in records}:
            track_records = [record for record in records if record.track == track]
            coherence_values = np.asarray(
                [self._safe_value(record.coherence, np.nan) for record in track_records],
                dtype=float,
            )
            coherence_values = coherence_values[np.isfinite(coherence_values)]
            velocity_std = np.asarray([record.features["velocity_std"] for record in track_records], dtype=float)
            amp_cv = np.asarray([record.features["amp_ts_cv"] for record in track_records], dtype=float)
            step_abs = np.asarray([record.features["ts_primary_step_abs"] for record in track_records], dtype=float)
            expected_epochs = max(
                len({item for record in track_records for item in record.displacement_dates}),
                1,
            )
            stats[track] = {
                "coherence_p05": float(np.nanpercentile(coherence_values, 5)) if coherence_values.size else 0.45,
                "velocity_std_p95": float(np.nanpercentile(velocity_std, 95)) if velocity_std.size else 0.0,
                "amp_cv_p95": float(np.nanpercentile(amp_cv, 95)) if amp_cv.size else 0.0,
                "step_p90": float(np.nanpercentile(step_abs, 90)) if step_abs.size else 1.0,
                "step_p95": float(np.nanpercentile(step_abs, 95)) if step_abs.size else 1.5,
                "expected_epochs": float(expected_epochs),
            }
        return stats

    def _compute_building_group_features(
        self,
        records: list[LocalPointRecord],
        track_stats: dict[int, dict[str, float]],
    ) -> None:
        building_track_groups: dict[tuple[str, int], list[LocalPointRecord]] = defaultdict(list)
        for record in records:
            if record.building_id:
                building_track_groups[(record.building_id, record.track)].append(record)

        for key, group in building_track_groups.items():
            coords = np.asarray([(item.x_m, item.y_m) for item in group], dtype=float)
            local_density_scores = self._local_density_scores(coords)
            height_ranks = self._height_ranks(group)
            step_threshold = track_stats[group[0].track]["step_p90"] if group else 1.0
            kept_support_ratio = 1.0

            for index, record in enumerate(group):
                direction_sign = 1.0 if (record.los or "").upper() == "A" or record.track == 44 else -1.0
                along_offset = 0.0
                cross_offset = 0.0
                if record.building_centroid_x_m is not None and record.building_centroid_y_m is not None:
                    along_offset = (record.x_m - record.building_centroid_x_m) * direction_sign
                    cross_offset = record.y_m - record.building_centroid_y_m
                height_rank = height_ranks.get(record.code, 0.5)
                step_support = self._compute_step_support(record, group, step_threshold)
                record.features["along_look_offset_m"] = float(along_offset)
                record.features["cross_look_offset_m"] = float(cross_offset)
                record.features["height_rank_in_building"] = float(height_rank)
                record.features["local_density"] = float(local_density_scores[index])
                record.features["step_support"] = float(step_support)
                record.features["track_point_count"] = float(len(group))
                record.features["kept_support_ratio"] = kept_support_ratio
                record.flags["height_rank_bucket"] = self._height_bucket(height_rank)
                record.flags["building_track_point_count"] = len(group)
                record.building_context = {
                    "building_id": key[0],
                    "assignment_method": record.assignment_method or "unassigned",
                    "track_point_count": len(group),
                    "distance_m": record.distance_m,
                    "buffer_m": record.buffer_m,
                    "range_offset_m": record.range_offset_m,
                    "building_height": record.building_height,
                    "slope_mean_deg": record.slope_mean_deg,
                    "slope_max_deg": record.slope_max_deg,
                    "relief_range_m": record.relief_range_m,
                    "along_look_offset_m": along_offset,
                    "cross_look_offset_m": cross_offset,
                    "height_rank_in_building": height_rank,
                    "local_density": local_density_scores[index],
                    "step_support": step_support,
                }

            local_scores = self._local_deviation_scores(group)
            for record in group:
                record.local_deviation_score = float(local_scores.get(record.code, 0.0))

        for record in records:
            if record.building_id:
                continue
            record.features["along_look_offset_m"] = 0.0
            record.features["cross_look_offset_m"] = 0.0
            record.features["height_rank_in_building"] = 0.0
            record.features["local_density"] = 0.0
            record.features["step_support"] = 0.0
            record.features["track_point_count"] = 0.0
            record.features["kept_support_ratio"] = 0.0
            record.flags["height_rank_bucket"] = "unknown"
            record.local_deviation_score = 0.0
            record.building_context = {
                "building_id": None,
                "assignment_method": "unassigned",
                "track_point_count": 0,
                "distance_m": None,
                "buffer_m": None,
                "range_offset_m": None,
                "building_height": None,
            }

    def _apply_gate_rules(
        self,
        records: list[LocalPointRecord],
        track_stats: dict[int, dict[str, float]],
        params: dict[str, Any],
    ) -> None:
        min_valid_epochs = int(params["min_valid_epochs"])
        min_valid_ratio = float(params["min_valid_epoch_ratio"])
        coherence_floor = float(params["coherence_floor"])

        for record in records:
            reasons: list[str] = []
            track_stat = track_stats[record.track]
            valid_count = int(record.features["valid_epoch_count"])
            valid_ratio = float(record.features["valid_epoch_ratio"])
            coherence_threshold = max(coherence_floor, track_stat["coherence_p05"])
            if not record.building_id:
                reasons.append("no_building_assignment")
            if valid_count < min_valid_epochs:
                reasons.append("too_few_valid_epochs")
            if valid_ratio < min_valid_ratio:
                reasons.append("too_sparse_timeseries")
            if self._safe_value(record.coherence) < coherence_threshold:
                reasons.append("low_coherence")

            record.gate_reasons = reasons
            record.gate_excluded = bool(reasons)
            record.kept_for_scoring = not record.gate_excluded
            record.flags["gate_excluded"] = record.gate_excluded
            record.flags["gate_reasons"] = reasons
            record.flags["coherence_threshold"] = coherence_threshold
            record.flags["valid_epoch_count"] = valid_count
            record.flags["valid_epoch_ratio"] = valid_ratio
            if reasons and "degraded_reason" not in record.flags:
                record.flags["degraded_reason"] = reasons[0]

    def _cluster_building_groups(self, records: list[LocalPointRecord], params: dict[str, Any]) -> None:
        building_track_groups: dict[tuple[str, int], list[LocalPointRecord]] = defaultdict(list)
        for record in records:
            if record.building_id:
                building_track_groups[(record.building_id, record.track)].append(record)

        for (building_id, track), group in building_track_groups.items():
            kept = [record for record in group if not record.gate_excluded]
            kept_ratio = len(kept) / max(len(group), 1)
            for record in group:
                record.features["kept_support_ratio"] = float(kept_ratio)
                record.building_context["kept_point_count_track"] = len(kept)
                record.building_context["excluded_point_count_track"] = len(group) - len(kept)

            if len(kept) < 3:
                for record in kept:
                    record.cluster_id = f"{building_id}:t{track}:insufficient_support"
                    record.cluster_role = "insufficient_support"
                    record.cluster_probability = 0.5
                    record.cluster_outlier_score = max(record.cluster_outlier_score, record.local_deviation_score)
                    record.label = "suspect"
                    record.flags["degraded_reason"] = "insufficient_support"
                    record.building_context["cluster_count_track"] = 0
                    record.building_context["noise_point_count_track"] = 0
                    record.building_context["small_n_fallback"] = False
                for record in group:
                    if record.gate_excluded:
                        self._mark_excluded(record, track)
                continue

            if len(kept) <= 5:
                self._apply_small_n_fallback(building_id, track, kept, float(params["small_n_noise_threshold"]))
            else:
                self._apply_density_clustering(building_id, track, kept)

            cluster_ids = {record.cluster_id for record in kept if record.cluster_role == "core" and record.cluster_id}
            noise_count = sum(1 for record in kept if record.cluster_role == "noise")
            for record in kept:
                record.building_context["cluster_count_track"] = len(cluster_ids)
                record.building_context["noise_point_count_track"] = noise_count
                record.building_context["small_n_fallback"] = record.small_n_fallback
            for record in group:
                if record.gate_excluded:
                    self._mark_excluded(record, track)

    def _apply_small_n_fallback(
        self,
        building_id: str,
        track: int,
        kept: list[LocalPointRecord],
        noise_threshold: float,
    ) -> None:
        scores = np.asarray([max(record.local_deviation_score, 0.0) for record in kept], dtype=float)
        ranked = np.argsort(scores)
        core_mask = scores <= noise_threshold
        if not np.any(core_mask):
            core_mask[ranked[:1]] = True

        cluster_id = f"{building_id}:t{track}:cluster_0"
        for index, record in enumerate(kept):
            record.small_n_fallback = True
            record.cluster_probability = float(np.clip(1.0 - scores[index], 0.05, 0.95))
            record.cluster_outlier_score = float(np.clip(scores[index], 0.0, 1.0))
            if core_mask[index]:
                record.cluster_id = cluster_id
                record.cluster_role = "core"
            else:
                record.cluster_id = f"{building_id}:t{track}:noise"
                record.cluster_role = "noise"

    def _apply_density_clustering(
        self,
        building_id: str,
        track: int,
        kept: list[LocalPointRecord],
    ) -> None:
        matrix = self._cluster_matrix(kept)
        n_samples = matrix.shape[0]
        min_cluster_size = max(2, min(8, int(math.ceil(0.2 * n_samples))))
        min_samples = max(1, int(math.floor(min_cluster_size / 2)))

        labels: np.ndarray
        probabilities: np.ndarray
        outlier_scores: np.ndarray

        if hdbscan is not None:
            model = hdbscan.HDBSCAN(
                min_cluster_size=min_cluster_size,
                min_samples=min_samples,
                metric="euclidean",
                allow_single_cluster=True,
                cluster_selection_method="eom",
            )
            labels = model.fit_predict(matrix)
            probabilities = np.asarray(getattr(model, "probabilities_", np.ones(n_samples)), dtype=float)
            outlier_scores = self._normalise_scores(
                np.asarray(getattr(model, "outlier_scores_", 1.0 - probabilities), dtype=float),
            )
        else:
            model = OPTICS(
                min_samples=max(2, min_samples),
                min_cluster_size=min_cluster_size,
                cluster_method="xi",
                xi=0.05,
            )
            labels = model.fit_predict(matrix)
            reachability = np.asarray(getattr(model, "reachability_", np.full(n_samples, np.inf)), dtype=float)
            finite = reachability[np.isfinite(reachability)]
            if finite.size:
                outlier_scores = np.asarray(
                    [
                        1.0 if not np.isfinite(value) else (value - np.min(finite)) / max(np.ptp(finite), EPSILON)
                        for value in reachability
                    ],
                    dtype=float,
                )
            else:
                outlier_scores = np.full(n_samples, 0.5, dtype=float)
            probabilities = np.clip(1.0 - outlier_scores, 0.05, 0.95)

        labels = self._coerce_single_cluster(labels, matrix)
        labels, probabilities, outlier_scores = self._reassign_borderline_noise(
            kept,
            matrix,
            labels,
            probabilities,
            outlier_scores,
        )
        cluster_sizes = {
            label: int(np.sum(labels == label))
            for label in set(labels.tolist())
            if label >= 0
        }

        for index, record in enumerate(kept):
            label = int(labels[index])
            probability = float(np.clip(probabilities[index], 0.05, 0.99))
            outlier_score = float(np.clip(outlier_scores[index], 0.0, 1.0))
            record.cluster_probability = probability
            record.cluster_outlier_score = outlier_score
            if label >= 0:
                record.cluster_id = f"{building_id}:t{track}:cluster_{label}"
                record.cluster_role = "core"
                record.building_context["cluster_member_count"] = cluster_sizes.get(label, 0)
            else:
                record.cluster_id = f"{building_id}:t{track}:noise"
                record.cluster_role = "noise"
                record.cluster_outlier_score = max(outlier_score, 0.75)
                record.building_context["cluster_member_count"] = 0

    def _reassign_borderline_noise(
        self,
        kept: list[LocalPointRecord],
        matrix: np.ndarray,
        labels: np.ndarray,
        probabilities: np.ndarray,
        outlier_scores: np.ndarray,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        cluster_labels = sorted(label for label in set(labels.tolist()) if label >= 0)
        if not cluster_labels:
            return labels, probabilities, outlier_scores

        cluster_centroids: dict[int, np.ndarray] = {}
        cluster_radii: dict[int, float] = {}
        for label in cluster_labels:
            members = matrix[labels == label]
            centroid = np.median(members, axis=0)
            distances = np.linalg.norm(members - centroid, axis=1)
            radius = float(np.percentile(distances, 90)) if distances.size else 0.0
            cluster_centroids[label] = centroid
            cluster_radii[label] = max(radius, 0.65)

        for index, label in enumerate(labels):
            if label != -1:
                continue
            record = kept[index]
            if record.local_deviation_score > 0.75:
                continue
            if self._safe_value(record.coherence) < 0.45:
                continue

            best_label: int | None = None
            best_distance = float("inf")
            for candidate_label in cluster_labels:
                centroid = cluster_centroids[candidate_label]
                distance = float(np.linalg.norm(matrix[index] - centroid))
                if distance < best_distance:
                    best_distance = distance
                    best_label = candidate_label

            if best_label is None:
                continue

            radius = cluster_radii[best_label]
            distance_m = self._safe_value(record.distance_m)
            within_local_support = best_distance <= ((radius * 1.35) + 0.35)
            reasonable_assignment = (
                record.assignment_method != "nearest"
                or distance_m <= 8.0
                or record.features.get("track_point_count", 0.0) <= 12
            )

            if within_local_support and reasonable_assignment:
                labels[index] = best_label
                probabilities[index] = max(float(probabilities[index]), 0.35)
                outlier_scores[index] = min(float(outlier_scores[index]), 0.55)

        return labels, probabilities, outlier_scores

    def _compute_phase1_rollups(self, records: list[LocalPointRecord]) -> dict[str, float]:
        by_building: dict[str, list[LocalPointRecord]] = defaultdict(list)
        for record in records:
            if record.building_id:
                by_building[record.building_id].append(record)

        diffs_before: list[float] = []
        diffs_after: list[float] = []
        buildings_with_both_tracks_kept = 0

        for building_id, building_records in by_building.items():
            building_rollup, cluster_rollups, cross_track_summary = self._build_building_rollup(
                building_id,
                building_records,
            )
            if cross_track_summary.get("diff_before_mm_a") is not None:
                diffs_before.append(float(cross_track_summary["diff_before_mm_a"]))
            if cross_track_summary.get("diff_after_mm_a") is not None:
                diffs_after.append(float(cross_track_summary["diff_after_mm_a"]))
            if cross_track_summary.get("full_support"):
                buildings_with_both_tracks_kept += 1

            for record in building_records:
                cluster_rollup = cluster_rollups.get((record.track, record.cluster_id))
                record.cluster_rollup = dict(cluster_rollup) if cluster_rollup else {}
                record.building_rollup = dict(building_rollup)
                record.cross_track_summary = dict(cross_track_summary)
                record.cross_track_consistency = building_rollup.get("track_agreement_score")
                record.flags["cross_track_full_support"] = bool(cross_track_summary.get("full_support"))
                record.flags["is_main_cluster"] = bool(record.cluster_rollup.get("is_main_cluster", False))
                record.flags["cluster_rank"] = record.cluster_rollup.get("cluster_rank")
                if record.building_context:
                    record.building_context["main_cluster_track_44_id"] = building_rollup.get(
                        "main_cluster_track_44_id"
                    )
                    record.building_context["main_cluster_track_95_id"] = building_rollup.get(
                        "main_cluster_track_95_id"
                    )
                    record.building_context["building_motion_mm_a"] = building_rollup.get(
                        "building_motion_mm_a"
                    )
                    record.building_context["building_reliability_score"] = building_rollup.get(
                        "building_reliability_score"
                    )
                    record.building_context["building_reliability_band"] = building_rollup.get(
                        "building_reliability_band"
                    )
                    record.building_context["differential_motion_flag"] = building_rollup.get(
                        "differential_motion_flag"
                    )

        return {
            "median_cross_track_diff_before": float(np.median(diffs_before)) if diffs_before else 0.0,
            "median_cross_track_diff_after": float(np.median(diffs_after)) if diffs_after else 0.0,
            "buildings_with_both_tracks_kept": float(buildings_with_both_tracks_kept),
            "full_cross_track_points": float(
                sum(
                    1
                    for record in records
                    if record.cross_track_summary.get("full_support")
                    and not record.gate_excluded
                    and record.cluster_role != "noise"
                )
            ),
        }

    def _build_building_rollup(
        self,
        building_id: str,
        records: list[LocalPointRecord],
    ) -> tuple[dict[str, Any], dict[tuple[int, str | None], dict[str, Any]], dict[str, Any]]:
        kept_records = [record for record in records if not record.gate_excluded]
        excluded_point_count = len(records) - len(kept_records)
        noise_point_count = sum(1 for record in kept_records if record.cluster_role == "noise")
        cluster_rollups: dict[tuple[int, str | None], dict[str, Any]] = {}
        track_rollups: dict[int, dict[str, Any]] = {}
        reliable_cluster_count = 0
        cluster_count = 0

        for track in sorted({record.track for record in records}):
            track_records = [
                record
                for record in kept_records
                if record.track == track and record.cluster_id is not None
            ]
            track_cluster_records: dict[str, list[LocalPointRecord]] = defaultdict(list)
            for record in track_records:
                track_cluster_records[str(record.cluster_id)].append(record)

            track_cluster_rollups: list[dict[str, Any]] = []
            for cluster_id, cluster_records in track_cluster_records.items():
                cluster_role = str(cluster_records[0].cluster_role or "unknown")
                point_count = len(cluster_records)
                median_velocity = float(np.median([record.velocity for record in cluster_records]))
                median_vertical_proxy = float(
                    np.median([self._vertical_proxy(record) for record in cluster_records])
                )
                cluster_centroid_x = float(
                    np.median([record.x_m for record in cluster_records])
                ) if cluster_role == "core" else None
                cluster_centroid_y = float(
                    np.median([record.y_m for record in cluster_records])
                ) if cluster_role == "core" else None
                coherence_values = [
                    float(record.coherence)
                    for record in cluster_records
                    if record.coherence is not None
                ]
                median_coherence = float(np.median(coherence_values)) if coherence_values else None
                height_ranks = [
                    float(record.features.get("height_rank_in_building", 0.0))
                    for record in cluster_records
                ]
                median_height_rank = float(np.median(height_ranks)) if height_ranks else None
                assignment_quality = sum(
                    1 for record in cluster_records if record.assignment_method != "nearest"
                ) / max(point_count, 1)
                reliable_core = cluster_role == "core" and point_count >= 2
                cluster_reliability_score = None
                if cluster_role == "core":
                    support_score = min(point_count / 4.0, 1.0)
                    signal_score = float(np.clip(self._safe_value(median_coherence), 0.0, 1.0))
                    cluster_reliability_score = float(
                        np.clip(
                            (0.45 * support_score)
                            + (0.35 * signal_score)
                            + (0.20 * assignment_quality),
                            0.0,
                            1.0,
                        )
                    )

                track_cluster_rollups.append(
                    {
                        "cluster_id": cluster_id,
                        "building_source": "gba",
                        "building_id": building_id,
                        "track": track,
                        "cluster_role": cluster_role,
                        "is_main_cluster": False,
                        "cluster_rank": None,
                        "point_count": point_count,
                        "median_velocity_mm_a": median_velocity,
                        "median_vertical_proxy_mm_a": median_vertical_proxy,
                        "cluster_centroid_x_m": cluster_centroid_x,
                        "cluster_centroid_y_m": cluster_centroid_y,
                        "median_coherence": median_coherence,
                        "median_height_rank": median_height_rank,
                        "cluster_reliability_score": cluster_reliability_score,
                        "motion_delta_to_main_mm_a": None,
                        "assignment_quality": assignment_quality,
                        "reliable_core": reliable_core,
                    }
                )

            reliable_clusters = [
                cluster for cluster in track_cluster_rollups if cluster.get("reliable_core")
            ]
            main_cluster = None
            if reliable_clusters:
                main_cluster = sorted(
                    reliable_clusters,
                    key=lambda cluster: (
                        -int(cluster["point_count"]),
                        -self._safe_value(cluster.get("median_coherence"), -1.0),
                        -self._safe_value(cluster.get("median_height_rank"), -1.0),
                        str(cluster["cluster_id"]),
                    ),
                )[0]
            main_cluster_id = str(main_cluster["cluster_id"]) if main_cluster else None
            main_cluster_motion = (
                float(main_cluster["median_vertical_proxy_mm_a"]) if main_cluster else None
            )

            ranked_clusters = sorted(
                track_cluster_rollups,
                key=lambda cluster: (
                    0 if str(cluster["cluster_id"]) == main_cluster_id else 1,
                    {"core": 0, "insufficient_support": 1, "noise": 2, "excluded": 3}.get(
                        str(cluster["cluster_role"]),
                        4,
                    ),
                    -int(cluster["point_count"]),
                    -self._safe_value(cluster.get("median_coherence"), -1.0),
                    -self._safe_value(cluster.get("median_height_rank"), -1.0),
                    str(cluster["cluster_id"]),
                ),
            )

            for rank, cluster in enumerate(ranked_clusters, start=1):
                cluster["is_main_cluster"] = str(cluster["cluster_id"]) == main_cluster_id
                cluster["cluster_rank"] = rank
                if main_cluster_motion is None or cluster.get("median_vertical_proxy_mm_a") is None:
                    cluster["motion_delta_to_main_mm_a"] = None
                elif cluster["is_main_cluster"]:
                    cluster["motion_delta_to_main_mm_a"] = 0.0
                else:
                    cluster["motion_delta_to_main_mm_a"] = float(
                        abs(float(cluster["median_vertical_proxy_mm_a"]) - main_cluster_motion)
                    )
                cluster_rollups[(track, str(cluster["cluster_id"]))] = {
                    key: value
                    for key, value in cluster.items()
                    if key not in {"assignment_quality", "reliable_core"}
                }

            reliable_cluster_count += len(reliable_clusters)
            cluster_count += len(track_cluster_rollups)
            track_rollups[track] = {
                "track": track,
                "main_cluster_id": main_cluster_id,
                "track_motion_mm_a": main_cluster_motion,
                "main_cluster_support": int(main_cluster["point_count"]) if main_cluster else 0,
                "main_cluster_signal": (
                    self._safe_value(main_cluster.get("median_coherence"))
                    if main_cluster
                    else 0.0
                ),
                "main_cluster_assignment_quality": (
                    float(main_cluster["assignment_quality"]) if main_cluster else 0.0
                ),
            }

        slope_mean = max(
            [self._safe_value(record.slope_mean_deg) for record in records if record.slope_mean_deg is not None]
            or [0.0]
        )
        allowed_diff = 1.0 + (0.15 * slope_mean)
        kept_by_track: dict[int, list[LocalPointRecord]] = defaultdict(list)
        for record in kept_records:
            kept_by_track[record.track].append(record)

        before_diff = None
        if kept_by_track.get(44) and kept_by_track.get(95):
            before_diff = abs(
                self._median_vertical_proxy(kept_by_track[44])
                - self._median_vertical_proxy(kept_by_track[95])
            )

        motion_44 = track_rollups.get(44, {}).get("track_motion_mm_a")
        motion_95 = track_rollups.get(95, {}).get("track_motion_mm_a")
        after_diff = None
        track_agreement_score = None
        if motion_44 is not None and motion_95 is not None:
            after_diff = abs(float(motion_44) - float(motion_95))
            track_agreement_score = float(math.exp(-(after_diff / max(allowed_diff, EPSILON))))

        full_support = bool(
            track_rollups.get(44, {}).get("main_cluster_support", 0) >= 2
            and track_rollups.get(95, {}).get("main_cluster_support", 0) >= 2
            and motion_44 is not None
            and motion_95 is not None
        )

        differential_motion_flag = False
        for track, track_rollup in track_rollups.items():
            main_cluster_id = track_rollup.get("main_cluster_id")
            main_cluster_motion = track_rollup.get("track_motion_mm_a")
            if main_cluster_id is None or main_cluster_motion is None:
                continue
            reliable_clusters = [
                cluster
                for cluster in cluster_rollups.values()
                if cluster["track"] == track
                and cluster["cluster_role"] == "core"
                and int(cluster["point_count"]) >= 2
            ]
            if len(reliable_clusters) < 2:
                continue
            threshold = max(1.5, allowed_diff)
            for cluster in reliable_clusters:
                if cluster["cluster_id"] == main_cluster_id:
                    continue
                delta = cluster.get("motion_delta_to_main_mm_a")
                if delta is not None and float(delta) >= threshold:
                    differential_motion_flag = True
                    break
            if differential_motion_flag:
                break

        main_tracks = [
            track for track, values in track_rollups.items() if values.get("main_cluster_id") is not None
        ]
        weak_main_cluster_tracks = sorted(
            track
            for track, values in track_rollups.items()
            if values.get("main_cluster_id") is not None
            and int(values.get("main_cluster_support", 0)) < 3
        )
        weak_secondary_track_flag = len(main_tracks) >= 2 and bool(weak_main_cluster_tracks)
        main_cluster_support_total = sum(
            int(values.get("main_cluster_support", 0)) for values in track_rollups.values()
        )
        building_motion_values = [
            float(values["track_motion_mm_a"])
            for values in track_rollups.values()
            if values.get("track_motion_mm_a") is not None
        ]
        building_motion_mm_a = (
            float(np.mean(building_motion_values)) if building_motion_values else None
        )

        if len(kept_records) < 3 or not main_tracks:
            building_status = "insufficient_support"
        elif noise_point_count > len(kept_records) * 0.5:
            building_status = "noise_dominated"
        elif main_cluster_support_total < 4:
            building_status = "small_n"
        elif len(main_tracks) == 1:
            building_status = "single_track_only"
        else:
            building_status = "ok"

        agreement_tension_flag = bool(
            track_agreement_score is not None and float(track_agreement_score) < 0.25
        )
        low_agreement_band_cap = bool(
            building_status == "ok"
            and len(main_tracks) >= 2
            and track_agreement_score is not None
            and float(track_agreement_score) < 0.10
        )
        reliability_penalties: list[dict[str, Any]] = []
        retuning_penalty_total = 0.0
        if weak_main_cluster_tracks:
            retuning_penalty_total += 0.10
            reliability_penalties.append(
                {
                    "key": "weak_main_cluster_support",
                    "score_delta": -0.10,
                    "tracks": [str(track) for track in weak_main_cluster_tracks],
                    "threshold_min_points": 3,
                }
            )
        if weak_secondary_track_flag:
            reliability_penalties.append(
                {
                    "key": "weak_secondary_track_band_cap",
                    "cap_band": "medium",
                    "tracks": [str(track) for track in weak_main_cluster_tracks],
                }
            )
        if agreement_tension_flag:
            retuning_penalty_total += 0.10
            reliability_penalties.append(
                {
                    "key": "low_track_agreement",
                    "score_delta": -0.10,
                    "threshold_max_score": 0.25,
                    "observed_score": float(track_agreement_score) if track_agreement_score is not None else None,
                }
            )
        if low_agreement_band_cap:
            reliability_penalties.append(
                {
                    "key": "very_low_track_agreement_band_cap",
                    "cap_band": "low",
                    "threshold_max_score": 0.10,
                    "observed_score": float(track_agreement_score) if track_agreement_score is not None else None,
                }
            )

        building_reliability_score = None
        building_reliability_band = None
        if building_status != "insufficient_support":
            support_component = min(main_cluster_support_total / 6.0, 1.0)
            signal_values = [
                float(values["main_cluster_signal"])
                for values in track_rollups.values()
                if values.get("main_cluster_id") is not None
            ]
            assignment_values = [
                float(values["main_cluster_assignment_quality"])
                for values in track_rollups.values()
                if values.get("main_cluster_id") is not None
            ]
            signal_component = float(np.mean(signal_values)) if signal_values else 0.0
            assignment_component = float(np.mean(assignment_values)) if assignment_values else 0.0
            agreement_component = (
                float(track_agreement_score) if track_agreement_score is not None else 0.5
            )
            building_reliability_score = float(
                np.clip(
                    (0.35 * support_component)
                    + (0.25 * signal_component)
                    + (0.20 * assignment_component)
                    + (0.20 * agreement_component)
                    - (0.15 if len(main_tracks) == 1 else 0.0)
                    - (0.10 if main_cluster_support_total < 4 else 0.0)
                    - (0.15 if noise_point_count > len(kept_records) * 0.5 else 0.0)
                    - (0.15 if differential_motion_flag else 0.0)
                    - retuning_penalty_total,
                    0.0,
                    1.0,
                )
            )
            building_reliability_band = self._reliability_band(building_reliability_score)
            if weak_secondary_track_flag:
                building_reliability_band = self._cap_reliability_band(building_reliability_band, "medium")
            if low_agreement_band_cap:
                building_reliability_band = self._cap_reliability_band(building_reliability_band, "low")

        building_rollup = {
            "building_source": "gba",
            "building_id": building_id,
            "building_status": building_status,
            "building_motion_mm_a": building_motion_mm_a,
            "building_reliability_score": building_reliability_score,
            "building_reliability_band": building_reliability_band,
            "track_agreement_score": track_agreement_score,
            "weak_secondary_track_flag": weak_secondary_track_flag,
            "agreement_tension_flag": agreement_tension_flag,
            "reliability_penalties": reliability_penalties,
            "differential_motion_flag": differential_motion_flag,
            "main_cluster_track_44_id": track_rollups.get(44, {}).get("main_cluster_id"),
            "main_cluster_track_95_id": track_rollups.get(95, {}).get("main_cluster_id"),
            "track_motion_mm_a": {
                str(track): values.get("track_motion_mm_a") for track, values in sorted(track_rollups.items())
            },
            "cluster_count": cluster_count,
            "reliable_cluster_count": reliable_cluster_count,
            "point_count": len(records),
            "kept_point_count": len(kept_records),
            "noise_point_count": noise_point_count,
            "excluded_point_count": excluded_point_count,
        }
        cross_track_summary = {
            "building_id": building_id,
            "allowed_diff_mm_a": allowed_diff,
            "diff_before_mm_a": before_diff,
            "diff_after_mm_a": after_diff,
            "consistency": track_agreement_score,
            "full_support": full_support,
            "main_cluster_track_44_id": building_rollup["main_cluster_track_44_id"],
            "main_cluster_track_95_id": building_rollup["main_cluster_track_95_id"],
        }
        return building_rollup, cluster_rollups, cross_track_summary

    def _compute_neighbourhood_rollups(self, records: list[LocalPointRecord]) -> None:
        by_building: dict[str, list[LocalPointRecord]] = defaultdict(list)
        core_cluster_records: dict[tuple[str, int, str], list[LocalPointRecord]] = defaultdict(list)

        for record in records:
            record.neighbour_context = self._empty_neighbour_context()
            if not record.building_id:
                continue
            by_building[record.building_id].append(record)
            if (
                record.cluster_role == "core"
                and record.cluster_id is not None
                and not record.gate_excluded
            ):
                core_cluster_records[(record.building_id, record.track, str(record.cluster_id))].append(record)

        if not by_building:
            return

        candidate_buildings = self._build_neighbour_candidate_sets(by_building)
        building_main_clusters = {
            building_id: self._main_cluster_ids(building_records)
            for building_id, building_records in by_building.items()
        }
        building_tracks = {
            building_id: sorted({record.track for record in building_records})
            for building_id, building_records in by_building.items()
        }

        cluster_profiles: dict[tuple[str, int, str], dict[str, Any]] = {}
        eligible_clusters_by_building_track: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
        for (building_id, track, cluster_id), cluster_records in core_cluster_records.items():
            base_rollup = cluster_records[0].cluster_rollup or {}
            point_count = int(base_rollup.get("point_count", len(cluster_records)) or len(cluster_records))
            cluster_reliability_score = self._float_or_none(base_rollup.get("cluster_reliability_score"))
            feature_profile = self._build_cluster_fit_profile(cluster_records)
            cluster_profile = {
                "building_id": building_id,
                "track": track,
                "cluster_id": cluster_id,
                "point_count": point_count,
                "cluster_reliability_score": cluster_reliability_score,
                "median_vertical_proxy_mm_a": self._float_or_none(base_rollup.get("median_vertical_proxy_mm_a"))
                if base_rollup.get("median_vertical_proxy_mm_a") is not None
                else self._median_vertical_proxy(cluster_records),
                "cluster_centroid_x_m": self._float_or_none(base_rollup.get("cluster_centroid_x_m"))
                if base_rollup.get("cluster_centroid_x_m") is not None
                else float(np.median([record.x_m for record in cluster_records])),
                "cluster_centroid_y_m": self._float_or_none(base_rollup.get("cluster_centroid_y_m"))
                if base_rollup.get("cluster_centroid_y_m") is not None
                else float(np.median([record.y_m for record in cluster_records])),
                **feature_profile,
            }
            cluster_profiles[(building_id, track, cluster_id)] = cluster_profile
            if point_count >= 2 and cluster_reliability_score is not None:
                eligible_clusters_by_building_track[(building_id, track)].append(cluster_profile)

        cluster_updates: dict[tuple[str, int, str], dict[str, Any]] = {}
        for cluster_key, cluster_profile in cluster_profiles.items():
            building_id, track, cluster_id = cluster_key
            candidate_ids = candidate_buildings.get(building_id, [])
            best_support: dict[str, Any] | None = None
            support_by_neighbour: dict[str, dict[str, Any]] = {}

            for neighbour_building_id in candidate_ids:
                best_for_building: dict[str, Any] | None = None
                for neighbour_profile in eligible_clusters_by_building_track.get((neighbour_building_id, track), []):
                    score = self._pair_consistency_score(cluster_profile, neighbour_profile)
                    if score is None:
                        continue
                    candidate = {
                        "building_id": neighbour_building_id,
                        "cluster_id": str(neighbour_profile["cluster_id"]),
                        "score": float(score),
                    }
                    if self._prefer_scored_candidate(candidate, best_for_building):
                        best_for_building = candidate

                if best_for_building is None:
                    continue
                if self._prefer_scored_candidate(best_for_building, best_support):
                    best_support = best_for_building
                if best_for_building["score"] >= PAIR_SUPPORT_THRESHOLD:
                    support_by_neighbour[neighbour_building_id] = best_for_building

            cluster_updates[cluster_key] = {
                "cluster_centroid_x_m": cluster_profile["cluster_centroid_x_m"],
                "cluster_centroid_y_m": cluster_profile["cluster_centroid_y_m"],
                "neighbour_candidate_building_count": len(candidate_ids),
                "best_neighbour_building_id": (
                    str(best_support["building_id"]) if best_support is not None else None
                ),
                "best_neighbour_cluster_id": (
                    str(best_support["cluster_id"]) if best_support is not None else None
                ),
                "best_neighbour_consistency_score": (
                    float(best_support["score"]) if best_support is not None else None
                ),
                "supporting_neighbour_building_count": len(support_by_neighbour),
                "neighbour_event_candidate_flag": len(support_by_neighbour) >= 2,
            }

        building_updates: dict[str, dict[str, Any]] = {}
        building_misassignment_counts: dict[str, int] = defaultdict(int)
        building_kept_counts = {
            building_id: sum(1 for record in building_records if not record.gate_excluded)
            for building_id, building_records in by_building.items()
        }

        for building_id, building_records in by_building.items():
            candidate_ids = candidate_buildings.get(building_id, [])
            main_clusters = building_main_clusters.get(building_id, {})

            for record in building_records:
                eligible_neighbours = [
                    cluster
                    for neighbour_building_id in candidate_ids
                    for cluster in eligible_clusters_by_building_track.get((neighbour_building_id, record.track), [])
                ]
                context_available = bool(eligible_neighbours)
                point_context = self._empty_neighbour_context()
                point_context["context_available"] = context_available
                point_context["candidate_neighbour_count"] = len(candidate_ids)
                point_context["eligible_neighbour_cluster_count"] = len(eligible_neighbours)

                if context_available and not record.gate_excluded:
                    own_cluster_profile = None
                    if record.cluster_role == "core" and record.cluster_id is not None:
                        own_cluster_profile = cluster_profiles.get(
                            (building_id, record.track, str(record.cluster_id))
                        )
                    if own_cluster_profile is None:
                        main_cluster_id = main_clusters.get(record.track)
                        if main_cluster_id is not None:
                            own_cluster_profile = cluster_profiles.get(
                                (building_id, record.track, str(main_cluster_id))
                            )

                    own_cluster_fit_score = self._cluster_fit_score(record, own_cluster_profile)
                    best_neighbour_fit: dict[str, Any] | None = None
                    for neighbour_cluster in eligible_neighbours:
                        fit_score = self._cluster_fit_score(record, neighbour_cluster)
                        if fit_score is None:
                            continue
                        candidate = {
                            "building_id": str(neighbour_cluster["building_id"]),
                            "cluster_id": str(neighbour_cluster["cluster_id"]),
                            "score": float(fit_score),
                        }
                        if self._prefer_scored_candidate(candidate, best_neighbour_fit):
                            best_neighbour_fit = candidate

                    own_fit_weak_flag = (
                        own_cluster_fit_score is None
                        or own_cluster_fit_score < OWN_FIT_WEAK_THRESHOLD
                    )
                    neighbour_fit_score = (
                        float(best_neighbour_fit["score"]) if best_neighbour_fit is not None else None
                    )
                    neighbour_fit_delta = None
                    if neighbour_fit_score is not None:
                        neighbour_fit_delta = float(
                            neighbour_fit_score
                            - (own_cluster_fit_score if own_cluster_fit_score is not None else 0.0)
                        )
                    misassignment_flag = bool(
                        best_neighbour_fit is not None
                        and neighbour_fit_score is not None
                        and neighbour_fit_score >= NEIGHBOUR_FIT_SCORE_THRESHOLD
                        and own_fit_weak_flag
                        and neighbour_fit_delta is not None
                        and neighbour_fit_delta >= NEIGHBOUR_FIT_DELTA_THRESHOLD
                    )
                    if misassignment_flag:
                        building_misassignment_counts[building_id] += 1

                    point_context.update(
                        {
                            "best_neighbour_building_id": (
                                str(best_neighbour_fit["building_id"])
                                if best_neighbour_fit is not None
                                else None
                            ),
                            "best_neighbour_cluster_id": (
                                str(best_neighbour_fit["cluster_id"])
                                if best_neighbour_fit is not None
                                else None
                            ),
                            "own_cluster_fit_score": own_cluster_fit_score,
                            "neighbour_fit_score": neighbour_fit_score,
                            "neighbour_fit_delta": neighbour_fit_delta,
                            "own_fit_weak_flag": own_fit_weak_flag,
                            "neighbour_misassignment_flag": misassignment_flag,
                        }
                    )
                elif context_available:
                    point_context["own_fit_weak_flag"] = True

                record.neighbour_context = point_context

            supporting_neighbours: dict[str, dict[str, Any]] = {}
            for track in building_tracks.get(building_id, []):
                main_cluster_id = main_clusters.get(track)
                if main_cluster_id is None:
                    continue
                own_cluster_profile = cluster_profiles.get((building_id, track, str(main_cluster_id)))
                if own_cluster_profile is None:
                    continue

                for neighbour_building_id in candidate_ids:
                    best_for_track: dict[str, Any] | None = None
                    for neighbour_cluster in eligible_clusters_by_building_track.get((neighbour_building_id, track), []):
                        score = self._pair_consistency_score(own_cluster_profile, neighbour_cluster)
                        if score is None:
                            continue
                        candidate = {
                            "building_id": neighbour_building_id,
                            "cluster_id": str(neighbour_cluster["cluster_id"]),
                            "track": track,
                            "score": float(score),
                        }
                        if self._prefer_scored_candidate(candidate, best_for_track):
                            best_for_track = candidate

                    if best_for_track is None or best_for_track["score"] < PAIR_SUPPORT_THRESHOLD:
                        continue

                    existing = supporting_neighbours.get(neighbour_building_id)
                    if self._prefer_scored_candidate(best_for_track, existing):
                        supporting_neighbours[neighbour_building_id] = best_for_track

            neighbour_context_available = bool(
                candidate_ids
                and any(
                    eligible_clusters_by_building_track.get((neighbour_building_id, track))
                    for neighbour_building_id in candidate_ids
                    for track in building_tracks.get(building_id, [])
                )
            )
            supporting_scores = [float(values["score"]) for values in supporting_neighbours.values()]
            supporting_neighbour_count = len(supporting_neighbours)
            supporting_track_count = len(
                {int(values["track"]) for values in supporting_neighbours.values()}
            )
            neighbour_consistency_score = None
            neighbour_event_score = None
            if neighbour_context_available:
                neighbour_consistency_score = (
                    float(np.mean(np.asarray(supporting_scores, dtype=float)))
                    if supporting_scores
                    else 0.0
                )
                neighbour_event_score = float(
                    neighbour_consistency_score * min(supporting_neighbour_count / 2.0, 1.0)
                )

            kept_point_count = building_kept_counts.get(building_id, 0)
            neighbour_misassignment_share = (
                float(building_misassignment_counts.get(building_id, 0) / kept_point_count)
                if kept_point_count
                else None
            )
            neighbour_event_flag = bool(
                supporting_neighbour_count >= 2
                and neighbour_event_score is not None
                and neighbour_event_score >= PAIR_SUPPORT_THRESHOLD
                and neighbour_misassignment_share is not None
                and neighbour_misassignment_share < 0.50
            )

            building_updates[building_id] = {
                "neighbour_context_available": neighbour_context_available,
                "neighbour_candidate_building_count": len(candidate_ids),
                "neighbour_misassignment_point_count": int(
                    building_misassignment_counts.get(building_id, 0)
                ),
                "neighbour_misassignment_share": neighbour_misassignment_share,
                "neighbour_event_flag": neighbour_event_flag,
                "neighbour_event_score": neighbour_event_score,
                "neighbour_consistency_score": neighbour_consistency_score,
                "supporting_neighbour_count": supporting_neighbour_count,
                "supporting_track_count": supporting_track_count,
            }

        for record in records:
            if record.building_id:
                record.building_rollup.update(building_updates.get(record.building_id, {}))

            cluster_extension = self._empty_cluster_neighbour_rollup()
            if (
                record.building_id
                and record.cluster_role == "core"
                and record.cluster_id is not None
            ):
                cluster_extension.update(
                    cluster_updates.get((record.building_id, record.track, str(record.cluster_id)), {})
                )
            if record.building_id:
                record.cluster_rollup.update(cluster_extension)

            if record.building_id and record.neighbour_context.get("context_available"):
                building_neighbour_rollup = building_updates.get(record.building_id, {})
                record.neighbour_context["neighbour_event_score"] = building_neighbour_rollup.get(
                    "neighbour_event_score"
                )
                record.neighbour_context["neighbour_event_flag"] = bool(
                    building_neighbour_rollup.get("neighbour_event_flag", False)
                )
                record.neighbour_context["supporting_neighbour_count"] = int(
                    building_neighbour_rollup.get("supporting_neighbour_count", 0) or 0
                )

    def _score_records(
        self,
        records: list[LocalPointRecord],
        track_stats: dict[int, dict[str, float]],
        params: dict[str, Any],
    ) -> None:
        for record in records:
            track_stat = track_stats[record.track]
            rule_penalty, explain_items = self._score_rule_penalty(record, track_stat)
            cluster_outlier = float(np.clip(record.cluster_outlier_score, 0.0, 1.0))
            local_deviation = float(np.clip(record.local_deviation_score, 0.0, 1.0))

            if record.gate_excluded:
                anomaly_score = max(0.90, 0.60 * cluster_outlier + 0.25 * local_deviation + 0.15 * 1.0)
                signal_quality = self._signal_quality(record, track_stat)
                quality_score = min(
                    0.15,
                    0.45 * (1.0 - anomaly_score) + 0.10 * signal_quality,
                )
                record.cluster_role = "excluded"
                record.label = "outlier"
            else:
                anomaly_score = float(
                    np.clip((0.60 * cluster_outlier) + (0.25 * local_deviation) + (0.15 * rule_penalty), 0.0, 1.0)
                )
                if record.cluster_role == "noise":
                    anomaly_score = max(anomaly_score, 0.80)
                cross_track_component = record.cross_track_consistency if record.cross_track_consistency is not None else 0.50
                kept_support_ratio = float(record.features.get("kept_support_ratio", 0.0))
                signal_quality = self._signal_quality(record, track_stat)
                quality_score = float(
                    np.clip(
                        (0.45 * (1.0 - anomaly_score))
                        + (0.25 * cross_track_component)
                        + (0.20 * kept_support_ratio)
                        + (0.10 * signal_quality),
                        0.0,
                        1.0,
                    )
                )
                if record.cluster_role == "insufficient_support":
                    quality_score = min(quality_score, 0.65)
                    record.label = "suspect"
                elif record.cluster_role == "noise":
                    record.label = "outlier"
                else:
                    record.label = self._label_for_quality(
                        quality_score,
                        float(params["quality_normal_threshold"]),
                        float(params["quality_outlier_threshold"]),
                    )

            record.rule_penalty = rule_penalty
            record.anomaly_score = anomaly_score
            record.quality_score = quality_score
            record.detector_scores = {
                "cluster_outlier": cluster_outlier,
                "local_deviation": local_deviation,
                "rule_penalty": rule_penalty,
            }
            record.explain_top_features = self._build_explain_items(record, explain_items)

    def _score_rule_penalty(
        self,
        record: LocalPointRecord,
        track_stats: dict[str, float],
    ) -> tuple[float, list[dict[str, Any]]]:
        total = 0.0
        reasons: list[dict[str, Any]] = []

        if record.assignment_method == "nearest":
            total += 0.20
            reasons.append(self._reason("nearest_assignment", 0.20, "Assigned only via nearest-building fallback"))
        elif record.assignment_method == "directional_buffer":
            total += 0.05
            reasons.append(self._reason("directional_assignment", 0.05, "Assigned via directional building buffer"))

        v_std_p95 = track_stats["velocity_std_p95"]
        if v_std_p95 > EPSILON and record.features["velocity_std"] > v_std_p95:
            severity = min(1.0, (record.features["velocity_std"] - v_std_p95) / max(v_std_p95, 0.25))
            total += severity * 0.20
            reasons.append(self._reason("high_velocity_std", severity, "Velocity uncertainty is high"))

        amp_cv_p95 = track_stats["amp_cv_p95"]
        if record.flags.get("amplitude_available") and amp_cv_p95 > EPSILON and record.features["amp_ts_cv"] > amp_cv_p95:
            severity = min(1.0, (record.features["amp_ts_cv"] - amp_cv_p95) / max(amp_cv_p95, 0.2))
            total += severity * 0.12
            reasons.append(self._reason("unstable_amplitude", severity, "Amplitude time series is unstable"))

        if (
            record.features["ts_primary_step_abs"] > track_stats["step_p90"]
            and record.features.get("step_support", 1.0) < 0.25
        ):
            severity = min(1.0, record.features["ts_primary_step_abs"] / max(track_stats["step_p95"], 1.0))
            total += severity * 0.20
            reasons.append(self._reason("unsupported_step", severity, "Large displacement step lacks local support"))

        kept_support_ratio = float(record.features.get("kept_support_ratio", 0.0))
        if kept_support_ratio < 0.5:
            severity = 1.0 - kept_support_ratio
            total += severity * 0.15
            reasons.append(self._reason("weak_local_support", severity, "Only a small share of local points survived gating"))

        if record.cross_track_consistency is not None and record.cross_track_consistency < 0.6:
            severity = min(1.0, (0.6 - record.cross_track_consistency) / 0.6)
            total += severity * 0.18
            reasons.append(self._reason("cross_track_mismatch", severity, "ASC and DSC disagree after local filtering"))

        return float(np.clip(total, 0.0, 1.0)), reasons

    def _signal_quality(self, record: LocalPointRecord, track_stats: dict[str, float]) -> float:
        coherence = np.clip(self._safe_value(record.coherence, 0.45), 0.0, 1.0)
        amp_cv_p95 = max(track_stats["amp_cv_p95"], 0.20)
        amp_quality = 1.0 - np.clip(record.features["amp_ts_cv"] / (amp_cv_p95 * 1.5), 0.0, 1.0)
        return float(np.clip((0.70 * coherence) + (0.30 * amp_quality), 0.0, 1.0))

    def _evaluate_run(
        self,
        records: list[LocalPointRecord],
        cross_track_metrics: dict[str, float],
    ) -> dict[str, Any]:
        building_states: dict[str, dict[str, Any]] = {}
        for record in records:
            if record.building_id and record.building_rollup:
                building_states[record.building_id] = record.building_rollup

        metrics = {
            "total_points": len(records),
            "assigned_points": sum(1 for record in records if record.building_id),
            "assigned_buildings": len({record.building_id for record in records if record.building_id}),
            "kept_points": sum(1 for record in records if record.kept_for_scoring),
            "gate_excluded_points": sum(1 for record in records if record.gate_excluded),
            "normal_points": sum(1 for record in records if record.label == "normal"),
            "suspect_points": sum(1 for record in records if record.label == "suspect"),
            "outlier_points": sum(1 for record in records if record.label == "outlier"),
            "noise_points": sum(1 for record in records if record.cluster_role == "noise"),
            "buildings_with_clusters": sum(
                1 for state in building_states.values() if int(state.get("cluster_count", 0)) > 0
            ),
            "multi_cluster_buildings": sum(
                1 for state in building_states.values() if int(state.get("reliable_cluster_count", 0)) > 1
            ),
            "small_n_buildings": sum(
                1 for state in building_states.values() if state.get("building_status") == "small_n"
            ),
            "full_cross_track_points": int(cross_track_metrics["full_cross_track_points"]),
            "buildings_with_both_tracks_kept": int(cross_track_metrics["buildings_with_both_tracks_kept"]),
            "median_cross_track_diff_before": cross_track_metrics["median_cross_track_diff_before"],
            "median_cross_track_diff_after": cross_track_metrics["median_cross_track_diff_after"],
            "cross_track_improvement": cross_track_metrics["median_cross_track_diff_before"]
            - cross_track_metrics["median_cross_track_diff_after"],
        }
        return metrics

    async def _persist_results(self, pool, run_id: str, records: list[LocalPointRecord]) -> None:
        insert_query = """
            INSERT INTO ml_point_results (
                run_id,
                code,
                track,
                cluster_id,
                building_source,
                building_id,
                distance_m,
                score,
                anomaly_score,
                quality_score,
                cross_track_consistency,
                label,
                feature_set_version,
                model_set_version,
                meta
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb
            )
        """
        payloads = []
        for record in records:
            meta = {
                "method": "anomaly_local_v1",
                "feature_flags": record.flags,
                "building_context": record.building_context,
                "cross_track_summary": record.cross_track_summary,
                "cluster_rollup": record.cluster_rollup,
                "building_rollup": record.building_rollup,
                "neighbour_context": record.neighbour_context,
                "detector_scores": record.detector_scores,
                "explain_top_features": record.explain_top_features,
                "cluster": {
                    "cluster_role": record.cluster_role,
                    "cluster_probability": record.cluster_probability,
                    "cluster_outlier_score": record.cluster_outlier_score,
                    "small_n_fallback": record.small_n_fallback,
                    "is_main_cluster": record.cluster_rollup.get("is_main_cluster", False),
                    "cluster_rank": record.cluster_rollup.get("cluster_rank"),
                },
                "visual_context": {
                    "gate_excluded": record.gate_excluded,
                    "gate_reasons": record.gate_reasons,
                    "kept_for_scoring": record.kept_for_scoring,
                    "assignment_method": record.assignment_method,
                },
            }
            payloads.append(
                (
                    run_id,
                    record.code,
                    record.track,
                    record.cluster_id,
                    "gba" if record.building_id else None,
                    record.building_id,
                    record.distance_m,
                    record.quality_score,
                    record.anomaly_score,
                    record.quality_score,
                    record.cross_track_consistency,
                    record.label,
                    FEATURE_SET_VERSION,
                    MODEL_SET_VERSION,
                    json.dumps(meta),
                )
            )

        async with pool.acquire() as conn:
            await conn.executemany(insert_query, payloads)

    def _cluster_matrix(self, records: list[LocalPointRecord]) -> np.ndarray:
        matrix = np.asarray(
            [
                [
                    record.features["along_look_offset_m"],
                    record.features["cross_look_offset_m"],
                    record.features["height_rank_in_building"],
                    record.velocity,
                    self._safe_value(record.acceleration),
                    record.features["coherence_penalty"],
                ]
                for record in records
            ],
            dtype=float,
        )
        scaled = RobustScaler(quantile_range=(15, 85)).fit_transform(matrix)
        weights = np.asarray([1.10, 1.00, 0.75, 1.30, 0.90, 0.80], dtype=float)
        return np.nan_to_num(scaled * weights, nan=0.0)

    def _coerce_single_cluster(self, labels: np.ndarray, matrix: np.ndarray) -> np.ndarray:
        if np.any(labels >= 0):
            return labels
        if matrix.shape[0] < 3:
            return labels
        return np.zeros(matrix.shape[0], dtype=int)

    def _normalise_scores(self, values: np.ndarray) -> np.ndarray:
        finite = values[np.isfinite(values)]
        if finite.size == 0:
            return np.full(values.shape[0], 0.5, dtype=float)
        lower = float(np.min(finite))
        upper = float(np.max(finite))
        if upper <= lower + EPSILON:
            return np.full(values.shape[0], 0.25, dtype=float)
        normalised = np.asarray(
            [
                1.0 if not np.isfinite(value) else (value - lower) / max(upper - lower, EPSILON)
                for value in values
            ],
            dtype=float,
        )
        return np.clip(normalised, 0.0, 1.0)

    def _build_neighbour_candidate_sets(
        self,
        by_building: dict[str, list[LocalPointRecord]],
    ) -> dict[str, list[str]]:
        building_positions = {
            building_id: self._building_neighbour_position(building_records)
            for building_id, building_records in by_building.items()
        }
        candidate_sets: dict[str, list[str]] = {}

        for building_id, position in building_positions.items():
            if position is None:
                candidate_sets[building_id] = []
                continue

            ranked: list[tuple[float, str]] = []
            origin_x, origin_y = position
            for other_building_id, other_position in building_positions.items():
                if other_building_id == building_id or other_position is None:
                    continue
                delta_x = float(origin_x - other_position[0])
                delta_y = float(origin_y - other_position[1])
                distance = float(math.hypot(delta_x, delta_y))
                if distance <= NEIGHBOUR_BUILDING_RADIUS_M:
                    ranked.append((distance, other_building_id))

            ranked.sort(key=lambda item: (item[0], item[1]))
            candidate_sets[building_id] = [
                neighbour_building_id
                for _, neighbour_building_id in ranked[:MAX_NEIGHBOUR_BUILDINGS]
            ]

        return candidate_sets

    def _building_neighbour_position(
        self,
        building_records: list[LocalPointRecord],
    ) -> tuple[float, float] | None:
        centroid_pairs = [
            (float(record.building_centroid_x_m), float(record.building_centroid_y_m))
            for record in building_records
            if record.building_centroid_x_m is not None and record.building_centroid_y_m is not None
        ]
        if centroid_pairs:
            return (
                float(np.median([value[0] for value in centroid_pairs])),
                float(np.median([value[1] for value in centroid_pairs])),
            )

        # The in-process P3 pass has no building polygons available, so it falls back to
        # the kept-point median as a conservative proxy for the building footprint centre.
        source_records = [record for record in building_records if not record.gate_excluded] or building_records
        if not source_records:
            return None
        return (
            float(np.median([record.x_m for record in source_records])),
            float(np.median([record.y_m for record in source_records])),
        )

    def _main_cluster_ids(self, building_records: list[LocalPointRecord]) -> dict[int, str]:
        if not building_records:
            return {}
        rollup = building_records[0].building_rollup or {}
        main_clusters: dict[int, str] = {}
        if rollup.get("main_cluster_track_44_id") is not None:
            main_clusters[44] = str(rollup["main_cluster_track_44_id"])
        if rollup.get("main_cluster_track_95_id") is not None:
            main_clusters[95] = str(rollup["main_cluster_track_95_id"])
        return main_clusters

    def _build_cluster_fit_profile(
        self,
        cluster_records: list[LocalPointRecord],
    ) -> dict[str, dict[str, float]]:
        feature_values = {
            "motion": np.asarray([self._vertical_proxy(record) for record in cluster_records], dtype=float),
            "along": np.asarray(
                [record.features.get("along_look_offset_m", 0.0) for record in cluster_records],
                dtype=float,
            ),
            "cross": np.asarray(
                [record.features.get("cross_look_offset_m", 0.0) for record in cluster_records],
                dtype=float,
            ),
            "height": np.asarray(
                [record.features.get("height_rank_in_building", 0.0) for record in cluster_records],
                dtype=float,
            ),
            "step": np.asarray(
                [record.features.get("ts_primary_step_abs", 0.0) for record in cluster_records],
                dtype=float,
            ),
        }
        medians: dict[str, float] = {}
        scales: dict[str, float] = {}
        for feature_name, values in feature_values.items():
            median = float(np.median(values)) if values.size else 0.0
            mad = float(np.median(np.abs(values - median))) if values.size else 0.0
            medians[feature_name] = median
            scales[feature_name] = max(1.4826 * mad, CLUSTER_FIT_SCALE_FLOORS[feature_name])
        return {
            "fit_medians": medians,
            "fit_scales": scales,
        }

    def _cluster_fit_score(
        self,
        record: LocalPointRecord,
        cluster_profile: dict[str, Any] | None,
    ) -> float | None:
        if cluster_profile is None:
            return None

        medians = cluster_profile.get("fit_medians")
        scales = cluster_profile.get("fit_scales")
        if not isinstance(medians, dict) or not isinstance(scales, dict):
            return None

        motion_z = abs(self._vertical_proxy(record) - float(medians["motion"])) / max(float(scales["motion"]), EPSILON)
        along_z = abs(record.features.get("along_look_offset_m", 0.0) - float(medians["along"])) / max(
            float(scales["along"]),
            EPSILON,
        )
        cross_z = abs(record.features.get("cross_look_offset_m", 0.0) - float(medians["cross"])) / max(
            float(scales["cross"]),
            EPSILON,
        )
        height_z = abs(record.features.get("height_rank_in_building", 0.0) - float(medians["height"])) / max(
            float(scales["height"]),
            EPSILON,
        )
        step_z = abs(record.features.get("ts_primary_step_abs", 0.0) - float(medians["step"])) / max(
            float(scales["step"]),
            EPSILON,
        )
        fit_cost = (
            (0.40 * motion_z)
            + (0.20 * along_z)
            + (0.15 * cross_z)
            + (0.10 * height_z)
            + (0.15 * step_z)
        )
        cluster_reliability_score = self._safe_value(
            self._float_or_none(cluster_profile.get("cluster_reliability_score")),
            0.0,
        )
        fit_score = math.exp(-fit_cost) * (0.70 + (0.30 * cluster_reliability_score))
        return float(np.clip(fit_score, 0.0, 1.0))

    def _pair_consistency_score(
        self,
        own_cluster_profile: dict[str, Any],
        neighbour_cluster_profile: dict[str, Any],
    ) -> float | None:
        own_motion = self._float_or_none(own_cluster_profile.get("median_vertical_proxy_mm_a"))
        neighbour_motion = self._float_or_none(neighbour_cluster_profile.get("median_vertical_proxy_mm_a"))
        own_reliability = self._float_or_none(own_cluster_profile.get("cluster_reliability_score"))
        neighbour_reliability = self._float_or_none(
            neighbour_cluster_profile.get("cluster_reliability_score")
        )
        if (
            own_motion is None
            or neighbour_motion is None
            or own_reliability is None
            or neighbour_reliability is None
        ):
            return None

        own_sign = int(np.sign(own_motion))
        neighbour_sign = int(np.sign(neighbour_motion))
        if own_sign != neighbour_sign:
            return 0.0

        motion_threshold = max(
            1.5,
            0.20 * max(abs(own_motion), abs(neighbour_motion), 1.0),
        )
        score = math.exp(-abs(own_motion - neighbour_motion) / max(motion_threshold, EPSILON))
        score *= math.sqrt(max(own_reliability, 0.0) * max(neighbour_reliability, 0.0))
        return float(np.clip(score, 0.0, 1.0))

    def _prefer_scored_candidate(
        self,
        candidate: dict[str, Any] | None,
        current: dict[str, Any] | None,
    ) -> bool:
        if candidate is None:
            return False
        if current is None:
            return True

        candidate_score = float(candidate.get("score", 0.0) or 0.0)
        current_score = float(current.get("score", 0.0) or 0.0)
        if candidate_score > current_score + EPSILON:
            return True
        if candidate_score < current_score - EPSILON:
            return False

        candidate_key = (
            str(candidate.get("building_id") or ""),
            str(candidate.get("cluster_id") or ""),
            int(candidate.get("track", 0) or 0),
        )
        current_key = (
            str(current.get("building_id") or ""),
            str(current.get("cluster_id") or ""),
            int(current.get("track", 0) or 0),
        )
        return candidate_key < current_key

    def _empty_neighbour_context(self) -> dict[str, Any]:
        return {
            "context_available": False,
            "candidate_neighbour_count": 0,
            "eligible_neighbour_cluster_count": 0,
            "best_neighbour_building_id": None,
            "best_neighbour_cluster_id": None,
            "own_cluster_fit_score": None,
            "neighbour_fit_score": None,
            "neighbour_fit_delta": None,
            "own_fit_weak_flag": False,
            "neighbour_misassignment_flag": False,
            "neighbour_event_score": None,
            "neighbour_event_flag": False,
            "supporting_neighbour_count": 0,
        }

    def _empty_cluster_neighbour_rollup(self) -> dict[str, Any]:
        return {
            "cluster_centroid_x_m": None,
            "cluster_centroid_y_m": None,
            "neighbour_candidate_building_count": 0,
            "best_neighbour_building_id": None,
            "best_neighbour_cluster_id": None,
            "best_neighbour_consistency_score": None,
            "supporting_neighbour_building_count": 0,
            "neighbour_event_candidate_flag": False,
        }

    def _local_density_scores(self, coords: np.ndarray) -> list[float]:
        if coords.shape[0] <= 1:
            return [0.0 for _ in range(coords.shape[0])]
        deltas = coords[:, None, :] - coords[None, :, :]
        distances = np.sqrt(np.sum(np.square(deltas), axis=2))
        np.fill_diagonal(distances, np.inf)
        k = min(3, coords.shape[0] - 1)
        nearest_mean = np.mean(np.sort(distances, axis=1)[:, :k], axis=1)
        return [float(np.exp(-(value / 6.0))) for value in nearest_mean]

    def _height_ranks(self, group: list[LocalPointRecord]) -> dict[str, float]:
        valid = [(record.code, record.height) for record in group if record.height is not None]
        if len(valid) < 2:
            return {record.code: 0.5 for record in group}
        ordered = sorted(valid, key=lambda item: float(item[1] or 0.0))
        denominator = max(len(ordered) - 1, 1)
        return {code: index / denominator for index, (code, _) in enumerate(ordered)}

    def _height_bucket(self, rank: float) -> str:
        if rank <= 0.33:
            return "lower"
        if rank <= 0.66:
            return "middle"
        return "upper"

    def _compute_step_support(
        self,
        record: LocalPointRecord,
        group: list[LocalPointRecord],
        threshold: float,
    ) -> float:
        step_abs = record.features["ts_primary_step_abs"]
        if step_abs < threshold:
            return 1.0
        if len(group) <= 1 or record.primary_step_index is None:
            return 0.0
        matches = 0
        for other in group:
            if other.code == record.code or other.primary_step_index is None:
                continue
            if other.features["ts_primary_step_abs"] < threshold * 0.75:
                continue
            if other.primary_step_sign != record.primary_step_sign:
                continue
            if abs(other.primary_step_index - record.primary_step_index) <= 1:
                matches += 1
        return matches / max(len(group) - 1, 1)

    def _local_deviation_scores(self, group: list[LocalPointRecord]) -> dict[str, float]:
        feature_names = [
            "velocity",
            "acceleration",
            "ts_primary_step_abs",
            "along_look_offset_m",
            "cross_look_offset_m",
        ]
        medians: dict[str, float] = {}
        scales: dict[str, float] = {}
        for name in feature_names:
            values = np.asarray(
                [
                    record.velocity if name == "velocity" else record.features.get(name, 0.0)
                    for record in group
                ],
                dtype=float,
            )
            median = float(np.median(values)) if values.size else 0.0
            mad = float(np.median(np.abs(values - median))) if values.size else 0.0
            medians[name] = median
            scales[name] = max(1.4826 * mad, 0.5 if name != "ts_primary_step_abs" else 0.75)

        result: dict[str, float] = {}
        for record in group:
            velocity_z = abs(record.velocity - medians["velocity"]) / scales["velocity"]
            acceleration_z = abs(self._safe_value(record.acceleration) - medians["acceleration"]) / scales["acceleration"]
            step_z = abs(record.features["ts_primary_step_abs"] - medians["ts_primary_step_abs"]) / scales["ts_primary_step_abs"]
            along_z = abs(record.features["along_look_offset_m"] - medians["along_look_offset_m"]) / scales["along_look_offset_m"]
            cross_z = abs(record.features["cross_look_offset_m"] - medians["cross_look_offset_m"]) / scales["cross_look_offset_m"]
            height_edge = abs(record.features["height_rank_in_building"] - 0.5) * 1.4
            coherence_gap = max(0.0, (0.65 - self._safe_value(record.coherence, 0.65)) / 0.65)
            combined = max(
                velocity_z / 3.5,
                acceleration_z / 3.5,
                step_z / 3.0,
                along_z / 4.0,
                cross_z / 4.0,
                height_edge,
                coherence_gap,
            )
            result[record.code] = float(np.clip(combined, 0.0, 1.0))
        return result

    def _median_vertical_proxy(self, records: list[LocalPointRecord]) -> float:
        proxies = np.asarray([self._vertical_proxy(record) for record in records], dtype=float)
        return float(np.median(proxies)) if proxies.size else 0.0

    def _vertical_proxy(self, record: LocalPointRecord) -> float:
        incidence = math.radians(self._safe_value(record.incidence_angle, 38.5))
        return record.velocity / max(math.cos(incidence), 0.30)

    def _mark_excluded(self, record: LocalPointRecord, track: int) -> None:
        suffix = record.building_id or record.code
        record.cluster_id = f"{suffix}:t{track}:excluded"
        record.cluster_role = "excluded"
        record.cluster_probability = 0.0
        record.cluster_outlier_score = max(record.cluster_outlier_score, 1.0)

    def _build_explain_items(
        self,
        record: LocalPointRecord,
        reasons: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        explain = list(reasons)
        if record.gate_excluded:
            explain.extend(
                self._reason(reason, 1.0, reason.replace("_", " ")) for reason in record.gate_reasons
            )
        if record.cluster_role == "noise":
            explain.append(self._reason("noise_cluster", 0.85, "Point fell into local HDBSCAN noise"))
        if record.cluster_role == "insufficient_support":
            explain.append(
                self._reason("insufficient_support", 0.55, "Too few local points remained after gating")
            )
        if record.local_deviation_score >= 0.55:
            explain.append(
                self._reason(
                    "local_motion_deviation",
                    record.local_deviation_score,
                    "Point deviates from the local building movement pattern",
                )
            )
        explain.sort(key=lambda item: item["severity"], reverse=True)
        return explain[:4]

    def _label_for_quality(self, quality_score: float, normal_threshold: float, outlier_threshold: float) -> str:
        if quality_score >= normal_threshold:
            return "normal"
        if quality_score < outlier_threshold:
            return "outlier"
        return "suspect"

    def _reliability_band(self, score: float | None) -> str | None:
        if score is None:
            return None
        if score >= 0.75:
            return "high"
        if score >= 0.45:
            return "medium"
        return "low"

    def _cap_reliability_band(self, band: str | None, cap: str | None) -> str | None:
        if band is None or cap is None:
            return band
        order = {"low": 0, "medium": 1, "high": 2}
        if order.get(band, -1) <= order.get(cap, -1):
            return band
        return cap

    def _reason(self, key: str, severity: float, summary: str) -> dict[str, Any]:
        return {
            "key": key,
            "severity": float(np.clip(severity, 0.0, 1.0)),
            "summary": summary,
        }

    def _float_or_none(self, value) -> float | None:
        if value is None:
            return None
        parsed = float(value)
        if np.isnan(parsed):
            return None
        return parsed

    def _safe_value(self, value: float | None, default: float = 0.0) -> float:
        if value is None:
            return default
        if np.isnan(value):
            return default
        return float(value)
