import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import {
  getBuildingDetail,
  getBuildingPoints,
  getMlBuildingAnalysis,
  getMlPointAnalysis,
  getMlRunDetail,
  getPointDetail,
} from "../hooks/useApi";

export default function InspectorPanel() {
  const selection = useAppStore((state) => state.selection);
  const activeRunId = useAppStore((state) => state.activeRunId);
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
  const isActiveAnomalyRun =
    hasResolvedActiveRun && activeRunQuery.data?.pipeline === "anomaly_v1";

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

  const buildingPointsQuery = useQuery({
    queryKey: ["building-points", selection, isActiveAnomalyRun],
    queryFn: () =>
      selection && selection.type === "building"
        ? getBuildingPoints(selection.source, selection.id)
        : Promise.resolve(null),
    enabled: selection?.type === "building" && !isActiveAnomalyRun,
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

  const fmtNum = (value?: number | null, digits = 2) =>
    value === null || value === undefined ? "—" : value.toFixed(digits);
  const fmtStr = (value?: string | number | null) =>
    value === null || value === undefined || value === "" ? "—" : String(value);
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
                      <span className="label">Height (m)</span>
                      <span className="value">{fmt.num(pointQuery.data.height, 1)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Height std (m)</span>
                      <span className="value">{fmt.num(pointQuery.data.height_std, 1)}</span>
                    </div>
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
                    <div className="metric">
                      <span className="label">Linked GBA</span>
                      <span className="value">{fmt.str(pointQuery.data.gba_id)}</span>
                    </div>
                    <div className="metric">
                      <span className="label">Linked OSM</span>
                      <span className="value">{fmt.str(pointQuery.data.osm_id)}</span>
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
                <span className="label">Height band</span>
                <span className="value">
                  {fmtStr(
                    typeof mlPointAnalysis.feature_flags.height_band === "string"
                      ? mlPointAnalysis.feature_flags.height_band
                      : null
                  )}
                </span>
              </div>
              <div className="metric">
                <span className="label">Track support</span>
                <span className="value">
                  {fmtNum(getNumber(mlPointAnalysis.building_context.track_point_count), 0)}
                  {" / "}
                  {fmtNum(getNumber(mlPointAnalysis.building_context.other_track_point_count), 0)}
                </span>
              </div>
              <div className="metric">
                <span className="label">Step support</span>
                <span className="value">{fmtNum(getNumber(mlPointAnalysis.building_context.step_support))}</span>
              </div>
              <div className="metric">
                <span className="label">Detector scores</span>
                <span className="value">
                  IF {fmtNum(mlPointAnalysis.detector_scores.isolation_forest)} / Rule{" "}
                  {fmtNum(mlPointAnalysis.detector_scores.rule_gate)}
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
                  <span className="label">Height (m)</span>
                  <span className="value">{buildingDetailQuery.data.height?.toFixed(1)}</span>
                </div>
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
              <div className="metric">
                <span className="label">Median distance</span>
                <span className="value">
                  {fmtNum(mlBuildingAnalysisQuery.data.median_distance_m, 1)} m
                </span>
              </div>
              {isActiveRunPending && (
                <div className="pill">This summary refreshes while the active run is processing.</div>
              )}
              {mlBuildingAnalysisQuery.data.point_count === 0 ? (
                <div className="pill">No points from the active run are assigned to this building.</div>
              ) : (
                <>
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
                  <div className="section-title">Lowest-Quality Points</div>
                  {mlBuildingAnalysisQuery.data.top_points.map((point) => (
                    <div className="metric" key={`${point.code}-${point.track}`}>
                      <span className="label">
                        {point.code} / {point.track}
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

          {buildingPointsQuery.data && (
            <div>
              <div className="section-title">Linked InSAR Points</div>
              <div className="metric">
                <span className="label">Count</span>
                <span className="value">{buildingPointsQuery.data.count}</span>
              </div>
              <div className="pill">{buildingPointsQuery.data.count} points linked</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
