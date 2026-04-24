import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createMlRun,
  deleteMlRun,
  getMlRunDetail,
  listMlRuns,
  recolorMlRun,
} from "../hooks/useApi";
import { useAppStore } from "../lib/store";

const localAnomalyViews = [
  "cluster",
  "quality",
  "anomaly",
  "cross-track",
  "reliability",
] as const;
const PIPELINE_NAME = "anomaly_local_v1";

export default function PipelinePanel() {
  const mapBBox = useAppStore((state) => state.mapBBox);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const setActiveRunId = useAppStore((state) => state.setActiveRunId);
  const showMlLayer = useAppStore((state) => state.showMlLayer);
  const setShowMlLayer = useAppStore((state) => state.setShowMlLayer);
  const showMlBuildings = useAppStore((state) => state.showMlBuildings);
  const setShowMlBuildings = useAppStore((state) => state.setShowMlBuildings);
  const mlView = useAppStore((state) => state.mlView);
  const setMlView = useAppStore((state) => state.setMlView);
  const bumpMlTileVersion = useAppStore((state) => state.bumpMlTileVersion);

  const pipeline = PIPELINE_NAME;
  const [track, setTrack] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState(30);
  const [bufferMultiplier, setBufferMultiplier] = useState(1.0);
  const [minBuffer, setMinBuffer] = useState(3.0);
  const [defaultHeight, setDefaultHeight] = useState(12.0);

  const runsQuery = useQuery({
    queryKey: ["ml-runs"],
    queryFn: () => listMlRuns(),
    refetchInterval: 5000,
  });
  const activeRunQuery = useQuery({
    queryKey: ["ml-run-detail", activeRunId],
    queryFn: () => getMlRunDetail(activeRunId as string),
    enabled: Boolean(activeRunId),
    refetchInterval: 5000,
  });

  const assignedBuildings = activeRunQuery.data?.metrics?.assigned_buildings;
  const hasAssignedBuildings =
    assignedBuildings === undefined ? true : Number(assignedBuildings) > 0;
  const activeRunPipeline = activeRunQuery.data?.pipeline;
  const isActiveRunLocalAnomaly = activeRunPipeline === PIPELINE_NAME;

  const bboxLabel = useMemo(() => {
    if (!mapBBox) return "Map extent not ready";
    return mapBBox.map((v) => v.toFixed(4)).join(", ");
  }, [mapBBox]);
  const visibleRuns = useMemo(
    () => (runsQuery.data ?? []).filter((run: any) => run.pipeline === PIPELINE_NAME),
    [runsQuery.data]
  );

  useEffect(() => {
    if (activeRunId) {
      return;
    }
    if (!localAnomalyViews.includes(mlView as (typeof localAnomalyViews)[number])) {
      setMlView("cluster");
    }
  }, [activeRunId, mlView, setMlView]);

  useEffect(() => {
    if (!activeRunId || activeRunPipeline === undefined) {
      return;
    }
    if (isActiveRunLocalAnomaly) {
      if (!localAnomalyViews.includes(mlView as (typeof localAnomalyViews)[number])) {
        setMlView("cluster");
      }
    } else {
      setMlView("cluster");
    }
  }, [activeRunId, activeRunPipeline, isActiveRunLocalAnomaly, mlView, setMlView]);

  async function handleRun() {
    if (!mapBBox) return;
    const params: Record<string, number> = {
      max_distance_m: maxDistance,
      buffer_multiplier: bufferMultiplier,
      min_buffer_m: minBuffer,
      default_height_m: defaultHeight,
    };
    const payload = {
      pipeline,
      source: "gba",
      track: track === "all" ? null : Number(track),
      bbox: mapBBox,
      params,
    };
    const result = await createMlRun(payload);
    if (result?.run_id) {
      setActiveRunId(result.run_id);
      setMlView("cluster");
    }
  }

  async function handleDelete(runId: string) {
    await deleteMlRun(runId, true);
    if (activeRunId === runId) {
      setActiveRunId(null);
    }
    runsQuery.refetch();
  }

  async function handleRefresh() {
    if (activeRunId && showMlBuildings) {
      try {
        await recolorMlRun(activeRunId);
      } catch (err) {
        console.warn("Failed to recompute building colors", err);
      }
    }
    bumpMlTileVersion();
    activeRunQuery.refetch();
  }

  return (
    <div>
      <div className="section-title">ML Pipelines</div>
      <div className="metric">
        <span className="label">Map bbox</span>
        <span className="value">{bboxLabel}</span>
      </div>
      {activeRunQuery.data && (
        <>
          <div className="metric">
            <span className="label">Assigned buildings</span>
            <span className="value">
              {activeRunQuery.data.metrics?.assigned_buildings ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Assigned points</span>
            <span className="value">
              {activeRunQuery.data.metrics?.assigned_points ?? 0}
            </span>
          </div>
        </>
      )}

      <div className="form-row">
        <label className="label">Pipeline</label>
        <input className="input" value="Anomaly Local v1" readOnly />
      </div>

      <div className="pill">Building source is fixed to GBA for `{pipeline}`.</div>

      <div className="form-row">
        <label className="label">Track</label>
        <select className="select" value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="all">All</option>
          <option value="44">44 (Ascending)</option>
          <option value="95">95 (Descending)</option>
        </select>
      </div>

      <div className="form-row">
        <label className="label">Max distance (m)</label>
        <input
          className="input"
          type="number"
          value={maxDistance}
          onChange={(e) => setMaxDistance(Number(e.target.value))}
        />
      </div>
      <div className="form-row">
        <label className="label">Buffer multiplier</label>
        <input
          className="input"
          type="number"
          step="0.1"
          value={bufferMultiplier}
          onChange={(e) => setBufferMultiplier(Number(e.target.value))}
        />
      </div>
      <div className="form-row">
        <label className="label">Min buffer (m)</label>
        <input
          className="input"
          type="number"
          step="0.5"
          value={minBuffer}
          onChange={(e) => setMinBuffer(Number(e.target.value))}
        />
      </div>
      <div className="form-row">
        <label className="label">Default height (m)</label>
        <input
          className="input"
          type="number"
          step="0.5"
          value={defaultHeight}
          onChange={(e) => setDefaultHeight(Number(e.target.value))}
        />
      </div>

      <button className="button" onClick={handleRun} disabled={!mapBBox}>
        Run pipeline
      </button>

      <div className="toggle-row">
        <span>Show ML layer</span>
        <input
          type="checkbox"
          className="toggle"
          checked={showMlLayer}
          onChange={(e) => setShowMlLayer(e.target.checked)}
        />
      </div>
      <div className="toggle-row">
        <span>Show assigned buildings</span>
        <input
          type="checkbox"
          className="toggle"
          checked={showMlBuildings}
          onChange={(e) => setShowMlBuildings(e.target.checked)}
          disabled={!hasAssignedBuildings}
        />
      </div>
      {activeRunId && assignedBuildings === 0 && (
        <div className="pill warning">
          No assigned buildings for this run. Ensure GBA data is loaded in PostGIS and
          that the current AOI intersects supported building footprints.
        </div>
      )}
      {isActiveRunLocalAnomaly && (
        <>
          <div className="metric">
            <span className="label">Normal / suspect / outlier</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.normal_points ?? 0}/
              {activeRunQuery.data?.metrics?.suspect_points ?? 0}/
              {activeRunQuery.data?.metrics?.outlier_points ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Full cross-track support</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.full_cross_track_points ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Cross-track improvement</span>
            <span className="value">
              {Number(activeRunQuery.data?.metrics?.cross_track_improvement ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="metric">
            <span className="label">Buildings with clusters</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.buildings_with_clusters ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Noise / gate-excluded</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.noise_points ?? 0}/
              {activeRunQuery.data?.metrics?.gate_excluded_points ?? 0}
            </span>
          </div>
        </>
      )}
      <button className="button secondary" onClick={handleRefresh} disabled={!activeRunId}>
        Refresh ML tiles
      </button>

      <div className="form-row">
        <label className="label">Visualization</label>
        <select
          className="select"
          value={mlView}
          onChange={(e) => setMlView(e.target.value as any)}
        >
          <option value="cluster">Cluster colors</option>
          <option value="quality">Quality score</option>
          <option value="anomaly">Anomaly score</option>
          <option value="cross-track">Cross-track consistency</option>
          <option value="reliability">Reliability</option>
        </select>
      </div>

      <div className="section-title">Recent Runs</div>
      {runsQuery.isLoading && <div className="pill">Loading runs…</div>}
      {runsQuery.data && (
        <div className="run-list">
          {visibleRuns.map((run: any) => (
            <div
              key={run.run_id}
              className={`run-item ${run.run_id === activeRunId ? "active" : ""}`}
            >
              <button
                className="run-select"
                onClick={() => {
                  setActiveRunId(run.run_id);
                  setMlView("cluster");
                }}
              >
                <span className="run-title">{run.pipeline}</span>
                <span className="run-meta">{run.status}</span>
              </button>
              <button className="run-delete" onClick={() => handleDelete(run.run_id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {runsQuery.data && visibleRuns.length === 0 && (
        <div className="pill">No `anomaly_local_v1` runs yet.</div>
      )}
    </div>
  );
}
