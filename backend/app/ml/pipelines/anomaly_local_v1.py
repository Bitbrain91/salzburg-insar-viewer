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
        cross_track_metrics = self._compute_cross_track_consistency(records)
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

    def _compute_cross_track_consistency(self, records: list[LocalPointRecord]) -> dict[str, float]:
        by_building_before: dict[str, dict[int, list[LocalPointRecord]]] = defaultdict(lambda: defaultdict(list))
        by_building_after: dict[str, dict[int, list[LocalPointRecord]]] = defaultdict(lambda: defaultdict(list))

        for record in records:
            if not record.building_id or record.gate_excluded:
                continue
            by_building_before[record.building_id][record.track].append(record)
            if record.cluster_role != "noise":
                by_building_after[record.building_id][record.track].append(record)

        diffs_before: list[float] = []
        diffs_after: list[float] = []
        buildings_with_both_tracks_kept = 0

        for building_id, tracks_after in by_building_after.items():
            tracks_before = by_building_before.get(building_id, {})
            slope_mean = max(
                [
                    self._safe_value(record.slope_mean_deg)
                    for track_records in tracks_after.values()
                    for record in track_records
                ]
                or [0.0]
            )
            allowed_diff = 1.0 + (0.15 * slope_mean)

            before_44 = tracks_before.get(44, [])
            before_95 = tracks_before.get(95, [])
            after_44 = tracks_after.get(44, [])
            after_95 = tracks_after.get(95, [])
            before_diff = None
            after_diff = None
            consistency = None
            full_support = False

            if before_44 and before_95:
                before_diff = abs(self._median_vertical_proxy(before_44) - self._median_vertical_proxy(before_95))
                diffs_before.append(before_diff)
            if after_44 and after_95:
                after_diff = abs(self._median_vertical_proxy(after_44) - self._median_vertical_proxy(after_95))
                diffs_after.append(after_diff)
                consistency = float(math.exp(-(after_diff / max(allowed_diff, EPSILON))))
                full_support = len(after_44) >= 2 and len(after_95) >= 2
                buildings_with_both_tracks_kept += 1

            summary = {
                "building_id": building_id,
                "allowed_diff_mm_a": allowed_diff,
                "diff_before_mm_a": before_diff,
                "diff_after_mm_a": after_diff,
                "consistency": consistency,
                "full_support": full_support,
            }

            for track_records in tracks_before.values():
                for record in track_records:
                    record.cross_track_summary = summary
                    record.cross_track_consistency = consistency
                    record.flags["cross_track_full_support"] = full_support

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
        building_cluster_counts: dict[str, set[str]] = defaultdict(set)
        building_small_n: set[str] = set()
        for record in records:
            if record.building_id and record.cluster_role == "core" and record.cluster_id:
                building_cluster_counts[record.building_id].add(record.cluster_id)
            if record.building_id and record.small_n_fallback:
                building_small_n.add(record.building_id)

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
            "buildings_with_clusters": sum(1 for clusters in building_cluster_counts.values() if clusters),
            "multi_cluster_buildings": sum(1 for clusters in building_cluster_counts.values() if len(clusters) > 1),
            "small_n_buildings": len(building_small_n),
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
                "detector_scores": record.detector_scores,
                "explain_top_features": record.explain_top_features,
                "cluster": {
                    "cluster_role": record.cluster_role,
                    "cluster_probability": record.cluster_probability,
                    "cluster_outlier_score": record.cluster_outlier_score,
                    "small_n_fallback": record.small_n_fallback,
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
