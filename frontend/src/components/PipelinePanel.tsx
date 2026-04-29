import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createMlRun,
  deleteMlRun,
  getMlRunDetail,
  listMlRuns,
  recolorMlRun,
} from "../hooks/useApi";
import { useAppStore, type AppState } from "../lib/store";

const localAnomalyViews = [
  "cluster",
  "quality",
  "anomaly",
  "cross-track",
  "reliability",
] as const;
const PIPELINE_NAME = "anomaly_local_v1";

type LocalAnomalyView = (typeof localAnomalyViews)[number];

const visualizationOptions: Array<{ value: LocalAnomalyView; label: string }> = [
  { value: "cluster", label: "Clusterfarben" },
  { value: "quality", label: "Qualitätswert" },
  { value: "anomaly", label: "Anomaliewert" },
  { value: "cross-track", label: "Cross-Track-Konsistenz" },
  { value: "reliability", label: "Zuverlässigkeit" },
];

function isLocalAnomalyView(view: AppState["mlView"]): view is LocalAnomalyView {
  return localAnomalyViews.includes(view as LocalAnomalyView);
}

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
    if (!mapBBox) return "Kartenausschnitt noch nicht verfügbar";
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
    if (!isLocalAnomalyView(mlView)) {
      setMlView("cluster");
    }
  }, [activeRunId, mlView, setMlView]);

  useEffect(() => {
    if (!activeRunId || activeRunPipeline === undefined) {
      return;
    }
    if (isActiveRunLocalAnomaly) {
      if (!isLocalAnomalyView(mlView)) {
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
    <div className="panel panel-left">
      <div>
        <h2>Auswertung / ML</h2>
        <small>Lokale Anomalieanalyse für den aktuellen Kartenausschnitt.</small>
      </div>

      <div>
        <div className="section-title">Kartenausschnitt</div>
        <div className="metric">
          <span className="label">Aktuelle Bounding Box</span>
          <span className="value">{bboxLabel}</span>
        </div>
        {activeRunQuery.data && (
          <>
            <div className="metric">
              <span className="label">Zugeordnete Gebäude</span>
              <span className="value">
                {activeRunQuery.data.metrics?.assigned_buildings ?? 0}
              </span>
            </div>
            <div className="metric">
              <span className="label">Zugeordnete Punkte</span>
              <span className="value">
                {activeRunQuery.data.metrics?.assigned_points ?? 0}
              </span>
            </div>
          </>
        )}
      </div>

      <div>
        <div className="section-title">Neue Auswertung</div>
        <div className="form-row">
          <label className="label">Verfahren</label>
          <input className="input" value="Lokale Anomalieanalyse v1" readOnly />
        </div>

        <div className="pill">Gebäudequelle ist für {pipeline} fest auf GBA gesetzt.</div>

        <div className="form-row">
          <label className="label">InSAR-Track</label>
          <select className="select" value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="all">Alle Tracks</option>
            <option value="44">Track 44 (aufsteigend)</option>
            <option value="95">Track 95 (absteigend)</option>
          </select>
        </div>

        <details>
          <summary className="section-title">Erweiterte Parameter</summary>
          <div className="form-row">
            <label className="label">Maximaler Abstand (m)</label>
            <input
              className="input"
              type="number"
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label className="label">Buffer-Multiplikator</label>
            <input
              className="input"
              type="number"
              step="0.1"
              value={bufferMultiplier}
              onChange={(e) => setBufferMultiplier(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label className="label">Minimaler Buffer (m)</label>
            <input
              className="input"
              type="number"
              step="0.5"
              value={minBuffer}
              onChange={(e) => setMinBuffer(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label className="label">Standardhöhe (m)</label>
            <input
              className="input"
              type="number"
              step="0.5"
              value={defaultHeight}
              onChange={(e) => setDefaultHeight(Number(e.target.value))}
            />
          </div>
        </details>

        <button className="button" onClick={handleRun} disabled={!mapBBox}>
          Auswertung starten
        </button>
      </div>

      <div>
        <div className="section-title">Darstellung</div>
        <div className="toggle-row">
          <span>ML-Punkte anzeigen</span>
          <input
            type="checkbox"
            className="toggle"
            checked={showMlLayer}
            onChange={(e) => setShowMlLayer(e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>Zugeordnete Gebäude anzeigen</span>
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
            Für diese Auswertung wurden keine Gebäude zugeordnet. Prüfen Sie, ob GBA-Daten
            in PostGIS geladen sind und der Kartenausschnitt unterstützte Gebäude schneidet.
          </div>
        )}

        <div className="form-row">
          <label className="label">Karteneinfärbung</label>
          <select
            className="select"
            value={mlView}
            onChange={(e) => setMlView(e.target.value as LocalAnomalyView)}
          >
            {visualizationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button className="button secondary" onClick={handleRefresh} disabled={!activeRunId}>
          ML-Kacheln aktualisieren
        </button>
      </div>

      {isActiveRunLocalAnomaly && (
        <div>
          <div className="section-title">Ergebniskennzahlen</div>
          <div className="metric">
            <span className="label">Normal / Verdacht / Ausreißer</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.normal_points ?? 0}/
              {activeRunQuery.data?.metrics?.suspect_points ?? 0}/
              {activeRunQuery.data?.metrics?.outlier_points ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Vollständige Cross-Track-Stützung</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.full_cross_track_points ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Cross-Track-Verbesserung</span>
            <span className="value">
              {Number(activeRunQuery.data?.metrics?.cross_track_improvement ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="metric">
            <span className="label">Gebäude mit Clustern</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.buildings_with_clusters ?? 0}
            </span>
          </div>
          <div className="metric">
            <span className="label">Rauschen / durch Gate ausgeschlossen</span>
            <span className="value">
              {activeRunQuery.data?.metrics?.noise_points ?? 0}/
              {activeRunQuery.data?.metrics?.gate_excluded_points ?? 0}
            </span>
          </div>
        </div>
      )}

      <div>
        <div className="section-title">Letzte Auswertungen</div>
        {runsQuery.isLoading && <div className="pill">Auswertungen laden...</div>}
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
                  <span className="run-title">Lokale Anomalieanalyse</span>
                  <span className="run-meta">{run.status}</span>
                </button>
                <button className="run-delete" onClick={() => handleDelete(run.run_id)}>
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
        {runsQuery.data && visibleRuns.length === 0 && (
          <div className="pill">Noch keine Auswertungen für anomaly_local_v1.</div>
        )}
      </div>
    </div>
  );
}
