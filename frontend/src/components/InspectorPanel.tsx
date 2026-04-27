import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import {
  getBuildingDetail,
  getMlBuildingAnalysis,
  getMlPointAnalysis,
  getMlRunDetail,
  getPointDetail,
  type MlReliabilityPenalty,
} from "../hooks/useApi";

export default function InspectorPanel() {
  const selection = useAppStore((state) => state.selection);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const mlBuildingTrackFilter = useAppStore((state) => state.mlBuildingTrackFilter);
  const setMlBuildingTrackFilter = useAppStore((state) => state.setMlBuildingTrackFilter);
  const mlBuildingShowExcluded = useAppStore((state) => state.mlBuildingShowExcluded);
  const setMlBuildingShowExcluded = useAppStore((state) => state.setMlBuildingShowExcluded);
  const mlBuildingShowHulls = useAppStore((state) => state.mlBuildingShowHulls);
  const setMlBuildingShowHulls = useAppStore((state) => state.setMlBuildingShowHulls);
  const [pointAnalysisRunId, setPointAnalysisRunId] = useState<string | null>(null);

  const activeRunQuery = useQuery({
    queryKey: ["ml-run-detail", activeRunId],
    queryFn: () => getMlRunDetail(activeRunId as string),
    enabled: Boolean(activeRunId),
    refetchInterval: activeRunId ? 5000 : false,
  });
  const hasResolvedActiveRun =
    Boolean(activeRunId) && activeRunQuery.data?.run_id === activeRunId;
  const activeRunStatus = hasResolvedActiveRun ? activeRunQuery.data?.status : undefined;
  const isActiveRunPending = activeRunStatus === "queued" || activeRunStatus === "running";
  const isActiveLocalAnomalyRun =
    hasResolvedActiveRun && activeRunQuery.data?.pipeline === "anomaly_local_v1";

  useEffect(() => {
    if (
      activeRunId &&
      activeRunQuery.data?.run_id === activeRunId &&
      activeRunQuery.data?.status === "succeeded"
    ) {
      setPointAnalysisRunId(activeRunId);
      return;
    }
    setPointAnalysisRunId(null);
  }, [activeRunId, activeRunQuery.data?.run_id, activeRunQuery.data?.status]);

  const pointQuery = useQuery({
    queryKey: ["point-detail", selection],
    queryFn: () =>
      selection && selection.type === "point"
        ? getPointDetail(selection.code, selection.track)
        : Promise.resolve(null),
    enabled: selection?.type === "point",
  });

  const buildingDetailQuery = useQuery({
    queryKey: ["building-detail", selection],
    queryFn: () =>
      selection && selection.type === "building"
        ? getBuildingDetail(selection.source, selection.id)
        : Promise.resolve(null),
    enabled: selection?.type === "building",
  });

  const mlBuildingAnalysisQuery = useQuery({
    queryKey: ["ml-building-analysis", activeRunId, activeRunStatus, selection],
    queryFn: () =>
      selection && selection.type === "building" && activeRunId
        ? getMlBuildingAnalysis(activeRunId, selection.source, selection.id)
        : Promise.resolve(null),
    enabled:
      hasResolvedActiveRun &&
      selection?.type === "building",
    refetchInterval: isActiveRunPending ? 5000 : false,
    retry: false,
  });

  const mlPointAnalysisQuery = useQuery({
    queryKey: ["ml-point-analysis", pointAnalysisRunId, selection],
    queryFn: () =>
      selection &&
      selection.type === "point" &&
      pointAnalysisRunId &&
      typeof selection.track === "number"
        ? getMlPointAnalysis(pointAnalysisRunId, selection.code, selection.track)
        : Promise.resolve(null),
    enabled:
      Boolean(pointAnalysisRunId) &&
      selection?.type === "point" &&
      typeof selection.track === "number",
    retry: false,
  });
  const mlPointAnalysis = mlPointAnalysisQuery.data?.analysis ?? null;
  const mlPointAnalysisStatus = mlPointAnalysisQuery.data?.status;
  const mlPointAnalysisMessage = mlPointAnalysisQuery.data?.message;
  const mlPointNeighbourhood = mlPointAnalysis?.neighbour_context;
  const showPointNeighbourhood = Boolean(
    mlPointNeighbourhood?.context_available ||
    mlPointNeighbourhood?.neighbour_misassignment_flag ||
    mlPointNeighbourhood?.neighbour_event_flag
  );

  const fmtNum = (value?: number | null, digits = 2) =>
    value === null || value === undefined ? "—" : value.toFixed(digits);
  const fmtPct = (value?: number | null, digits = 0) =>
    value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;
  const fmtStr = (value?: string | number | null) =>
    value === null || value === undefined || value === "" ? "—" : String(value);
  const fmtBool = (value?: boolean | null) =>
    value === null || value === undefined ? "—" : value ? "yes" : "no";
  const getNumber = (value: unknown) => {
    const parsed =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
    return parsed === null || Number.isNaN(parsed) ? null : parsed;
  };
  const formatCountLabel = (key: string) => {
    if (key === "44") return "Track 44";
    if (key === "95") return "Track 95";
    return key.replaceAll("_", " ");
  };
  const formatRetuningFlags = (
    weakSecondaryTrackFlag: boolean,
    agreementTensionFlag: boolean
  ) => {
    const flags = [
      weakSecondaryTrackFlag ? "weak secondary track" : null,
      agreementTensionFlag ? "agreement tension" : null,
    ].filter(Boolean);
    return flags.length ? flags.join(" / ") : "—";
  };
  const formatPenalty = (penalty: MlReliabilityPenalty) => {
    const trackSuffix = penalty.tracks.length ? ` T${penalty.tracks.join("/T")}` : "";
    const deltaSuffix =
      penalty.score_delta === null ? "" : ` (${penalty.score_delta.toFixed(2)})`;
    if (penalty.key === "weak_main_cluster_support") {
      return `weak main support${trackSuffix}${deltaSuffix}`;
    }
    if (penalty.key === "weak_secondary_track_band_cap") {
      return `band cap ${penalty.cap_band || "—"}${trackSuffix}`;
    }
    if (penalty.key === "low_track_agreement") {
      return `low agreement${deltaSuffix}`;
    }
    if (penalty.key === "very_low_track_agreement_band_cap") {
      return `band cap ${penalty.cap_band || "—"}`;
    }
    return penalty.key.replaceAll("_", " ");
  };
  const formatPenaltySummary = (penalties: MlReliabilityPenalty[]) =>
    penalties.length ? penalties.map(formatPenalty).join(" / ") : "—";

  return (
    <div className="panel panel-right">
      <div>
        <h2>Inspector</h2>
        <small>Click a point or building to explore cross-source attributes.</small>
      </div>

      {!selection && <div className="pill">No selection yet</div>}

      {selection?.type === "point" && (
        <>
          {pointQuery.isLoading && <div className="pill">Loading point…</div>}
          {pointQuery.data && (
            <div>
              <div className="section-title">Point Details</div>
              {(() => {
                const fmt = {
                  num: (value?: number | null, digits = 2) =>
                    value === null || value === undefined ? "—" : value.toFixed(digits),
                  str: (value?: string | number | null) =>
                    value === null || value === undefined || value === "" ? "—" : String(value),
                };
                const lon =
                  pointQuery.data.geometry?.lon === undefined
                    ? undefined
                    : pointQuery.data.geometry?.lon;
                const lat =
                  pointQuery.data.geometry?.lat === undefined
                    ? undefined
                    : pointQuery.data.geometry?.lat;
                return (
                  <>
                    <div className="metric">
                      <span className="label">Code</span>
                      <span className="value">{fmt.str(pointQuery.data.code)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Track / LOS</span>
                      <span className="value">
                        {fmt.str(pointQuery.data.track)} / {fmt.str(pointQuery.data.los)}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="label">Velocity (mm/yr)</span>
                      <span className="value">{fmt.num(pointQuery.data.velocity)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Velocity std (mm/yr)</span>
                      <span className="value">{fmt.num(pointQuery.data.velocity_std)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Coherence</span>
                      <span className="value">{fmt.num(pointQuery.data.coherence)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Incidence angle (°)</span>
                      <span className="value">{fmt.num(pointQuery.data.incidence_angle)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">InSAR height (m)</span>
                      <span className="value">{fmt.num(pointQuery.data.height, 1)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Height std (m)</span>
                      <span className="value">{fmt.num(pointQuery.data.height_std, 1)}</span>
                    </div>
                    {pointQuery.data.terrain && (
                      <>
                        <div className="section-title">Terrain Context</div>
                        <div className="metric">
                          <span className="label">Terrain source</span>
                          <span className="value">{fmt.str(pointQuery.data.terrain.source)}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Terrain resolution (m)</span>
                          <span className="value">{fmt.num(pointQuery.data.terrain.resolution_m, 1)}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Terrain elevation (m)</span>
                          <span className="value">{fmt.num(pointQuery.data.terrain.elevation_m, 1)}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Slope (°)</span>
                          <span className="value">{fmt.num(pointQuery.data.terrain.slope_deg, 1)}</span>
                        </div>
                        <div className="metric">
                          <span className="label">Aspect (°)</span>
                          <span className="value">{fmt.num(pointQuery.data.terrain.aspect_deg, 1)}</span>
                        </div>
                      </>
                    )}
                    <div className="metric">
                      <span className="label">Acceleration (mm/yr²)</span>
                      <span className="value">{fmt.num(pointQuery.data.acceleration)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Acceleration std (mm/yr²)</span>
                      <span className="value">{fmt.num(pointQuery.data.acceleration_std)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Seasonal amplitude (mm)</span>
                      <span className="value">{fmt.num(pointQuery.data.season_amp)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Seasonal amplitude std (mm)</span>
                      <span className="value">{fmt.num(pointQuery.data.s_amp_std)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Seasonal phase</span>
                      <span className="value">{fmt.num(pointQuery.data.season_phs)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Seasonal phase std</span>
                      <span className="value">{fmt.num(pointQuery.data.s_phs_std)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Amplitude mean</span>
                      <span className="value">{fmt.num(pointQuery.data.amp_mean, 1)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Amplitude std</span>
                      <span className="value">{fmt.num(pointQuery.data.amp_std, 1)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Effective area</span>
                      <span className="value">{fmt.num(pointQuery.data.eff_area, 1)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Longitude</span>
                      <span className="value">
                        {lon === undefined || lon === null ? "—" : lon.toFixed(6)}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="label">Latitude</span>
                      <span className="value">
                        {lat === undefined || lat === null ? "—" : lat.toFixed(6)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          {pointAnalysisRunId && mlPointAnalysisQuery.isLoading && (
            <div className="pill">Loading anomaly analysis…</div>
          )}
          {activeRunId && activeRunId !== pointAnalysisRunId && (
            <div className="pill">Active run is still processing this point.</div>
          )}
          {activeRunId && activeRunStatus === "failed" && (
            <div className="pill warning">Active run failed before point analysis was available.</div>
          )}
          {pointAnalysisRunId === activeRunId && mlPointAnalysisStatus === "pending" && (
            <div className="pill">Active run is still processing this point.</div>
          )}
          {pointAnalysisRunId === activeRunId &&
            mlPointAnalysisStatus === "missing" &&
            activeRunStatus !== "failed" && (
            <div className="pill warning">
              {mlPointAnalysisMessage || "No ML analysis for this point in the active run."}
            </div>
          )}
          {activeRunId &&
            activeRunStatus &&
            !isActiveRunPending &&
            activeRunStatus !== "failed" &&
            mlPointAnalysisQuery.isError && (
              <div className="pill warning">Failed to load ML analysis for this point.</div>
            )}
          {pointAnalysisRunId === activeRunId && mlPointAnalysis && (
            <div>
              <div className="section-title">Run Analysis</div>
              <div className="metric">
                <span className="label">Label</span>
                <span className="value">{fmtStr(mlPointAnalysis.label)}</span>
              </div>
              <div className="metric">
                <span className="label">Quality score</span>
                <span className="value">{fmtNum(mlPointAnalysis.quality_score)}</span>
              </div>
              <div className="metric">
                <span className="label">Anomaly score</span>
                <span className="value">{fmtNum(mlPointAnalysis.anomaly_score)}</span>
              </div>
              <div className="metric">
                <span className="label">Cross-track consistency</span>
                <span className="value">{fmtNum(mlPointAnalysis.cross_track_consistency)}</span>
              </div>
              <div className="metric">
                <span className="label">Building</span>
                <span className="value">
                  {fmtStr(mlPointAnalysis.building_source)?.toUpperCase()} /{" "}
                  {fmtStr(mlPointAnalysis.building_id)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Distance to building</span>
                <span className="value">{fmtNum(mlPointAnalysis.distance_m, 1)} m</span>
              </div>
              <div className="metric">
                <span className="label">Cluster role / probability</span>
                <span className="value">
                  {fmtStr(mlPointAnalysis.cluster_role)} / {fmtNum(mlPointAnalysis.cluster_probability)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Cluster outlier score</span>
                <span className="value">{fmtNum(mlPointAnalysis.cluster_outlier_score)}</span>
              </div>
              <div className="metric">
                <span className="label">Kept for scoring</span>
                <span className="value">
                  {mlPointAnalysis.kept_for_scoring === null
                    ? "—"
                    : mlPointAnalysis.kept_for_scoring
                      ? "yes"
                      : "no"}
                </span>
              </div>
              <div className="metric">
                <span className="label">Assignment</span>
                <span className="value">
                  {fmtStr(
                    typeof mlPointAnalysis.building_context.assignment_method === "string"
                      ? mlPointAnalysis.building_context.assignment_method
                      : null
                  )}
                </span>
              </div>
              <div className="metric">
                <span className="label">Track support</span>
                <span className="value">
                  {fmtNum(getNumber(mlPointAnalysis.building_context.track_point_count), 0)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Step support</span>
                <span className="value">{fmtNum(getNumber(mlPointAnalysis.building_context.step_support))}</span>
              </div>
              <div className="metric">
                <span className="label">Detector scores</span>
                <span className="value">
                  {Object.entries(mlPointAnalysis.detector_scores)
                    .map(([key, value]) => `${key} ${fmtNum(value)}`)
                    .join(" / ") || "—"}
                </span>
              </div>
              <div className="metric">
                <span className="label">Degraded reason</span>
                <span className="value">
                  {fmtStr(
                    typeof mlPointAnalysis.feature_flags.degraded_reason === "string"
                      ? mlPointAnalysis.feature_flags.degraded_reason
                      : null
                  )}
                </span>
              </div>
              <div className="metric">
                <span className="label">Gate reasons</span>
                <span className="value">
                  {mlPointAnalysis.gate_reasons.length > 0
                    ? mlPointAnalysis.gate_reasons.join(", ")
                    : "—"}
                </span>
              </div>
              {showPointNeighbourhood && (
                <>
                  <div className="section-title">Neighbourhood</div>
                  <div className="metric">
                    <span className="label">Context</span>
                    <span className="value">
                      {mlPointNeighbourhood?.context_available
                        ? `${fmtNum(mlPointNeighbourhood.candidate_neighbour_count, 0)} cand / ${fmtNum(mlPointNeighbourhood.eligible_neighbour_cluster_count, 0)} elig`
                        : "not available"}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Best neighbour</span>
                    <span className="value">
                      {fmtStr(mlPointNeighbourhood?.best_neighbour_building_id)} /{" "}
                      {fmtStr(mlPointNeighbourhood?.best_neighbour_cluster_id)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Fit own / neigh / delta</span>
                    <span className="value">
                      {fmtNum(mlPointNeighbourhood?.own_cluster_fit_score)} /{" "}
                      {fmtNum(mlPointNeighbourhood?.neighbour_fit_score)} /{" "}
                      {fmtNum(mlPointNeighbourhood?.neighbour_fit_delta)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Misassignment / weak own fit</span>
                    <span className="value">
                      {fmtBool(mlPointNeighbourhood?.neighbour_misassignment_flag)} /{" "}
                      {fmtBool(mlPointNeighbourhood?.own_fit_weak_flag)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Neighbour event</span>
                    <span className="value">
                      {fmtBool(mlPointNeighbourhood?.neighbour_event_flag)} /{" "}
                      {fmtNum(mlPointNeighbourhood?.neighbour_event_score)} /{" "}
                      {fmtNum(mlPointNeighbourhood?.supporting_neighbour_count, 0)} support
                    </span>
                  </div>
                </>
              )}
              <div className="section-title">Top Reasons</div>
              {mlPointAnalysis.explain_top_features.length > 0 ? (
                mlPointAnalysis.explain_top_features.map((reason) => (
                  <div className="metric" key={reason.key}>
                    <span className="label">{reason.summary}</span>
                    <span className="value">{fmtNum(reason.severity)}</span>
                  </div>
                ))
              ) : (
                <div className="pill">No top reasons stored for this point.</div>
              )}
            </div>
          )}

          {activeRunId &&
            !activeRunStatus &&
            activeRunQuery.isLoading && <div className="pill">Loading active run status…</div>}
        </>
      )}

      {selection?.type === "building" && (
        <>
          {buildingDetailQuery.isLoading && <div className="pill">Loading building…</div>}
          {buildingDetailQuery.data && (
            <div>
              <div className="section-title">Building Details</div>
              <div className="metric">
                <span className="label">Source</span>
                <span className="value">{buildingDetailQuery.data.source.toUpperCase()}</span>
              </div>
              <div className="metric">
                <span className="label">ID</span>
                <span className="value">{buildingDetailQuery.data.id}</span>
              </div>
              {buildingDetailQuery.data.height !== null && (
                <div className="metric">
                  <span className="label">Building height (m)</span>
                  <span className="value">{buildingDetailQuery.data.height?.toFixed(1)}</span>
                </div>
              )}
              {buildingDetailQuery.data.terrain && (
                <>
                  <div className="section-title">Terrain Context</div>
                  <div className="metric">
                    <span className="label">Terrain source</span>
                    <span className="value">{buildingDetailQuery.data.terrain.source}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Terrain resolution (m)</span>
                    <span className="value">
                      {fmtNum(buildingDetailQuery.data.terrain.resolution_m, 1)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Mean terrain elevation (m)</span>
                    <span className="value">
                      {fmtNum(buildingDetailQuery.data.terrain.elevation_mean_m, 1)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Terrain elevation min/max (m)</span>
                    <span className="value">
                      {fmtNum(buildingDetailQuery.data.terrain.elevation_min_m, 1)}
                      {" / "}
                      {fmtNum(buildingDetailQuery.data.terrain.elevation_max_m, 1)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Mean / max slope (°)</span>
                    <span className="value">
                      {fmtNum(buildingDetailQuery.data.terrain.slope_mean_deg, 1)}
                      {" / "}
                      {fmtNum(buildingDetailQuery.data.terrain.slope_max_deg, 1)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Relief range (m)</span>
                    <span className="value">
                      {fmtNum(buildingDetailQuery.data.terrain.relief_range_m, 1)}
                    </span>
                  </div>
                </>
              )}
              {buildingDetailQuery.data.name && (
                <div className="metric">
                  <span className="label">Name</span>
                  <span className="value">{buildingDetailQuery.data.name}</span>
                </div>
              )}
              {buildingDetailQuery.data.building_type && (
                <div className="metric">
                  <span className="label">Type</span>
                  <span className="value">{buildingDetailQuery.data.building_type}</span>
                </div>
              )}
              {buildingDetailQuery.data.attributes &&
                Object.keys(buildingDetailQuery.data.attributes).length > 0 && (
                  <div>
                    <div className="section-title">All Attributes</div>
                    {Object.entries(buildingDetailQuery.data.attributes).map(
                      ([key, value]) => (
                        <div className="metric" key={key}>
                          <span className="label">{key}</span>
                          <span className="value">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
              )}
            </div>
          )}

          {activeRunId && mlBuildingAnalysisQuery.isLoading && (
            <div className="pill">Loading active-run building analysis…</div>
          )}
          {activeRunId && mlBuildingAnalysisQuery.data && (
            <div>
              <div className="section-title">Active Run Building Analysis</div>
              <div className="metric">
                <span className="label">Run-assigned points</span>
                <span className="value">{mlBuildingAnalysisQuery.data.point_count}</span>
              </div>
              <div className="metric">
                <span className="label">Kept / excluded / noise</span>
                <span className="value">
                  {mlBuildingAnalysisQuery.data.kept_point_count}/
                  {mlBuildingAnalysisQuery.data.excluded_point_count}/
                  {mlBuildingAnalysisQuery.data.noise_point_count}
                </span>
              </div>
              <div className="metric">
                <span className="label">Motion / status</span>
                <span className="value">
                  {fmtNum(mlBuildingAnalysisQuery.data.building_motion_mm_a)} mm/yr /{" "}
                  {fmtStr(mlBuildingAnalysisQuery.data.building_status)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Reliability</span>
                <span className="value">
                  {fmtNum(mlBuildingAnalysisQuery.data.building_reliability_score)} /{" "}
                  {fmtStr(mlBuildingAnalysisQuery.data.building_reliability_band)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Retuning flags</span>
                <span className="value">
                  {formatRetuningFlags(
                    mlBuildingAnalysisQuery.data.weak_secondary_track_flag,
                    mlBuildingAnalysisQuery.data.agreement_tension_flag
                  )}
                </span>
              </div>
              <div className="metric">
                <span className="label">Track agreement</span>
                <span className="value">
                  {fmtNum(mlBuildingAnalysisQuery.data.track_agreement_score)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Retuning adjustments</span>
                <span className="value">
                  {formatPenaltySummary(mlBuildingAnalysisQuery.data.reliability_penalties)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Clusters / reliable</span>
                <span className="value">
                  {mlBuildingAnalysisQuery.data.cluster_count} /{" "}
                  {mlBuildingAnalysisQuery.data.reliable_cluster_count}
                </span>
              </div>
              <div className="metric">
                <span className="label">Differential motion</span>
                <span className="value">
                  {mlBuildingAnalysisQuery.data.differential_motion_flag ? "yes" : "no"}
                </span>
              </div>
              <div className="metric">
                <span className="label">Main clusters</span>
                <span className="value">
                  T44 {fmtStr(mlBuildingAnalysisQuery.data.main_cluster_track_44_id)} / T95{" "}
                  {fmtStr(mlBuildingAnalysisQuery.data.main_cluster_track_95_id)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Track motion</span>
                <span className="value">
                  T44 {fmtNum(mlBuildingAnalysisQuery.data.track_motion_mm_a["44"])} / T95{" "}
                  {fmtNum(mlBuildingAnalysisQuery.data.track_motion_mm_a["95"])}
                </span>
              </div>
              <div className="metric">
                <span className="label">Median distance</span>
                <span className="value">
                  {fmtNum(mlBuildingAnalysisQuery.data.median_distance_m, 1)} m
                </span>
              </div>
              <div className="section-title">Neighbourhood</div>
              <div className="metric">
                <span className="label">Context</span>
                <span className="value">
                  {mlBuildingAnalysisQuery.data.neighbour_context_available ? "yes" : "no"} /{" "}
                  {mlBuildingAnalysisQuery.data.neighbour_candidate_building_count} cand
                </span>
              </div>
              <div className="metric">
                <span className="label">Misassignment points</span>
                <span className="value">
                  {mlBuildingAnalysisQuery.data.neighbour_misassignment_point_count} /{" "}
                  {fmtPct(mlBuildingAnalysisQuery.data.neighbour_misassignment_share, 1)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Neighbour event</span>
                <span className="value">
                  {mlBuildingAnalysisQuery.data.neighbour_event_flag ? "yes" : "no"} /{" "}
                  {fmtNum(mlBuildingAnalysisQuery.data.neighbour_event_score)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Consistency / support</span>
                <span className="value">
                  {fmtNum(mlBuildingAnalysisQuery.data.neighbour_consistency_score)} /{" "}
                  {mlBuildingAnalysisQuery.data.supporting_neighbour_count} nbr / T
                  {mlBuildingAnalysisQuery.data.supporting_track_count}
                </span>
              </div>
              {isActiveLocalAnomalyRun && (
                <>
                  <div className="section-title">Building Cluster View</div>
                  <div className="pill">
                    Die Karte zeigt jetzt Kandidatenflaechen, Cluster-Huellen und Punktrollen fuer dieses Gebaeude.
                  </div>
                  <div className="form-row">
                    <label className="label">Track filter</label>
                    <select
                      className="select"
                      value={mlBuildingTrackFilter}
                      onChange={(e) =>
                        setMlBuildingTrackFilter(
                          e.target.value as "both" | "44" | "95"
                        )
                      }
                    >
                      <option value="both">ASC + DSC</option>
                      <option value="44">ASC only</option>
                      <option value="95">DSC only</option>
                    </select>
                  </div>
                  <div className="toggle-row">
                    <span>Show gate-excluded points</span>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={mlBuildingShowExcluded}
                      onChange={(e) => setMlBuildingShowExcluded(e.target.checked)}
                    />
                  </div>
                  <div className="toggle-row">
                    <span>Show cluster hulls</span>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={mlBuildingShowHulls}
                      onChange={(e) => setMlBuildingShowHulls(e.target.checked)}
                    />
                  </div>
                </>
              )}
              {isActiveRunPending && (
                <div className="pill">This summary refreshes while the active run is processing.</div>
              )}
              {mlBuildingAnalysisQuery.data.point_count === 0 ? (
                <div className="pill">No points from the active run are assigned to this building.</div>
              ) : (
                <>
                  <div className="section-title">Diagnostics</div>
                  <div className="metric">
                    <span className="label">Average quality</span>
                    <span className="value">
                      {fmtNum(mlBuildingAnalysisQuery.data.avg_quality_score)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Average anomaly</span>
                    <span className="value">
                      {fmtNum(mlBuildingAnalysisQuery.data.avg_anomaly_score)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Average cross-track</span>
                    <span className="value">
                      {fmtNum(mlBuildingAnalysisQuery.data.avg_cross_track_consistency)}
                    </span>
                  </div>
                  <div className="section-title">Track Counts</div>
                  {Object.entries(mlBuildingAnalysisQuery.data.track_counts).map(([key, value]) => (
                    <div className="metric" key={`track-${key}`}>
                      <span className="label">{formatCountLabel(key)}</span>
                      <span className="value">{value}</span>
                    </div>
                  ))}
                  <div className="section-title">Label Counts</div>
                  {Object.entries(mlBuildingAnalysisQuery.data.label_counts).map(([key, value]) => (
                    <div className="metric" key={`label-${key}`}>
                      <span className="label">{formatCountLabel(key)}</span>
                      <span className="value">{value}</span>
                    </div>
                  ))}
                  <div className="section-title">Assignment Methods</div>
                  {Object.entries(mlBuildingAnalysisQuery.data.assignment_methods).map(
                    ([key, value]) => (
                      <div className="metric" key={`assignment-${key}`}>
                        <span className="label">{formatCountLabel(key)}</span>
                        <span className="value">{value}</span>
                      </div>
                    )
                  )}
                  {mlBuildingAnalysisQuery.data.clusters.length > 0 && (
                    <>
                      <div className="section-title">Clusters</div>
                      {mlBuildingAnalysisQuery.data.clusters.map((cluster) => (
                        <div className="metric" key={cluster.cluster_id}>
                          <span className="label">
                            {cluster.cluster_id} / T{cluster.track}
                            {cluster.is_main_cluster ? " / main" : ""}
                          </span>
                          <span className="value">
                            #{fmtStr(cluster.cluster_rank)} / {cluster.cluster_role} /{" "}
                            {cluster.point_count} pts / V{" "}
                            {fmtNum(cluster.median_vertical_proxy_mm_a)} / Rel{" "}
                            {fmtNum(cluster.cluster_reliability_score)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="section-title">Lowest-Quality Points</div>
                  {mlBuildingAnalysisQuery.data.top_points.map((point) => (
                    <div className="metric" key={`${point.code}-${point.track}`}>
                      <span className="label">
                        {point.code} / {point.track} / {fmtStr(point.cluster_role)}
                      </span>
                      <span className="value">
                        Q {fmtNum(point.quality_score)} / A {fmtNum(point.anomaly_score)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        </>
      )}
    </div>
  );
}
