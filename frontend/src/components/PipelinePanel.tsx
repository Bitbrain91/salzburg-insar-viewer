import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createMlRun,
  deleteMlRun,
  getMlRunDetail,
  listMlRuns,
  recolorMlRun,
} from "../hooks/useApi";
import { useAppStore } from "../lib/store";

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

  const [pipeline, setPipeline] = useState("assignment");
  const [source, setSource] = useState<"gba" | "osm">("gba");
  const [track, setTrack] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState(30);
  const [bufferMultiplier, setBufferMultiplier] = useState(1.0);
  const [minBuffer, setMinBuffer] = useState(3.0);
  const [defaultHeight, setDefaultHeight] = useState(12.0);
  const [eps, setEps] = useState(0.9);
  const [minSamples, setMinSamples] = useState(8);

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

  const bboxLabel = useMemo(() => {
    if (!mapBBox) return "Map extent not ready";
    return mapBBox.map((v) => v.toFixed(4)).join(", ");
  }, [mapBBox]);

  async function handleRun() {
    if (!mapBBox) return;
    const payload = {
      pipeline,
      source: pipeline === "clustering" ? null : source,
      track: track === "all" ? null : Number(track),
      bbox: mapBBox,
      params: {
        max_distance_m: maxDistance,
        buffer_multiplier: bufferMultiplier,
        min_buffer_m: minBuffer,
        default_height_m: defaultHeight,
        eps,
        min_samples: minSamples,
      },
    };
    const result = await createMlRun(payload);
    if (result?.run_id) {
      setActiveRunId(result.run_id);
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
        <select
          className="select"
          value={pipeline}
          onChange={(e) => setPipeline(e.target.value)}
        >
          <option value="assignment">Assignment (Adaptive Buffer)</option>
          <option value="clustering">Clustering (DBSCAN)</option>
          <option value="hybrid">Hybrid (Assign + Cluster)</option>
        </select>
      </div>

      {pipeline !== "clustering" && (
        <div className="form-row">
          <label className="label">Building source</label>
          <select
            className="select"
            value={source}
            onChange={(e) => setSource(e.target.value as "gba" | "osm")}
          >
            <option value="gba">GBA (with height)</option>
            <option value="osm">OSM (no height)</option>
          </select>
        </div>
      )}

      <div className="form-row">
        <label className="label">Track</label>
        <select className="select" value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="all">All</option>
          <option value="44">44 (Ascending)</option>
          <option value="95">95 (Descending)</option>
        </select>
      </div>

      {pipeline !== "clustering" && (
        <>
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
        </>
      )}

      {pipeline !== "assignment" && (
        <>
          <div className="form-row">
            <label className="label">DBSCAN eps</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={eps}
              onChange={(e) => setEps(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label className="label">Min samples</label>
            <input
              className="input"
              type="number"
              value={minSamples}
              onChange={(e) => setMinSamples(Number(e.target.value))}
            />
          </div>
        </>
      )}

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
          No assigned buildings for this run. Load GBA/OSM into PostGIS or use an
          assignment/hybrid pipeline.
        </div>
      )}
      <button className="button secondary" onClick={handleRefresh} disabled={!activeRunId}>
        Refresh ML tiles
      </button>

      <div className="form-row">
        <label className="label">Visualization</label>
        <select className="select" value={mlView} onChange={(e) => setMlView(e.target.value as any)}>
          <option value="cluster">Cluster colors</option>
          <option value="building">Building colors</option>
          <option value="assignment">Assignment method</option>
          <option value="distance">Distance heat</option>
          <option value="velocity">Velocity</option>
          <option value="coherence">Coherence</option>
        </select>
      </div>

      <div className="section-title">Recent Runs</div>
      {runsQuery.isLoading && <div className="pill">Loading runs…</div>}
      {runsQuery.data && (
        <div className="run-list">
          {runsQuery.data.map((run: any) => (
            <div
              key={run.run_id}
              className={`run-item ${run.run_id === activeRunId ? "active" : ""}`}
            >
              <button className="run-select" onClick={() => setActiveRunId(run.run_id)}>
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
    </div>
  );
}
