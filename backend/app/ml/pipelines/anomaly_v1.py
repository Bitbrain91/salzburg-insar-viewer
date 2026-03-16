from __future__ import annotations

import asyncio
import json
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import RobustScaler

from .base import BasePipeline


FEATURE_SET_VERSION = "anomaly_v1_phase1"
MODEL_SET_VERSION = "iforest_rulegate_v1"
FEATURE_COLUMNS = [
    "velocity",
    "abs_velocity",
    "velocity_std",
    "acceleration",
    "abs_acceleration",
    "coherence",
    "season_amp",
    "incidence_angle",
    "amp_mean",
    "amp_std",
    "eff_area",
    "is_ps",
    "ts_slope",
    "ts_residual_std",
    "ts_max_abs_delta",
    "ts_roughness",
    "ts_missing_rate",
    "ts_primary_step_abs",
    "amp_ts_mean",
    "amp_ts_std",
    "amp_ts_cv",
    "amp_ts_spike_rate",
    "building_velocity_robust_z",
    "building_coherence_rank",
    "building_point_count_track",
    "other_track_point_count",
    "height_band_lower",
    "height_band_middle",
    "height_band_upper",
    "cross_track_consistency_score",
]
EPSILON = 1e-9


@dataclass
class PointRecord:
    code: str
    track: int
    velocity: float
    velocity_std: float | None
    coherence: float | None
    acceleration: float | None
    season_amp: float | None
    incidence_angle: float | None
    height: float | None
    amp_mean: float | None
    amp_std: float | None
    eff_area: float | None
    building_id: str | None
    building_height: float | None
    distance_m: float | None
    assignment_method: str | None
    buffer_m: float | None
    within_building: bool
    displacement_dates: list[date] = field(default_factory=list)
    displacement_values: list[float] = field(default_factory=list)
    amplitude_dates: list[date] = field(default_factory=list)
    amplitude_values: list[float] = field(default_factory=list)
    features: dict[str, float] = field(default_factory=dict)
    flags: dict[str, Any] = field(default_factory=dict)
    detector_scores: dict[str, float] = field(default_factory=dict)
    building_context: dict[str, Any] = field(default_factory=dict)
    cross_track_summary: dict[str, Any] = field(default_factory=dict)
    explain_top_features: list[dict[str, Any]] = field(default_factory=list)
    anomaly_score: float = 0.0
    quality_score: float = 0.0
    cross_track_consistency: float | None = None
    label: str = "suspect"
    primary_step_index: int | None = None
    primary_step_sign: int = 0


@dataclass
class TrackModelArtifacts:
    feature_columns: list[str]
    imputer: SimpleImputer | None
    scaler: RobustScaler | None
    model: IsolationForest | None
    q05: float
    q95: float
    detection_threshold: float
    sample_count: int
    skipped: bool = False


class AnomalyV1Pipeline(BasePipeline):
    name = "anomaly_v1"
    version = "0.1.0"
    run_type = "anomaly"

    def default_params(self) -> dict[str, Any]:
        return {
            "source": "gba",
            "max_distance_m": 30.0,
            "buffer_multiplier": 1.0,
            "min_buffer_m": 3.0,
            "default_height_m": 12.0,
            "contamination": 0.05,
            "random_state": 42,
            "quality_normal_threshold": 0.70,
            "quality_outlier_threshold": 0.40,
        }

    async def run(self, pool, config) -> dict[str, Any]:
        if not config.bbox:
            raise ValueError("bbox is required for anomaly_v1 pipeline")

        requested_source = (config.source or config.params.get("source") or "gba").lower()
        if requested_source != "gba":
            raise ValueError("anomaly_v1 currently requires source='gba'")

        params = {**self.default_params(), **(config.params or {})}
        base_rows, ts_rows, amp_rows = await self._fetch_inputs(pool, config, params)

        if not base_rows:
            return {
                "total_points": 0,
                "assigned_points": 0,
                "assigned_buildings": 0,
                "full_cross_track_points": 0,
                "outlier_points": 0,
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
                    p.velocity,
                    p.velocity_std,
                    p.coherence,
                    p.acceleration,
                    p.season_amp,
                    p.incidence_angle,
                    p.height,
                    p.amp_mean,
                    p.amp_std,
                    p.eff_area,
                    p.geom
                FROM insar_points p, envelope
                WHERE ST_Intersects(p.geom, envelope.geom)
                  AND ($5::integer IS NULL OR p.track = $5)
            ),
            buildings AS (
                SELECT b.gba_id::text AS building_id, b.height AS building_height, b.geom
                FROM gba_buildings b, envelope
                WHERE b.geom && envelope.geom
            )
            SELECT
                p.code,
                p.track,
                p.velocity,
                p.velocity_std,
                p.coherence,
                p.acceleration,
                p.season_amp,
                p.incidence_angle,
                p.height,
                p.amp_mean,
                p.amp_std,
                p.eff_area,
                cand.building_id,
                cand.building_height,
                cand.distance_m,
                cand.method,
                cand.buffer_m,
                cand.within_building
            FROM pts p
            LEFT JOIN LATERAL (
                SELECT building_id, building_height, distance_m, method, buffer_m, within_building
                FROM (
                    SELECT
                        b.building_id,
                        b.building_height,
                        0::double precision AS distance_m,
                        'within'::text AS method,
                        NULL::double precision AS buffer_m,
                        true AS within_building,
                        0 AS priority
                    FROM buildings b
                    WHERE ST_Covers(b.geom, p.geom)

                    UNION ALL

                    SELECT
                        b.building_id,
                        b.building_height,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        'adaptive_buffer'::text AS method,
                        GREATEST(
                            $7::double precision,
                            COALESCE(b.building_height, $8::double precision)
                            * tan(radians(COALESCE(p.incidence_angle, 38.5))) * $6::double precision
                        ) AS buffer_m,
                        false AS within_building,
                        1 AS priority
                    FROM buildings b
                    WHERE ST_DWithin(
                        p.geom::geography,
                        b.geom::geography,
                        GREATEST(
                            $7::double precision,
                            COALESCE(b.building_height, $8::double precision)
                            * tan(radians(COALESCE(p.incidence_angle, 38.5))) * $6::double precision
                        )
                    )

                    UNION ALL

                    SELECT
                        b.building_id,
                        b.building_height,
                        ST_Distance(p.geom::geography, b.geom::geography) AS distance_m,
                        'nearest'::text AS method,
                        NULL::double precision AS buffer_m,
                        false AS within_building,
                        2 AS priority
                    FROM buildings b
                    WHERE ST_DWithin(p.geom::geography, b.geom::geography, $9::double precision)
                ) candidates
                ORDER BY priority, distance_m
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
                float(params["default_height_m"]),
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
        if not records:
            return [], {
                "total_points": 0,
                "assigned_points": 0,
                "assigned_buildings": 0,
                "full_cross_track_points": 0,
                "outlier_points": 0,
            }

        self._compute_series_features(records)
        self._compute_building_context(records)
        track_stats = self._compute_track_stats(records)
        artifacts = self._fit_models(records, track_stats, params)
        self._score_records(records, track_stats, artifacts, params)
        metrics = self._evaluate_run(records, artifacts, track_stats, params)
        return records, metrics

    def _build_records(self, base_rows, ts_rows, amp_rows) -> list[PointRecord]:
        records: dict[tuple[str, int], PointRecord] = {}
        for row in base_rows:
            key = (row["code"], row["track"])
            records[key] = PointRecord(
                code=row["code"],
                track=row["track"],
                velocity=float(row["velocity"] or 0.0),
                velocity_std=self._float_or_none(row["velocity_std"]),
                coherence=self._float_or_none(row["coherence"]),
                acceleration=self._float_or_none(row["acceleration"]),
                season_amp=self._float_or_none(row["season_amp"]),
                incidence_angle=self._float_or_none(row["incidence_angle"]),
                height=self._float_or_none(row["height"]),
                amp_mean=self._float_or_none(row["amp_mean"]),
                amp_std=self._float_or_none(row["amp_std"]),
                eff_area=self._float_or_none(row["eff_area"]),
                building_id=row["building_id"],
                building_height=self._float_or_none(row["building_height"]),
                distance_m=self._float_or_none(row["distance_m"]),
                assignment_method=row["method"],
                buffer_m=self._float_or_none(row["buffer_m"]),
                within_building=bool(row["within_building"]),
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

    def _compute_series_features(self, records: list[PointRecord]) -> None:
        track_dates: dict[int, set[date]] = defaultdict(set)
        for record in records:
            track_dates[record.track].update(record.displacement_dates)

        for record in records:
            disp = np.asarray(record.displacement_values, dtype=float)
            disp_dates = record.displacement_dates
            total_dates = max(len(track_dates.get(record.track, ())), 1)
            record.features["velocity"] = record.velocity
            record.features["abs_velocity"] = abs(record.velocity)
            record.features["velocity_std"] = self._safe_value(record.velocity_std)
            record.features["acceleration"] = self._safe_value(record.acceleration)
            record.features["abs_acceleration"] = abs(self._safe_value(record.acceleration))
            record.features["coherence"] = self._safe_value(record.coherence)
            record.features["season_amp"] = self._safe_value(record.season_amp)
            record.features["incidence_angle"] = self._safe_value(record.incidence_angle, 38.5)
            record.features["amp_mean"] = self._safe_value(record.amp_mean)
            record.features["amp_std"] = self._safe_value(record.amp_std)
            record.features["eff_area"] = self._safe_value(record.eff_area)
            record.features["is_ps"] = 1.0 if self._safe_value(record.eff_area) <= EPSILON else 0.0
            record.flags["assigned_to_building"] = record.building_id is not None
            record.flags["assignment_method"] = record.assignment_method or "unassigned"
            record.flags["within_building"] = record.within_building

            if len(disp) >= 2 and len(disp_dates) >= 2:
                x = np.asarray(
                    [(value - disp_dates[0]).days for value in disp_dates],
                    dtype=float,
                )
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
                record.features["ts_primary_step_sign"] = float(step_sign)
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
                record.features["ts_primary_step_sign"] = 0.0
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

    def _compute_building_context(self, records: list[PointRecord]) -> None:
        building_track_groups: dict[tuple[str, int], list[PointRecord]] = defaultdict(list)
        building_groups: dict[str, list[PointRecord]] = defaultdict(list)
        for record in records:
            if record.building_id:
                building_track_groups[(record.building_id, record.track)].append(record)
                building_groups[record.building_id].append(record)

        cross_track_cache = self._build_cross_track_cache(building_groups)
        step_thresholds = self._compute_step_thresholds(records)

        for record in records:
            if not record.building_id:
                record.features["building_velocity_robust_z"] = 0.0
                record.features["building_coherence_rank"] = 0.0
                record.features["building_point_count_track"] = 0.0
                record.features["other_track_point_count"] = 0.0
                record.features["height_band_lower"] = 0.0
                record.features["height_band_middle"] = 0.0
                record.features["height_band_upper"] = 0.0
                record.features["cross_track_consistency_score"] = 0.0
                record.flags["height_band"] = "unknown"
                record.flags["cross_track_full_support"] = False
                record.flags["degraded_reason"] = "unassigned_building"
                record.building_context = {
                    "track_point_count": 0,
                    "other_track_point_count": 0,
                    "height_band": "unknown",
                }
                record.cross_track_summary = {
                    "building_id": None,
                    "full_support": False,
                }
                continue

            group = building_track_groups[(record.building_id, record.track)]
            other_track = 95 if record.track == 44 else 44
            other_group = building_track_groups.get((record.building_id, other_track), [])
            velocities = np.asarray([item.velocity for item in group], dtype=float)
            coherences = np.asarray([self._safe_value(item.coherence) for item in group], dtype=float)
            heights = np.asarray(
                [self._safe_value(item.height, np.nan) for item in group],
                dtype=float,
            )
            building_median = float(np.median(velocities)) if velocities.size else 0.0
            building_mad = float(np.median(np.abs(velocities - building_median))) if velocities.size else 0.0
            robust_z = 0.0
            if building_mad > EPSILON:
                robust_z = float((record.velocity - building_median) / (1.4826 * building_mad))

            coh_rank = 0.0
            if coherences.size:
                coh_rank = float(np.mean(coherences <= self._safe_value(record.coherence)))

            height_band = "unknown"
            if heights.size >= 3 and np.isfinite(heights).sum() >= 3 and record.height is not None:
                valid_heights = heights[np.isfinite(heights)]
                q1, q2 = np.quantile(valid_heights, [0.33, 0.66])
                if record.height <= q1:
                    height_band = "lower"
                elif record.height <= q2:
                    height_band = "middle"
                else:
                    height_band = "upper"

            cross_summary = cross_track_cache.get(record.building_id, {
                "full_support": False,
                "paired_building": True,
                "vertical_proxy_diff": None,
                "median_vertical_44": None,
                "median_vertical_95": None,
                "consistency": None,
            })
            cross_consistency = cross_summary.get("consistency")
            step_support = self._compute_step_support(
                record,
                group,
                step_thresholds.get(record.track, 1.0),
            )

            record.features["building_velocity_robust_z"] = robust_z
            record.features["building_coherence_rank"] = coh_rank
            record.features["building_point_count_track"] = float(len(group))
            record.features["other_track_point_count"] = float(len(other_group))
            record.features["cross_track_consistency_score"] = (
                float(cross_consistency) if cross_consistency is not None else 0.0
            )
            record.features["height_band_lower"] = 1.0 if height_band == "lower" else 0.0
            record.features["height_band_middle"] = 1.0 if height_band == "middle" else 0.0
            record.features["height_band_upper"] = 1.0 if height_band == "upper" else 0.0
            record.features["step_support"] = step_support
            record.flags["height_band"] = height_band
            record.flags["cross_track_full_support"] = bool(cross_summary.get("full_support"))
            record.flags["building_track_point_count"] = len(group)
            record.flags["other_track_point_count"] = len(other_group)
            record.flags["step_support"] = step_support
            if len(group) < 3:
                record.flags["degraded_reason"] = "low_building_support"
            elif len(other_group) < 5:
                record.flags["degraded_reason"] = "low_cross_track_support"
            else:
                record.flags["degraded_reason"] = None

            record.building_context = {
                "building_id": record.building_id,
                "assignment_method": record.assignment_method or "unassigned",
                "track_point_count": len(group),
                "other_track_point_count": len(other_group),
                "distance_m": record.distance_m,
                "buffer_m": record.buffer_m,
                "height_band": height_band,
                "building_velocity_median": building_median,
                "building_velocity_mad": building_mad,
                "building_velocity_robust_z": robust_z,
                "step_support": step_support,
            }
            record.cross_track_summary = {
                **cross_summary,
                "other_track": other_track,
                "other_track_point_count": len(other_group),
            }
            record.cross_track_consistency = float(cross_consistency) if cross_consistency is not None else None

    def _build_cross_track_cache(self, building_groups: dict[str, list[PointRecord]]) -> dict[str, dict[str, Any]]:
        cache: dict[str, dict[str, Any]] = {}
        for building_id, items in building_groups.items():
            by_track: dict[int, list[PointRecord]] = defaultdict(list)
            for item in items:
                by_track[item.track].append(item)

            group_44 = by_track.get(44, [])
            group_95 = by_track.get(95, [])
            if not group_44 or not group_95:
                cache[building_id] = {
                    "building_id": building_id,
                    "full_support": False,
                    "paired_building": False,
                    "vertical_proxy_diff": None,
                    "median_vertical_44": None,
                    "median_vertical_95": None,
                    "consistency": None,
                }
                continue

            vertical_44 = np.asarray([self._vertical_proxy(item) for item in group_44], dtype=float)
            vertical_95 = np.asarray([self._vertical_proxy(item) for item in group_95], dtype=float)
            median_44 = float(np.median(vertical_44))
            median_95 = float(np.median(vertical_95))
            mad_44 = float(np.median(np.abs(vertical_44 - median_44))) if vertical_44.size else 0.0
            mad_95 = float(np.median(np.abs(vertical_95 - median_95))) if vertical_95.size else 0.0
            diff = abs(median_44 - median_95)
            scale = max(mad_44 + mad_95, 1.0)
            consistency = float(math.exp(-(diff / scale)))
            full_support = len(group_44) >= 5 and len(group_95) >= 5

            cache[building_id] = {
                "building_id": building_id,
                "full_support": full_support,
                "paired_building": True,
                "vertical_proxy_diff": diff,
                "median_vertical_44": median_44,
                "median_vertical_95": median_95,
                "consistency": consistency,
            }
        return cache

    def _compute_step_thresholds(self, records: list[PointRecord]) -> dict[int, float]:
        by_track: dict[int, list[float]] = defaultdict(list)
        for record in records:
            by_track[record.track].append(record.features["ts_primary_step_abs"])
        thresholds: dict[int, float] = {}
        for track, values in by_track.items():
            arr = np.asarray(values, dtype=float)
            thresholds[track] = float(max(np.nanpercentile(arr, 90), 1.0)) if arr.size else 1.0
        return thresholds

    def _compute_step_support(self, record: PointRecord, group: list[PointRecord], threshold: float) -> float:
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

    def _compute_track_stats(self, records: list[PointRecord]) -> dict[int, dict[str, float]]:
        stats: dict[int, dict[str, float]] = {}
        for track in {record.track for record in records}:
            track_records = [record for record in records if record.track == track]
            velocity_std = np.asarray([record.features["velocity_std"] for record in track_records], dtype=float)
            amp_cv = np.asarray([record.features["amp_ts_cv"] for record in track_records], dtype=float)
            step_abs = np.asarray([record.features["ts_primary_step_abs"] for record in track_records], dtype=float)
            vproxy = np.asarray([self._vertical_proxy(record) for record in track_records], dtype=float)
            stats[track] = {
                "velocity_std_p95": float(np.nanpercentile(velocity_std, 95)) if velocity_std.size else 0.0,
                "amp_cv_p95": float(np.nanpercentile(amp_cv, 95)) if amp_cv.size else 0.0,
                "step_p95": float(np.nanpercentile(step_abs, 95)) if step_abs.size else 1.0,
                "step_p99": float(np.nanpercentile(step_abs, 99)) if step_abs.size else 2.0,
                "vertical_proxy_p50": float(np.nanpercentile(vproxy, 50)) if vproxy.size else 0.0,
                "vertical_proxy_mad": float(np.nanmedian(np.abs(vproxy - np.nanmedian(vproxy)))) if vproxy.size else 1.0,
            }
        return stats

    def _fit_models(
        self,
        records: list[PointRecord],
        track_stats: dict[int, dict[str, float]],
        params: dict[str, Any],
    ) -> dict[int, TrackModelArtifacts]:
        artifacts: dict[int, TrackModelArtifacts] = {}
        for track in {record.track for record in records}:
            track_records = [record for record in records if record.track == track]
            if len(track_records) < 20:
                artifacts[track] = TrackModelArtifacts(
                    feature_columns=FEATURE_COLUMNS,
                    imputer=None,
                    scaler=None,
                    model=None,
                    q05=0.0,
                    q95=1.0,
                    detection_threshold=0.75,
                    sample_count=len(track_records),
                    skipped=True,
                )
                continue

            matrix = np.asarray(
                [
                    [record.features.get(column, 0.0) for column in FEATURE_COLUMNS]
                    for record in track_records
                ],
                dtype=float,
            )
            imputer = SimpleImputer(strategy="median")
            scaler = RobustScaler(quantile_range=(10, 90))
            transformed = scaler.fit_transform(imputer.fit_transform(matrix))
            model = IsolationForest(
                contamination=float(params["contamination"]),
                random_state=int(params["random_state"]),
                n_estimators=200,
                n_jobs=-1,
            )
            model.fit(transformed)
            raw_scores = -model.decision_function(transformed)
            q05 = float(np.quantile(raw_scores, 0.05))
            q95 = float(np.quantile(raw_scores, 0.95))
            if q95 <= q05 + EPSILON:
                q05 = float(np.min(raw_scores))
                q95 = float(np.max(raw_scores) + 1.0)
            artifacts[track] = TrackModelArtifacts(
                feature_columns=FEATURE_COLUMNS,
                imputer=imputer,
                scaler=scaler,
                model=model,
                q05=q05,
                q95=q95,
                detection_threshold=float(np.quantile(raw_scores, 0.95)),
                sample_count=len(track_records),
            )
        return artifacts

    def _score_records(
        self,
        records: list[PointRecord],
        track_stats: dict[int, dict[str, float]],
        artifacts: dict[int, TrackModelArtifacts],
        params: dict[str, Any],
    ) -> None:
        by_track: dict[int, list[PointRecord]] = defaultdict(list)
        for record in records:
            by_track[record.track].append(record)

        for track, track_records in by_track.items():
            artifact = artifacts[track]
            if_scores = self._score_isolation_forest(track_records, artifact)
            for record, if_score in zip(track_records, if_scores, strict=True):
                rule_score, explain_items = self._score_rule_gate(record, track_stats[track])
                anomaly_score = float(np.clip((0.7 * if_score) + (0.3 * rule_score), 0.0, 1.0))
                quality_score = self._derive_quality(record, anomaly_score, track_stats[track])
                record.detector_scores = {
                    "isolation_forest": float(if_score),
                    "rule_gate": float(rule_score),
                }
                record.anomaly_score = anomaly_score
                record.quality_score = quality_score
                record.cross_track_consistency = record.cross_track_consistency
                record.label = self._label_for_quality(
                    quality_score,
                    float(params["quality_normal_threshold"]),
                    float(params["quality_outlier_threshold"]),
                )
                record.features["anomaly_score"] = anomaly_score
                record.features["quality_score"] = quality_score
                record.explain_top_features = self._build_explain(record, if_score, explain_items)

    def _score_isolation_forest(
        self,
        track_records: list[PointRecord],
        artifact: TrackModelArtifacts,
    ) -> np.ndarray:
        if artifact.skipped or not artifact.model or not artifact.imputer or not artifact.scaler:
            return np.full(len(track_records), 0.5, dtype=float)

        matrix = np.asarray(
            [
                [record.features.get(column, 0.0) for column in artifact.feature_columns]
                for record in track_records
            ],
            dtype=float,
        )
        transformed = artifact.scaler.transform(artifact.imputer.transform(matrix))
        raw_scores = -artifact.model.decision_function(transformed)
        return np.clip((raw_scores - artifact.q05) / max(artifact.q95 - artifact.q05, EPSILON), 0.0, 1.0)

    def _score_rule_gate(self, record: PointRecord, track_stats: dict[str, float]):
        reasons: list[dict[str, Any]] = []
        total = 0.0

        coherence = self._safe_value(record.coherence)
        if coherence < 0.3:
            total += 1.0 * 0.26
            reasons.append(self._reason("low_coherence", 1.0, "Very low coherence"))
        elif coherence < 0.5:
            total += 0.75 * 0.26
            reasons.append(self._reason("low_coherence", 0.75, "Low coherence"))
        elif coherence < 0.7:
            total += 0.35 * 0.26
            reasons.append(self._reason("low_coherence", 0.35, "Moderate coherence"))

        v_std = record.features["velocity_std"]
        v_std_p95 = track_stats["velocity_std_p95"]
        if v_std_p95 > EPSILON and v_std > v_std_p95:
            severity = min(1.0, (v_std - v_std_p95) / max(v_std_p95, 0.25))
            total += severity * 0.14
            reasons.append(self._reason("high_velocity_std", severity, "Velocity uncertainty is high"))

        amp_cv = record.features["amp_ts_cv"]
        amp_cv_p95 = track_stats["amp_cv_p95"]
        if amp_cv_p95 > EPSILON and amp_cv > amp_cv_p95:
            severity = min(1.0, (amp_cv - amp_cv_p95) / max(amp_cv_p95, 0.25))
            total += severity * 0.10
            reasons.append(self._reason("unstable_amplitude", severity, "Amplitude is unstable"))

        step_abs = record.features["ts_primary_step_abs"]
        step_support = float(record.features.get("step_support", 1.0))
        step_p95 = track_stats["step_p95"]
        step_p99 = track_stats["step_p99"]
        if step_abs > step_p95 and step_support < 0.25:
            severity = 0.65 if step_abs <= step_p99 else 1.0
            severity *= (1.0 - step_support)
            total += severity * 0.24
            reasons.append(
                self._reason(
                    "single_point_step",
                    severity,
                    "Large step without local support",
                )
            )
        elif step_abs > step_p95 and step_support >= 0.25:
            reasons.append(
                self._reason(
                    "supported_step",
                    0.2,
                    "Large step is supported by nearby building points",
                )
            )

        cross = record.cross_track_consistency
        if record.flags.get("cross_track_full_support") and cross is not None and cross < 0.6:
            severity = min(1.0, (0.6 - cross) / 0.6)
            total += severity * 0.16
            reasons.append(self._reason("cross_track_mismatch", severity, "ASC/DSC are inconsistent"))

        building_count = int(record.features["building_point_count_track"])
        other_count = int(record.features["other_track_point_count"])
        if not record.flags.get("assigned_to_building"):
            total += 1.0 * 0.10
            reasons.append(self._reason("unassigned_building", 1.0, "Point has no reliable GBA building"))
        elif building_count < 3:
            total += 0.7 * 0.10
            reasons.append(self._reason("weak_building_support", 0.7, "Too few same-track building points"))
        elif other_count < 5:
            total += 0.35 * 0.10
            reasons.append(self._reason("weak_cross_track_support", 0.35, "Opposite track has limited support"))

        return float(np.clip(total, 0.0, 1.0)), reasons

    def _derive_quality(self, record: PointRecord, anomaly_score: float, track_stats: dict[str, float]) -> float:
        coherence = self._safe_value(record.coherence, 0.45)
        amp_cv = record.features["amp_ts_cv"]
        amp_cv_p95 = max(track_stats["amp_cv_p95"], 0.2)
        amp_quality = 1.0 - np.clip(amp_cv / (amp_cv_p95 * 1.5), 0.0, 1.0)
        signal_quality = np.clip((0.65 * coherence) + (0.35 * amp_quality), 0.0, 1.0)

        support = 1.0
        if not record.flags.get("assigned_to_building"):
            support *= 0.55
        elif int(record.features["building_point_count_track"]) < 3:
            support *= 0.72

        if int(record.features["other_track_point_count"]) < 5:
            support *= 0.92
        if record.cross_track_consistency is not None and record.flags.get("cross_track_full_support"):
            support *= 0.75 + (0.25 * record.cross_track_consistency)

        if record.features.get("step_support", 1.0) < 0.25 and record.features["ts_primary_step_abs"] > track_stats["step_p95"]:
            support *= 0.80

        quality = (1.0 - anomaly_score) * (0.55 + (0.45 * signal_quality)) * support
        return float(np.clip(quality, 0.0, 1.0))

    def _build_explain(self, record: PointRecord, if_score: float, reasons: list[dict[str, Any]]):
        explain = list(reasons)
        z_severity = min(1.0, abs(record.features["building_velocity_robust_z"]) / 3.0)
        if z_severity >= 0.35:
            explain.append(
                self._reason(
                    "building_velocity_outlier",
                    z_severity,
                    "Velocity deviates from the building baseline",
                )
            )

        if if_score >= 0.7:
            explain.append(
                self._reason(
                    "multivariate_outlier",
                    if_score,
                    "Track-level multivariate anomaly score is elevated",
                )
            )

        explain.sort(key=lambda item: item["severity"], reverse=True)
        return explain[:3]

    def _evaluate_run(
        self,
        records: list[PointRecord],
        artifacts: dict[int, TrackModelArtifacts],
        track_stats: dict[int, dict[str, float]],
        params: dict[str, Any],
    ) -> dict[str, Any]:
        assigned_points = sum(1 for record in records if record.building_id)
        assigned_buildings = len({record.building_id for record in records if record.building_id})
        full_cross_track_points = sum(1 for record in records if record.flags.get("cross_track_full_support"))
        outlier_points = sum(1 for record in records if record.label == "outlier")
        normal_points = sum(1 for record in records if record.label == "normal")
        suspect_points = sum(1 for record in records if record.label == "suspect")

        paired_all = [
            summary["vertical_proxy_diff"]
            for summary in {
                record.building_id: record.cross_track_summary
                for record in records
                if record.building_id
                and record.flags.get("cross_track_full_support")
                and record.cross_track_summary.get("vertical_proxy_diff") is not None
            }.values()
        ]
        paired_high_quality = [
            summary["vertical_proxy_diff"]
            for summary in {
                record.building_id: record.cross_track_summary
                for record in records
                if record.building_id
                and record.flags.get("cross_track_full_support")
                and record.cross_track_summary.get("vertical_proxy_diff") is not None
                and record.quality_score >= float(params["quality_normal_threshold"])
            }.values()
        ]
        median_all = float(np.median(paired_all)) if paired_all else 0.0
        median_high_quality = float(np.median(paired_high_quality)) if paired_high_quality else median_all

        metrics = {
            "total_points": len(records),
            "assigned_points": assigned_points,
            "assigned_buildings": assigned_buildings,
            "full_cross_track_points": full_cross_track_points,
            "normal_points": normal_points,
            "suspect_points": suspect_points,
            "outlier_points": outlier_points,
            "median_cross_track_diff_all": median_all,
            "median_cross_track_diff_high_quality": median_high_quality,
            "cross_track_improvement": median_all - median_high_quality,
        }
        metrics.update(self._evaluate_injections(records, artifacts, track_stats))
        return metrics

    def _evaluate_injections(
        self,
        records: list[PointRecord],
        artifacts: dict[int, TrackModelArtifacts],
        track_stats: dict[int, dict[str, float]],
    ) -> dict[str, float]:
        rng = np.random.default_rng(42)
        metrics: dict[str, float] = {}
        for track in {record.track for record in records}:
            artifact = artifacts[track]
            if artifact.skipped or not artifact.model:
                continue

            candidates = [
                record
                for record in records
                if record.track == track
                and record.flags.get("timeseries_available")
                and len(record.displacement_values) >= 12
                and self._safe_value(record.coherence) >= 0.75
                and abs(record.velocity) <= 2.0
            ]
            if not candidates:
                continue

            sample = candidates[: min(len(candidates), 24)]
            recalls: dict[str, list[float]] = defaultdict(list)
            lifts: dict[str, list[float]] = defaultdict(list)
            for record in sample:
                base_score = record.anomaly_score
                injections = self._generate_injected_feature_rows(record, track_stats[track], rng)
                for name, features in injections.items():
                    anomaly_score = self._score_synthetic_row(features, record, artifact, track_stats[track])
                    recalls[name].append(1.0 if anomaly_score > 0.75 else 0.0)
                    lifts[name].append(anomaly_score - base_score)

            for name, values in recalls.items():
                metrics[f"injection_{name}_recall_t{track}"] = float(np.mean(values)) if values else 0.0
            for name, values in lifts.items():
                metrics[f"injection_{name}_lift_t{track}"] = float(np.mean(values)) if values else 0.0
        return metrics

    def _generate_injected_feature_rows(
        self,
        record: PointRecord,
        track_stats: dict[str, float],
        rng: np.random.Generator,
    ) -> dict[str, dict[str, float]]:
        base_disp = np.asarray(record.displacement_values, dtype=float)
        if base_disp.size < 4:
            return {}
        mid = base_disp.size // 2
        step_series = base_disp.copy()
        step_series[mid:] += 6.0 * (1 if rng.random() > 0.5 else -1)

        noise_series = base_disp.copy()
        noise_sigma = max(record.features["ts_residual_std"] * 3.0, 2.5)
        noise_series += rng.normal(0.0, noise_sigma, size=base_disp.size)

        trend_series = base_disp.copy()
        trend_series[mid:] += np.linspace(0.0, 8.0, base_disp.size - mid)

        return {
            "step": self._synthetic_feature_row(record, step_series),
            "noise": self._synthetic_feature_row(record, noise_series),
            "trend_break": self._synthetic_feature_row(record, trend_series),
        }

    def _synthetic_feature_row(self, record: PointRecord, values: np.ndarray) -> dict[str, float]:
        features = dict(record.features)
        disp_dates = record.displacement_dates
        x = np.asarray([(value - disp_dates[0]).days for value in disp_dates], dtype=float)
        if np.allclose(x, x[0]):
            x = np.arange(values.size, dtype=float)
        coeffs = np.polyfit(x, values, deg=1)
        trend = coeffs[0] * x + coeffs[1]
        residuals = values - trend
        diffs = np.diff(values)
        step_index = int(np.argmax(np.abs(diffs))) if diffs.size else 0
        step_abs = float(np.max(np.abs(diffs))) if diffs.size else 0.0
        features["ts_slope"] = float(coeffs[0] * 365.25)
        features["ts_residual_std"] = float(np.std(residuals))
        features["ts_max_abs_delta"] = step_abs
        features["ts_roughness"] = float(np.mean(np.abs(diffs))) if diffs.size else 0.0
        features["ts_primary_step_abs"] = step_abs
        features["ts_primary_step_sign"] = float(np.sign(diffs[step_index])) if diffs.size else 0.0
        features["step_support"] = 0.0
        return features

    def _score_synthetic_row(
        self,
        features: dict[str, float],
        record: PointRecord,
        artifact: TrackModelArtifacts,
        track_stats: dict[str, float],
    ) -> float:
        row = np.asarray([[features.get(column, 0.0) for column in artifact.feature_columns]], dtype=float)
        transformed = artifact.scaler.transform(artifact.imputer.transform(row))
        if_score = float(
            np.clip(
                ((-artifact.model.decision_function(transformed))[0] - artifact.q05)
                / max(artifact.q95 - artifact.q05, EPSILON),
                0.0,
                1.0,
            )
        )
        synthetic = PointRecord(
            code=record.code,
            track=record.track,
            velocity=record.velocity,
            velocity_std=record.velocity_std,
            coherence=record.coherence,
            acceleration=record.acceleration,
            season_amp=record.season_amp,
            incidence_angle=record.incidence_angle,
            height=record.height,
            amp_mean=record.amp_mean,
            amp_std=record.amp_std,
            eff_area=record.eff_area,
            building_id=record.building_id,
            building_height=record.building_height,
            distance_m=record.distance_m,
            assignment_method=record.assignment_method,
            buffer_m=record.buffer_m,
            within_building=record.within_building,
            features=features,
            flags=dict(record.flags),
            cross_track_consistency=record.cross_track_consistency,
        )
        rule_score, _ = self._score_rule_gate(synthetic, track_stats)
        return float(np.clip((0.7 * if_score) + (0.3 * rule_score), 0.0, 1.0))

    async def _persist_results(self, pool, run_id: str, records: list[PointRecord]) -> None:
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
                "method": "anomaly_v1",
                "detector_scores": record.detector_scores,
                "explain_top_features": record.explain_top_features,
                "feature_flags": record.flags,
                "building_context": record.building_context,
                "cross_track_summary": record.cross_track_summary,
            }
            payloads.append(
                (
                    run_id,
                    record.code,
                    record.track,
                    record.label,
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

    def _vertical_proxy(self, record: PointRecord) -> float:
        incidence = math.radians(self._safe_value(record.incidence_angle, 38.5))
        return record.velocity / max(math.cos(incidence), 0.30)

    def _safe_value(self, value: float | None, default: float = 0.0) -> float:
        if value is None:
            return default
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return default
        return float(value)

    def _float_or_none(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        if math.isnan(number) or math.isinf(number):
            return None
        return number
