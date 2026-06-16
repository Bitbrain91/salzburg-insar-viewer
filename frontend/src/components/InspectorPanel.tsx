import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Play, RotateCcw, Star } from "lucide-react";
import {
  useAppStore,
  type MlBuildingPointFocusMode,
  type MlBuildingTrackFilter,
  type Selection,
} from "../lib/store";
import {
  getBuildingDetail,
  getMlBuildingAnalysis,
  getMlBuildingPoints,
  getMlBuildingRuns,
  getMlPointAnalysis,
  getMlRunDetail,
  getPointDetail,
  useAppConfig,
  type MlBuildingAnalysis,
  type MlBuildingClusterSummary,
  type MlBuildingRunSummary,
  type MlReliabilityPenalty,
} from "../hooks/useApi";
import {
  Badge,
  Button,
  CollapsibleSection,
  HelpButton,
  SegmentedTabs,
  SummaryMetric,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Label as UiLabel,
  type SummaryMetricTone,
} from "./ui";
import {
  getAttributeMetadata,
  type AttributeContext,
  type AttributeMetadata,
} from "../lib/attributeMetadata";
import { getTrackVisibilityKey, normalizeAppConfig } from "../lib/configMetadata";

type InspectorTabId = "overview" | "metrics" | "ml" | "raw";

type InspectorTabConfig = {
  id: InspectorTabId;
  label: string;
};

const pointTabs: InspectorTabConfig[] = [
  { id: "overview", label: "Überblick" },
  { id: "metrics", label: "Messwerte" },
  { id: "ml", label: "Diagnose" },
  { id: "raw", label: "Rohdaten" },
];

const buildingTabs: InspectorTabConfig[] = [
  { id: "overview", label: "Überblick" },
  { id: "metrics", label: "Attribute" },
  { id: "ml", label: "Diagnose" },
  { id: "raw", label: "Rohdaten" },
];

const buildingPointFocusOptions: Array<{
  id: MlBuildingPointFocusMode;
  label: string;
  title: string;
}> = [
  {
    id: "run",
    label: "Run",
    title: "Alle Punkte des aktiven ML-Laufs anzeigen.",
  },
  {
    id: "building",
    label: "Gebaeude",
    title: "Nur Punkte anzeigen, die diesem Gebaeude im aktiven Lauf zugeordnet wurden.",
  },
  {
    id: "scored",
    label: "Scoring",
    title: "Nur nicht gate-ausgeschlossene Punkte dieses Gebaeudes anzeigen.",
  },
  {
    id: "cluster",
    label: "Cluster",
    title: "Nur Core-Clusterpunkte dieses Gebaeudes anzeigen.",
  },
];

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) {
    r = c;
    g = x;
  } else if (hp >= 1 && hp < 2) {
    r = x;
    g = c;
  } else if (hp >= 2 && hp < 3) {
    g = c;
    b = x;
  } else if (hp >= 3 && hp < 4) {
    g = x;
    b = c;
  } else if (hp >= 4 && hp < 5) {
    r = x;
    b = c;
  } else if (hp >= 5 && hp < 6) {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const mlPaletteSize = 60;
const mlPalette = Array.from({ length: mlPaletteSize }, (_, i) =>
  hslToHex((i * 360) / mlPaletteSize, 0.7, 0.5)
);

function clusterColor(cluster: Pick<MlBuildingClusterSummary, "cluster_color_index" | "cluster_role">) {
  if (cluster.cluster_role === "excluded") return "#9aa0a6";
  if (cluster.cluster_role === "noise") return "#c6372a";
  if (cluster.cluster_role === "insufficient_support") return "#f2c14e";
  const index = cluster.cluster_color_index ?? 0;
  return mlPalette[((index % mlPalette.length) + mlPalette.length) % mlPalette.length];
}

type BuildingSelection = Extract<NonNullable<Selection>, { type: "building" }>;

function matchesSelectedBuildingRunData(
  data:
    | {
        run_id?: string | null;
        building_source?: string | null;
        building_id?: string | number | null;
      }
    | null
    | undefined,
  building: BuildingSelection | null,
  runId: string | null
) {
  if (!data || !building || !runId) return false;
  return (
    data.run_id === runId &&
    data.building_source === building.source &&
    String(data.building_id) === building.id
  );
}

type AttributeHint = {
  key: string;
  context: AttributeContext;
};

const metricAttributeHints: Record<string, AttributeHint> = {
  "Punktcode": { key: "code", context: "insar-point" },
  "Track / LOS": { key: "los", context: "insar-point" },
  "Geschwindigkeit": { key: "velocity", context: "insar-point" },
  "Geschwindigkeit Std.": { key: "velocity_std", context: "insar-point" },
  "Kohaerenz": { key: "coherence", context: "insar-point" },
  "InSAR-Hoehe": { key: "height", context: "insar-point" },
  "Hoehe Std.": { key: "height_std", context: "insar-point" },
  "Beschleunigung": { key: "acceleration", context: "insar-point" },
  "Beschleunigung Std.": { key: "acceleration_std", context: "insar-point" },
  "Saisonale Amplitude": { key: "season_amp", context: "insar-point" },
  "Saisonale Amplitude Std.": { key: "s_amp_std", context: "insar-point" },
  "Saisonale Phase": { key: "season_phs", context: "insar-point" },
  "Saisonale Phase Std.": { key: "s_phs_std", context: "insar-point" },
  "Amplitude Mittel": { key: "amp_mean", context: "insar-point" },
  "Amplitude Std.": { key: "amp_std", context: "insar-point" },
  "Effektive Flaeche": { key: "eff_area", context: "insar-point" },
  "Einfallswinkel": { key: "incidence_angle", context: "insar-point" },
  "Laengengrad": { key: "lon", context: "insar-point" },
  "Breitengrad": { key: "lat", context: "insar-point" },
  "Terrain-Quelle": { key: "source", context: "terrain" },
  "Terrain-Aufloesung": { key: "resolution_m", context: "terrain" },
  "Gelaendehoehe": { key: "elevation_m", context: "terrain" },
  "Mittlere Gelaendehoehe": { key: "elevation_mean_m", context: "terrain" },
  "Gelaendehoehe min/max": { key: "elevation_min_m", context: "terrain" },
  "Hangneigung": { key: "slope_deg", context: "terrain" },
  "Hangneigung Mittel / Max": { key: "slope_mean_deg", context: "terrain" },
  "Exposition": { key: "aspect_deg", context: "terrain" },
  "Reliefspanne": { key: "relief_range_m", context: "terrain" },
  "Aktiver Lauf": { key: "run_id", context: "ml-run" },
  "Run-Status": { key: "status", context: "ml-run" },
  "Pipeline": { key: "pipeline", context: "ml-run" },
  "Label": { key: "label", context: "ml-point" },
  "Qualitaetswert": { key: "quality_score", context: "ml-point" },
  "Anomaliewert": { key: "anomaly_score", context: "ml-point" },
  "Cross-Track-Konsistenz": { key: "cross_track_consistency", context: "ml-point" },
  "Gebaeude": { key: "building_id", context: "ml-point" },
  "Abstand zum Gebaeude": { key: "distance_m", context: "ml-point" },
  "Clusterrolle / Wahrscheinlichkeit": { key: "cluster_role", context: "ml-point" },
  "Cluster-Ausreisserwert": { key: "cluster_outlier_score", context: "ml-point" },
  "Fuer Scoring genutzt": { key: "kept_for_scoring", context: "ml-point" },
  "Gate-Gruende": { key: "gate_reasons", context: "ml-point" },
  "Zuordnung": { key: "assignment_method", context: "ml-point" },
  "Track-Stuetzung": { key: "track_point_count", context: "ml-point" },
  "Detektorwerte": { key: "detector_scores", context: "ml-point" },
  "Degradierungsgrund": { key: "degraded_reason", context: "ml-point" },
  "Quelle": { key: "source", context: "building" },
  "Gebaeude-ID": { key: "building_id", context: "building" },
  "Gebaeudehoehe": { key: "height", context: "building" },
  "Name": { key: "name", context: "building" },
  "Typ": { key: "building_type", context: "building" },
  "Bewegung": { key: "building_motion_mm_a", context: "ml-building" },
  "Zuverlaessigkeit": { key: "building_reliability_score", context: "ml-building" },
  "Status": { key: "building_status", context: "ml-building" },
  "Run-zugeordnete Punkte": { key: "point_count", context: "ml-building" },
  "Behalten / ausgeschlossen / Rauschen": { key: "kept_point_count", context: "ml-building" },
  "Bewegung / Status": { key: "building_motion_mm_a", context: "ml-building" },
  "Retuning-Flags": { key: "reliability_penalties", context: "ml-building" },
  "Track-Uebereinstimmung": { key: "track_agreement_score", context: "ml-building" },
  "Retuning-Anpassungen": { key: "reliability_penalties", context: "ml-building" },
  "Cluster / belastbar": { key: "cluster_count", context: "ml-building" },
  "Differenzielle Bewegung": { key: "differential_motion_flag", context: "ml-building" },
  "Hauptcluster": { key: "main_cluster_by_track", context: "ml-building" },
  "Track-Bewegung": { key: "track_motion_mm_a", context: "ml-building" },
  "Median-Abstand": { key: "median_distance_m", context: "ml-building" },
  "Mittlere Qualitaet": { key: "avg_quality_score", context: "ml-building" },
  "Mittlere Anomalie": { key: "avg_anomaly_score", context: "ml-building" },
  "Mittlere Cross-Track-Konsistenz": {
    key: "avg_cross_track_consistency",
    context: "ml-building",
  },
};

export default function InspectorPanel() {
  const selection = useAppStore((state) => state.selection);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const setActiveRunId = useAppStore((state) => state.setActiveRunId);
  const mlBuildingTrackFilter = useAppStore((state) => state.mlBuildingTrackFilter);
  const setMlBuildingTrackFilter = useAppStore((state) => state.setMlBuildingTrackFilter);
  const mlBuildingShowExcluded = useAppStore((state) => state.mlBuildingShowExcluded);
  const setMlBuildingShowExcluded = useAppStore((state) => state.setMlBuildingShowExcluded);
  const mlBuildingShowHulls = useAppStore((state) => state.mlBuildingShowHulls);
  const setMlBuildingShowHulls = useAppStore((state) => state.setMlBuildingShowHulls);
  const mlBuildingShowNoise = useAppStore((state) => state.mlBuildingShowNoise);
  const setMlBuildingShowNoise = useAppStore((state) => state.setMlBuildingShowNoise);
  const mlBuildingVisibleClusterIds = useAppStore((state) => state.mlBuildingVisibleClusterIds);
  const setMlBuildingVisibleClusterIds = useAppStore(
    (state) => state.setMlBuildingVisibleClusterIds
  );
  const mlBuildingPointFocusMode = useAppStore((state) => state.mlBuildingPointFocusMode);
  const setMlBuildingPointFocusMode = useAppStore(
    (state) => state.setMlBuildingPointFocusMode
  );
  const toggleMlBuildingClusterVisibility = useAppStore(
    (state) => state.toggleMlBuildingClusterVisibility
  );
  const resetMlBuildingClusterVisibility = useAppStore(
    (state) => state.resetMlBuildingClusterVisibility
  );
  const setMlView = useAppStore((state) => state.setMlView);
  const [pointAnalysisRunId, setPointAnalysisRunId] = useState<string | null>(null);
  const [activePointTab, setActivePointTab] = useState<InspectorTabId>("overview");
  const [activeBuildingTab, setActiveBuildingTab] = useState<InspectorTabId>("overview");
  const selectionKey =
    selection?.type === "point"
      ? `point:${selection.areaId ?? "unknown"}:${selection.datasetId ?? "unknown"}:${selection.code}:${selection.track ?? "all"}`
      : selection?.type === "building"
        ? `building:${selection.areaId ?? "unknown"}:${selection.source}:${selection.id}`
        : "none";
  const selectedBuilding = selection?.type === "building" ? selection : null;

  const activeRunQuery = useQuery({
    queryKey: ["ml-run-detail", activeRunId],
    queryFn: () => getMlRunDetail(activeRunId as string),
    enabled: Boolean(activeRunId),
    refetchInterval: activeRunId ? 5000 : false,
  });
  const configQuery = useAppConfig();
  const appConfig = normalizeAppConfig(configQuery.data);
  const hasResolvedActiveRun =
    Boolean(activeRunId) && activeRunQuery.data?.run_id === activeRunId;
  const activeRunStatus = hasResolvedActiveRun ? activeRunQuery.data?.status : undefined;
  const isActiveRunPending = activeRunStatus === "queued" || activeRunStatus === "running";
  const isActiveLocalAnomalyRun =
    hasResolvedActiveRun && activeRunQuery.data?.pipeline === "anomaly_local_v1";
  const mlBuildingTrackOptions =
    selection?.type === "building"
      ? appConfig.datasets
          .filter(
            (dataset) =>
              dataset.areaId === selection.areaId &&
              dataset.id === activeRunQuery.data?.dataset_id
          )
          .flatMap((dataset) =>
            dataset.tracks.map((track) => ({
              value: getTrackVisibilityKey(dataset.id, track.track) as MlBuildingTrackFilter,
              label: `${track.sensor} Track ${track.track}${track.los ? ` ${track.los}` : ""}`,
            }))
          )
      : [];

  useEffect(() => {
    setActivePointTab("overview");
    setActiveBuildingTab("overview");
  }, [selectionKey]);

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
        ? getPointDetail(selection.code, {
            track: selection.track,
            areaId: selection.areaId,
            datasetId: selection.datasetId,
          })
        : Promise.resolve(null),
    enabled: selection?.type === "point",
  });

  const buildingDetailQuery = useQuery({
    queryKey: [
      "building-detail",
      selectedBuilding?.source ?? null,
      selectedBuilding?.id ?? null,
      selectedBuilding?.areaId ?? null,
    ],
    queryFn: () =>
      selectedBuilding
        ? getBuildingDetail(selectedBuilding.source, selectedBuilding.id, selectedBuilding.areaId)
        : Promise.resolve(null),
    enabled: Boolean(selectedBuilding),
  });

  const buildingRunsQuery = useQuery({
    queryKey: [
      "ml-building-runs",
      selectedBuilding?.source ?? null,
      selectedBuilding?.id ?? null,
      selectedBuilding?.areaId ?? null,
    ],
    queryFn: () =>
      selectedBuilding
        ? getMlBuildingRuns(selectedBuilding.source, selectedBuilding.id, selectedBuilding.areaId)
        : Promise.resolve([]),
    enabled: Boolean(selectedBuilding),
    refetchInterval: 10000,
    retry: false,
  });

  const mlBuildingAnalysisQuery = useQuery({
    queryKey: [
      "ml-building-analysis",
      activeRunId,
      activeRunStatus,
      selectedBuilding?.source ?? null,
      selectedBuilding?.id ?? null,
      selectedBuilding?.areaId ?? null,
    ],
    queryFn: () =>
      selectedBuilding && activeRunId
        ? getMlBuildingAnalysis(
            activeRunId,
            selectedBuilding.source,
            selectedBuilding.id,
            selectedBuilding.areaId
          )
        : Promise.resolve(null),
    enabled:
      hasResolvedActiveRun &&
      Boolean(selectedBuilding),
    refetchInterval: isActiveRunPending ? 5000 : false,
    retry: false,
  });

  const mlBuildingPointsQuery = useQuery({
    queryKey: [
      "ml-building-points",
      activeRunId,
      selectedBuilding?.source ?? null,
      selectedBuilding?.id ?? null,
      selectedBuilding?.areaId ?? null,
    ],
    queryFn: () =>
      selectedBuilding && activeRunId
        ? getMlBuildingPoints(
            activeRunId,
            selectedBuilding.source,
            selectedBuilding.id,
            selectedBuilding.areaId
          )
        : Promise.resolve(null),
    enabled:
      Boolean(activeRunId) &&
      isActiveLocalAnomalyRun &&
      Boolean(selectedBuilding),
    retry: false,
  });
  const mlBuildingAnalysis = matchesSelectedBuildingRunData(
    mlBuildingAnalysisQuery.data,
    selectedBuilding,
    activeRunId
  )
    ? mlBuildingAnalysisQuery.data
    : null;
  const mlBuildingPointsData = matchesSelectedBuildingRunData(
    mlBuildingPointsQuery.data,
    selectedBuilding,
    activeRunId
  )
    ? mlBuildingPointsQuery.data
    : null;

  const mlPointAnalysisQuery = useQuery({
    queryKey: ["ml-point-analysis", pointAnalysisRunId, selection],
    queryFn: () =>
      selection &&
      selection.type === "point" &&
      pointAnalysisRunId &&
      typeof selection.track === "number"
        ? getMlPointAnalysis(pointAnalysisRunId, selection.code, {
            track: selection.track,
            areaId: selection.areaId,
            datasetId: selection.datasetId,
          })
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
  const buildingPointsByCluster = useMemo(() => {
    const groups = new Map<string, Array<Record<string, unknown>>>();
    const features = mlBuildingPointsData?.feature_collection.features ?? [];
    for (const feature of features) {
      const properties = feature.properties ?? {};
      const clusterId =
        properties.cluster_id === null || properties.cluster_id === undefined
          ? "unknown"
          : String(properties.cluster_id);
      const existing = groups.get(clusterId) ?? [];
      existing.push(properties);
      groups.set(clusterId, existing);
    }
    return groups;
  }, [mlBuildingPointsData]);

  const fmtNum = (value?: number | null, digits = 2) =>
    value === null || value === undefined ? "—" : value.toFixed(digits);
  const fmtPct = (value?: number | null, digits = 0) =>
    value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;
  const fmtStr = (value?: string | number | null) =>
    value === null || value === undefined || value === "" ? "—" : String(value);
  const fmtBool = (value?: boolean | null) =>
    value === null || value === undefined ? "—" : value ? "ja" : "nein";
  const getNumber = (value: unknown) => {
    const parsed =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
    return parsed === null || Number.isNaN(parsed) ? null : parsed;
  };
  const formatCountLabel = (key: string) => {
    if (/^\d+$/.test(key)) return `Track ${key}`;
    return key.split("_").join(" ");
  };
  const sortTrackEntries = <T,>(values: Record<string, T>) =>
    Object.entries(values).sort(([left], [right]) => {
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
        return leftNumber - rightNumber;
      }
      return left.localeCompare(right);
    });
  const formatTrackStringMap = (values: Record<string, string | null>) => {
    const entries = sortTrackEntries(values);
    if (!entries.length) return "—";
    return entries.map(([track, value]) => `T${track} ${fmtStr(value)}`).join(" / ");
  };
  const formatTrackNumberMap = (values: Record<string, number | null>) => {
    const entries = sortTrackEntries(values);
    if (!entries.length) return "—";
    return entries.map(([track, value]) => `T${track} ${fmtNum(value)}`).join(" / ");
  };
  const formatRetuningFlags = (
    weakSecondaryTrackFlag: boolean,
    agreementTensionFlag: boolean
  ) => {
    const flags = [
      weakSecondaryTrackFlag ? "schwacher Sekundaertrack" : null,
      agreementTensionFlag ? "Track-Spannung" : null,
    ].filter(Boolean);
    return flags.length ? flags.join(" / ") : "—";
  };
  const formatPenalty = (penalty: MlReliabilityPenalty) => {
    const trackSuffix = penalty.tracks.length ? ` T${penalty.tracks.join("/T")}` : "";
    const deltaSuffix =
      penalty.score_delta === null ? "" : ` (${penalty.score_delta.toFixed(2)})`;
    if (penalty.key === "weak_main_cluster_support") {
      return `schwache Hauptcluster-Stuetzung${trackSuffix}${deltaSuffix}`;
    }
    if (penalty.key === "weak_secondary_track_band_cap") {
      return `Bandgrenze ${penalty.cap_band || "—"}${trackSuffix}`;
    }
    if (penalty.key === "low_track_agreement") {
      return `niedrige Track-Uebereinstimmung${deltaSuffix}`;
    }
    if (penalty.key === "very_low_track_agreement_band_cap") {
      return `Bandgrenze ${penalty.cap_band || "—"}`;
    }
    return penalty.key.split("_").join(" ");
  };
  const formatPenaltySummary = (penalties: MlReliabilityPenalty[]) =>
    penalties.length ? penalties.map(formatPenalty).join(" / ") : "—";

  const formatRunTimestamp = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("de-AT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const formatRunLine = (run: MlBuildingRunSummary) =>
    `${fmtStr(run.dataset_id)} / ${run.track === null || run.track === undefined ? "alle Tracks" : `T${run.track}`}`;

  const formatLabelCounts = (counts: Record<string, number>) => {
    const orderedKeys = ["normal", "suspect", "outlier", "unlabeled"];
    const entries = [
      ...orderedKeys
        .filter((key) => counts[key] !== undefined)
        .map((key) => [key, counts[key]] as const),
      ...Object.entries(counts).filter(([key]) => !orderedKeys.includes(key)),
    ];
    return entries.length
      ? entries.map(([key, value]) => `${formatCountLabel(key)} ${value}`).join(" / ")
      : "—";
  };

  const activateBuildingRun = (runId: string) => {
    setActiveRunId(runId);
    setMlView("cluster");
    setActiveBuildingTab("ml");
  };

  const formatRawValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const renderMetric = (
    label: string,
    value: ReactNode,
    help?: string,
    metricKey?: string,
    attributeHint?: AttributeHint
  ) => {
    const hint = attributeHint ?? metricAttributeHints[label];
    const registryMetadata = hint ? getAttributeMetadata(hint.key, hint.context) : null;
    const helpMetadata: Pick<AttributeMetadata, "label" | "description" | "unit" | "source"> | null =
      help
        ? {
            label,
            description: help,
            unit: registryMetadata?.unit,
            source: registryMetadata?.source,
          }
        : registryMetadata;

    return (
      <div className="metric" key={metricKey}>
        <span className="label">
          <span>{label}</span>
          {helpMetadata && <HelpButton metadata={helpMetadata} />}
        </span>
        <span className="value">{value}</span>
      </div>
    );
  };

  const renderTabs = (
    tabs: InspectorTabConfig[],
    activeTab: InspectorTabId,
    onSelect: (tab: InspectorTabId) => void,
    ariaLabel: string
  ) => (
    <SegmentedTabs
      ariaLabel={ariaLabel}
      compact
      layout="grid"
      value={activeTab}
      onChange={(value) => onSelect(value as InspectorTabId)}
      options={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
    />
  );

  const renderRawDetails = (title: string, value: unknown) => (
    <details className="attribute-details">
      <summary>{title}</summary>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );

  const renderAttributeDetails = (
    attributes: Record<string, unknown>,
    context: AttributeContext
  ) => {
    const entries = Object.entries(attributes);
    if (entries.length === 0) {
      return <div className="pill">Keine dynamischen Attribute vorhanden.</div>;
    }
    return (
      <details className="attribute-details">
        <summary>Dynamische Attribute anzeigen ({entries.length})</summary>
        {entries.map(([key, value]) => {
          const metadata = getAttributeMetadata(key, context);
          return renderMetric(
            metadata.label,
            formatRawValue(value),
            undefined,
            `attribute-${key}`,
            { key, context }
          );
        })}
      </details>
    );
  };

  const renderActiveRunSummary = () => {
    if (!activeRunId) {
      return <div className="pill">Kein aktiver ML-Lauf ausgewaehlt.</div>;
    }
    if (!activeRunStatus && activeRunQuery.isLoading) {
      return <div className="pill">Status des aktiven ML-Laufs wird geladen...</div>;
    }
    return (
      <>
        {renderMetric("Aktiver Lauf", activeRunId)}
        {renderMetric("Run-Status", fmtStr(activeRunStatus))}
        {renderMetric("Pipeline", fmtStr(activeRunQuery.data?.pipeline))}
        {isActiveRunPending && (
          <div className="pill">Die Auswertung wird waehrend der Verarbeitung aktualisiert.</div>
        )}
      </>
    );
  };

  const renderPointOverview = () => {
    const point = pointQuery.data;
    if (!point) return null;
    const velocity = typeof point.velocity === "number" ? point.velocity : null;
    const velocityTone: SummaryMetricTone =
      velocity === null
        ? "neutral"
        : Math.abs(velocity) < 1
          ? "good"
          : Math.abs(velocity) < 3
            ? "warning"
            : "bad";
    const coherenceTone: SummaryMetricTone =
      typeof point.coherence !== "number"
        ? "neutral"
        : point.coherence >= 0.7
          ? "good"
          : point.coherence >= 0.4
            ? "warning"
            : "bad";
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 via-card to-card p-3">
          {(() => {
            const areaId = point.area_id ?? (selection?.type === "point" ? selection.areaId : null);
            const datasetId =
              point.dataset_id ?? (selection?.type === "point" ? selection.datasetId : null);
            const sensor = point.sensor ?? (selection?.type === "point" ? selection.sensor : null);
            return (
              <>
          <div className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
            Punkt
          </div>
          <div className="mt-0.5 break-all font-mono text-base font-bold text-foreground">
            {fmtStr(point.code)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {fmtStr(sensor)} Track {fmtStr(point.track)} · LOS {fmtStr(point.los)}
            {point.geometry?.lon !== undefined && point.geometry?.lat !== undefined && (
              <>
                {" · "}
                <span className="font-mono">
                  {Number(point.geometry.lat).toFixed(4)}, {Number(point.geometry.lon).toFixed(4)}
                </span>
              </>
            )}
          </div>
          {(areaId || datasetId) && (
            <div className="mt-1 break-all text-xs text-muted-foreground">
              AOI {fmtStr(point.area_label ?? areaId)} · Dataset {fmtStr(point.dataset_label ?? datasetId)}
            </div>
          )}
              </>
            );
          })()}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SummaryMetric
            label="Geschwindigkeit"
            value={fmtNum(point.velocity)}
            unit="mm/Jahr"
            tone={velocityTone}
            attributeKey="velocity"
            context="insar-point"
          />
          <SummaryMetric
            label="Kohärenz"
            value={fmtNum(point.coherence)}
            tone={coherenceTone}
            attributeKey="coherence"
            context="insar-point"
          />
          <SummaryMetric
            label="InSAR-Höhe"
            value={fmtNum(point.height, 1)}
            unit="m"
            attributeKey="height"
            context="insar-point"
          />
          <SummaryMetric
            label="Einfallswinkel"
            value={fmtNum(point.incidence_angle, 1)}
            unit="°"
            attributeKey="incidence_angle"
            context="insar-point"
          />
        </div>

        <div>
          <div className="section-title">Aktiver ML-Lauf</div>
          {renderActiveRunSummary()}
          {renderPointMlStatus()}
        </div>
      </div>
    );
  };

  const renderPointMetrics = () => {
    const point = pointQuery.data;
    if (!point) return null;
    const lon = point.geometry?.lon;
    const lat = point.geometry?.lat;
    return (
      <div>
        <div className="section-title">Messwerte</div>
        {renderMetric("Geschwindigkeit", `${fmtNum(point.velocity)} mm/Jahr`)}
        {renderMetric("Geschwindigkeit Std.", `${fmtNum(point.velocity_std)} mm/Jahr`)}
        {renderMetric("Beschleunigung", `${fmtNum(point.acceleration)} mm/Jahr²`)}
        {renderMetric("Beschleunigung Std.", `${fmtNum(point.acceleration_std)} mm/Jahr²`)}
        {renderMetric("Saisonale Amplitude", `${fmtNum(point.season_amp)} mm`)}
        {renderMetric("Saisonale Amplitude Std.", `${fmtNum(point.s_amp_std)} mm`)}
        {renderMetric("Saisonale Phase", fmtNum(point.season_phs))}
        {renderMetric("Saisonale Phase Std.", fmtNum(point.s_phs_std))}
        {renderMetric("Amplitude Mittel", fmtNum(point.amp_mean, 1))}
        {renderMetric("Amplitude Std.", fmtNum(point.amp_std, 1))}
        {renderMetric("Effektive Flaeche", fmtNum(point.eff_area, 1))}
        {renderMetric("Einfallswinkel", `${fmtNum(point.incidence_angle)} °`)}
        {renderMetric("Kohaerenz", fmtNum(point.coherence))}
        {renderMetric("InSAR-Hoehe", `${fmtNum(point.height, 1)} m`)}
        {renderMetric("Hoehe Std.", `${fmtNum(point.height_std, 1)} m`)}
        {renderMetric("Laengengrad", lon === null || lon === undefined ? "—" : lon.toFixed(6))}
        {renderMetric("Breitengrad", lat === null || lat === undefined ? "—" : lat.toFixed(6))}
        <div className="section-title">Terrain-Kontext</div>
        {point.terrain ? (
          <>
            {renderMetric("Terrain-Quelle", fmtStr(point.terrain.source))}
            {renderMetric("Terrain-Aufloesung", `${fmtNum(point.terrain.resolution_m, 1)} m`)}
            {renderMetric("Gelaendehoehe", `${fmtNum(point.terrain.elevation_m, 1)} m`)}
            {renderMetric("Hangneigung", `${fmtNum(point.terrain.slope_deg, 1)} °`)}
            {renderMetric("Exposition", `${fmtNum(point.terrain.aspect_deg, 1)} °`)}
          </>
        ) : (
          <div className="pill">Kein Terrain-Kontext fuer diesen Punkt vorhanden.</div>
        )}
      </div>
    );
  };

  const renderPointMlStatus = () => (
    <>
      {pointAnalysisRunId && mlPointAnalysisQuery.isLoading && (
        <div className="pill">Anomalieanalyse wird geladen...</div>
      )}
      {activeRunId && activeRunId !== pointAnalysisRunId && activeRunStatus !== "failed" && (
        <div className="pill">Aktiver Lauf verarbeitet diesen Punkt noch.</div>
      )}
      {activeRunId && activeRunStatus === "failed" && (
        <div className="pill warning">Aktiver Lauf ist fehlgeschlagen, bevor eine Punktanalyse verfuegbar war.</div>
      )}
      {pointAnalysisRunId === activeRunId && mlPointAnalysisStatus === "pending" && (
        <div className="pill">Aktiver Lauf verarbeitet diesen Punkt noch.</div>
      )}
      {pointAnalysisRunId === activeRunId &&
        mlPointAnalysisStatus === "missing" &&
        activeRunStatus !== "failed" && (
          <div className="pill warning">
            {mlPointAnalysisMessage || "Keine ML-Analyse fuer diesen Punkt im aktiven Lauf."}
          </div>
        )}
      {activeRunId &&
        activeRunStatus &&
        !isActiveRunPending &&
        activeRunStatus !== "failed" &&
        mlPointAnalysisQuery.isError && (
          <div className="pill warning">ML-Analyse fuer diesen Punkt konnte nicht geladen werden.</div>
        )}
    </>
  );

  const renderPointMl = () => (
    <div>
      <div className="section-title">Aktiver ML-Lauf</div>
      {renderActiveRunSummary()}
      {renderPointMlStatus()}
      {pointAnalysisRunId === activeRunId && mlPointAnalysis && (
        <>
          <div className="section-title">Punktanalyse</div>
          {renderMetric("Label", fmtStr(mlPointAnalysis.label))}
          {renderMetric("Qualitaetswert", fmtNum(mlPointAnalysis.quality_score))}
          {renderMetric("Anomaliewert", fmtNum(mlPointAnalysis.anomaly_score))}
          {renderMetric("Cross-Track-Konsistenz", fmtNum(mlPointAnalysis.cross_track_consistency))}
          {renderMetric(
            "Gebaeude",
            `${fmtStr(mlPointAnalysis.building_source).toUpperCase()} / ${fmtStr(mlPointAnalysis.building_id)}`
          )}
          {renderMetric("Abstand zum Gebaeude", `${fmtNum(mlPointAnalysis.distance_m, 1)} m`)}
          {renderMetric(
            "Clusterrolle / Wahrscheinlichkeit",
            `${fmtStr(mlPointAnalysis.cluster_role)} / ${fmtNum(mlPointAnalysis.cluster_probability)}`
          )}
          {renderMetric("Cluster-Ausreisserwert", fmtNum(mlPointAnalysis.cluster_outlier_score))}
          {renderMetric(
            "Fuer Scoring genutzt",
            mlPointAnalysis.kept_for_scoring === null
              ? "—"
              : mlPointAnalysis.kept_for_scoring
                ? "ja"
                : "nein"
          )}
          {renderMetric(
            "Gate-Gruende",
            mlPointAnalysis.gate_reasons.length > 0 ? mlPointAnalysis.gate_reasons.join(", ") : "—"
          )}
          <div className="section-title">Gebaeudekontext</div>
          {renderMetric(
            "Zuordnung",
            fmtStr(
              typeof mlPointAnalysis.building_context.assignment_method === "string"
                ? mlPointAnalysis.building_context.assignment_method
                : null
            )
          )}
          {renderMetric(
            "Track-Stuetzung",
            fmtNum(getNumber(mlPointAnalysis.building_context.track_point_count), 0)
          )}
          {renderMetric("Step-Stuetzung", fmtNum(getNumber(mlPointAnalysis.building_context.step_support)))}
          {renderMetric(
            "Detektorwerte",
            Object.entries(mlPointAnalysis.detector_scores)
              .map(([key, value]) => `${key} ${fmtNum(value)}`)
              .join(" / ") || "—"
          )}
          {renderMetric(
            "Degradierungsgrund",
            fmtStr(
              typeof mlPointAnalysis.feature_flags.degraded_reason === "string"
                ? mlPointAnalysis.feature_flags.degraded_reason
                : null
            )
          )}
          {showPointNeighbourhood && (
            <>
              <div className="section-title">Nachbarschaft</div>
              {renderMetric(
                "Kontext",
                mlPointNeighbourhood?.context_available
                  ? `${fmtNum(mlPointNeighbourhood.candidate_neighbour_count, 0)} Kandidaten / ${fmtNum(
                      mlPointNeighbourhood.eligible_neighbour_cluster_count,
                      0
                    )} geeignet`
                  : "nicht verfuegbar"
              )}
              {renderMetric(
                "Bester Nachbar",
                `${fmtStr(mlPointNeighbourhood?.best_neighbour_building_id)} / ${fmtStr(
                  mlPointNeighbourhood?.best_neighbour_cluster_id
                )}`
              )}
              {renderMetric(
                "Fit eigen / Nachbar / Delta",
                `${fmtNum(mlPointNeighbourhood?.own_cluster_fit_score)} / ${fmtNum(
                  mlPointNeighbourhood?.neighbour_fit_score
                )} / ${fmtNum(mlPointNeighbourhood?.neighbour_fit_delta)}`
              )}
              {renderMetric(
                "Fehlzuordnung / schwacher Eigenfit",
                `${fmtBool(mlPointNeighbourhood?.neighbour_misassignment_flag)} / ${fmtBool(
                  mlPointNeighbourhood?.own_fit_weak_flag
                )}`
              )}
              {renderMetric(
                "Nachbarereignis",
                `${fmtBool(mlPointNeighbourhood?.neighbour_event_flag)} / ${fmtNum(
                  mlPointNeighbourhood?.neighbour_event_score
                )} / ${fmtNum(mlPointNeighbourhood?.supporting_neighbour_count, 0)} Stuetzung`
              )}
            </>
          )}
          <div className="section-title">Wichtigste Gruende</div>
          {mlPointAnalysis.explain_top_features.length > 0 ? (
            mlPointAnalysis.explain_top_features.map((reason) =>
              renderMetric(
                reason.summary,
                fmtNum(reason.severity),
                "Beitrag zur Punktbewertung.",
                `reason-${reason.key}`
              )
            )
          ) : (
            <div className="pill">Keine Hauptgruende fuer diesen Punkt gespeichert.</div>
          )}
        </>
      )}
    </div>
  );

  const renderPointRaw = () => {
    const point = pointQuery.data;
    if (!point) return null;
    return (
      <div>
        <div className="section-title">Rohdaten</div>
        {renderRawDetails("Messpunkt-Datensatz anzeigen", point)}
      </div>
    );
  };

  const renderPointContent = () => {
    if (activePointTab === "metrics") return renderPointMetrics();
    if (activePointTab === "ml") return renderPointMl();
    if (activePointTab === "raw") return renderPointRaw();
    return renderPointOverview();
  };

  const renderReliabilityBadge = (band?: string | null) => {
    if (!band) {
      return <Badge variant="secondary">ohne Band</Badge>;
    }
    const variant = band === "high" ? "default" : band === "medium" ? "warning" : "destructive";
    return <Badge variant={variant}>{band}</Badge>;
  };

  const renderBuildingRunItem = (run: MlBuildingRunSummary, compact = false) => {
    const isActive = run.run_id === activeRunId;
    return (
      <div
        key={run.run_id}
        className={`rounded-md border p-2.5 ${
          isActive ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
            onClick={() => activateBuildingRun(run.run_id)}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="min-w-0 truncate text-sm font-bold text-foreground">
                Lokale Anomalieanalyse
              </span>
              {isActive && <Badge>aktiv</Badge>}
              {run.experiment_id && <Badge variant="secondary">{run.experiment_id}</Badge>}
            </span>
            <span className="mt-1 block break-all font-mono text-[11px] text-muted-foreground">
              {run.run_id}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {formatRunTimestamp(run.finished_at ?? run.created_at)} · {formatRunLine(run)}
            </span>
          </button>
          {!isActive && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => activateBuildingRun(run.run_id)}
              aria-label="ML-Lauf aktivieren"
              title="ML-Lauf aktivieren"
            >
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
          <div className="rounded-md border border-border bg-card px-2 py-1">
            <span className="block text-[10px] uppercase tracking-[0.7px] text-muted-foreground">
              Punkte
            </span>
            <span className="font-mono font-semibold">{run.point_count}</span>
          </div>
          <div className="rounded-md border border-border bg-card px-2 py-1">
            <span className="block text-[10px] uppercase tracking-[0.7px] text-muted-foreground">
              Cluster
            </span>
            <span className="font-mono font-semibold">
              {run.cluster_count} / {run.reliable_cluster_count}
            </span>
          </div>
          <div className="rounded-md border border-border bg-card px-2 py-1">
            <span className="block text-[10px] uppercase tracking-[0.7px] text-muted-foreground">
              Bewegung
            </span>
            <span className="font-mono font-semibold">{fmtNum(run.building_motion_mm_a)}</span>
          </div>
        </div>
        {!compact && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {renderReliabilityBadge(run.building_reliability_band)}
            <span>Labels: {formatLabelCounts(run.label_counts)}</span>
          </div>
        )}
      </div>
    );
  };

  const renderBuildingRunsCompact = () => {
    if (buildingRunsQuery.isLoading) {
      return <div className="pill">Gebaeude-Runs werden geladen...</div>;
    }
    if (buildingRunsQuery.isError) {
      return <div className="pill warning">Run-Historie konnte nicht geladen werden.</div>;
    }
    const runs = buildingRunsQuery.data ?? [];
    if (!runs.length) {
      return <div className="pill">Dieses Gebaeude ist in keinem abgeschlossenen ML-Lauf enthalten.</div>;
    }
    const preferredRun = runs.find((run) => run.run_id === activeRunId) ?? runs[0];
    return (
      <div className="grid gap-2">
        {renderBuildingRunItem(preferredRun, true)}
        {runs.length > 1 && (
          <button
            type="button"
            className="text-left text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
            onClick={() => setActiveBuildingTab("ml")}
          >
            {runs.length - 1} weitere ML-Runs in der Diagnose anzeigen
          </button>
        )}
      </div>
    );
  };

  const renderBuildingRunsFull = () => {
    if (buildingRunsQuery.isLoading) {
      return <div className="pill">Gebaeude-Runs werden geladen...</div>;
    }
    if (buildingRunsQuery.isError) {
      return <div className="pill warning">Run-Historie konnte nicht geladen werden.</div>;
    }
    const runs = buildingRunsQuery.data ?? [];
    if (!runs.length) {
      return <div className="pill">Dieses Gebaeude ist in keinem abgeschlossenen ML-Lauf enthalten.</div>;
    }
    return <div className="grid gap-2">{runs.map((run) => renderBuildingRunItem(run, true))}</div>;
  };

  const renderActiveBuildingRunCompact = () => {
    const runs = buildingRunsQuery.data ?? [];
    const run = runs.find((candidate) => candidate.run_id === activeRunId);
    if (run) {
      return renderBuildingRunItem(run, true);
    }
    return renderActiveRunSummary();
  };

  const renderBuildingOverview = () => {
    const building = buildingDetailQuery.data;
    const analysis = mlBuildingAnalysis;
    if (!building) return null;
    return (
      <div>
        <div className="section-title">Gebaeude-Kurzueberblick</div>
        {renderMetric("Quelle", building.source.toUpperCase(), "Datenquelle des Gebaeudeobjekts.")}
        {renderMetric("Gebaeude-ID", building.id)}
        {renderMetric("Gebaeudehoehe", building.height === null ? "—" : `${building.height.toFixed(1)} m`)}
        {renderMetric("Name", fmtStr(building.name))}
        {renderMetric("Typ", fmtStr(building.building_type))}
        <div className="section-title">ML-Runs fuer dieses Gebaeude</div>
        {renderBuildingRunsCompact()}
        <div className="section-title">Aktiver ML-Befund</div>
        {analysis ? (
          <>
            {renderMetric("Bewegung", `${fmtNum(analysis.building_motion_mm_a)} mm/Jahr`)}
            {renderMetric(
              "Zuverlaessigkeit",
              `${fmtNum(analysis.building_reliability_score)} / ${fmtStr(analysis.building_reliability_band)}`
            )}
            {renderMetric("Status", fmtStr(analysis.building_status))}
            {renderMetric(
              "Punkte behalten / ausgeschlossen / Rauschen",
              `${analysis.kept_point_count} / ${analysis.excluded_point_count} / ${analysis.noise_point_count}`
            )}
            {activeRunId && mlBuildingAnalysisQuery.isLoading && (
              <div className="pill">Gebaeudeanalyse des aktiven Laufs wird geladen...</div>
            )}
          </>
        ) : (
          <>
            {renderActiveRunSummary()}
            {activeRunId && mlBuildingAnalysisQuery.isLoading && (
              <div className="pill">Gebaeudeanalyse des aktiven Laufs wird geladen...</div>
            )}
            {activeRunId && mlBuildingAnalysisQuery.isError && !isActiveRunPending && (
              <div className="pill warning">Gebaeudeanalyse des aktiven Laufs konnte nicht geladen werden.</div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderBuildingMetrics = () => {
    const building = buildingDetailQuery.data;
    if (!building) return null;
    return (
      <div>
        <div className="section-title">Terrain-Kontext</div>
        {building.terrain ? (
          <>
            {renderMetric("Terrain-Quelle", fmtStr(building.terrain.source))}
            {renderMetric("Terrain-Aufloesung", `${fmtNum(building.terrain.resolution_m, 1)} m`)}
            {renderMetric("Mittlere Gelaendehoehe", `${fmtNum(building.terrain.elevation_mean_m, 1)} m`)}
            {renderMetric(
              "Gelaendehoehe min/max",
              `${fmtNum(building.terrain.elevation_min_m, 1)} / ${fmtNum(
                building.terrain.elevation_max_m,
                1
              )} m`
            )}
            {renderMetric(
              "Hangneigung Mittel / Max",
              `${fmtNum(building.terrain.slope_mean_deg, 1)} / ${fmtNum(
                building.terrain.slope_max_deg,
                1
              )} °`
            )}
            {renderMetric("Reliefspanne", `${fmtNum(building.terrain.relief_range_m, 1)} m`)}
          </>
        ) : (
          <div className="pill">Kein Terrain-Kontext fuer dieses Gebaeude vorhanden.</div>
        )}
        <div className="section-title">Attribute</div>
        {renderAttributeDetails(building.attributes || {}, building.source)}
      </div>
    );
  };

  const renderClusterPointList = (cluster: MlBuildingClusterSummary) => {
    if (mlBuildingPointsQuery.isLoading) {
      return <div className="mt-2 text-xs text-muted-foreground">Punktliste wird geladen...</div>;
    }
    const points = buildingPointsByCluster.get(cluster.cluster_id) ?? [];
    if (!points.length) {
      return <div className="mt-2 text-xs text-muted-foreground">Keine Punktliste fuer dieses Cluster geladen.</div>;
    }
    const labelCounts = points.reduce<Record<string, number>>((acc, point) => {
      const label = typeof point.label === "string" && point.label ? point.label : "unlabeled";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
    return (
      <details className="mt-2 rounded-md border border-border bg-card px-2 py-1.5">
        <summary className="cursor-pointer text-xs font-semibold text-foreground">
          {points.length} Punkte anzeigen · {formatLabelCounts(labelCounts)}
        </summary>
        <div className="mt-2 grid max-h-48 gap-1 overflow-auto pr-1">
          {points.map((point) => {
            const code = fmtStr(point.code as string | number | null | undefined);
            const track = fmtStr(point.track as string | number | null | undefined);
            const quality = getNumber(point.quality_score);
            const anomaly = getNumber(point.anomaly_score);
            const label = fmtStr(point.label as string | number | null | undefined);
            return (
              <div
                key={`${code}-${track}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-sm border border-border/70 bg-secondary px-2 py-1 text-xs"
              >
                <span className="min-w-0 break-all font-mono text-foreground">
                  {code} · T{track}
                </span>
                <span className="font-mono text-muted-foreground">
                  {label} · Q {fmtNum(quality)} · A {fmtNum(anomaly)}
                </span>
              </div>
            );
          })}
        </div>
      </details>
    );
  };

  const renderBuildingClusterControls = (analysis: MlBuildingAnalysis) => {
    if (!isActiveLocalAnomalyRun || !mlBuildingAnalysis || selection?.type !== "building") {
      return null;
    }
    const clusters = analysis.clusters;
    const clusterIds = clusters.map((cluster) => cluster.cluster_id);
    const clusterPointCount = clusters
      .filter((cluster) => cluster.cluster_role === "core")
      .reduce((sum, cluster) => sum + cluster.point_count, 0);
    const visibleSet =
      mlBuildingVisibleClusterIds === null ? null : new Set(mlBuildingVisibleClusterIds);
    const effectiveShowExcluded =
      mlBuildingPointFocusMode === "scored" || mlBuildingPointFocusMode === "cluster"
        ? false
        : mlBuildingShowExcluded;
    const effectiveShowNoise =
      mlBuildingPointFocusMode === "cluster" ? false : mlBuildingShowNoise;
    const isClusterVisible = (cluster: MlBuildingClusterSummary) =>
      (mlBuildingPointFocusMode !== "cluster" || cluster.cluster_role === "core") &&
      (visibleSet === null || visibleSet.has(cluster.cluster_id)) &&
      (effectiveShowNoise || cluster.cluster_role !== "noise");
    const visibleClusterCount = clusters.filter(isClusterVisible).length;
    const mainClusterIds = new Set(
      clusters.filter((cluster) => cluster.is_main_cluster).map((cluster) => cluster.cluster_id)
    );
    const isClusterFilterActive = mlBuildingVisibleClusterIds !== null;
    const hasNoisePoints = analysis.noise_point_count > 0;
    const focusOptions = buildingPointFocusOptions.map((option) => ({
      ...option,
      count:
        option.id === "building"
          ? analysis.point_count
          : option.id === "scored"
            ? analysis.kept_point_count
            : option.id === "cluster"
              ? clusterPointCount
              : undefined,
    }));
    return (
      <>
        <div className="section-title">Gebaeude-Clusteransicht</div>
        <div className="flex flex-wrap gap-2">
          <div className="pill">
            {clusters.length
              ? `${visibleClusterCount} von ${clusters.length} Clustern sichtbar`
              : "Keine Cluster fuer diesen aktiven Lauf vorhanden."}
          </div>
          {mlBuildingPointFocusMode === "run" && (
            <div className="pill">Alle Run-Punkte im Hintergrund sichtbar</div>
          )}
          {mlBuildingPointFocusMode !== "run" && (
            <div className="pill">Nur fokussierte Gebaeudepunkte sichtbar</div>
          )}
          {!effectiveShowNoise && <div className="pill warning">Rauschen ausgeblendet</div>}
          {!effectiveShowExcluded && (
            <div className="pill warning">Gate-ausgeschlossene Punkte ausgeblendet</div>
          )}
        </div>
        <div className="space-y-1.5 my-2">
          <UiLabel>Kartenfokus</UiLabel>
          <SegmentedTabs
            options={focusOptions}
            value={mlBuildingPointFocusMode}
            onChange={setMlBuildingPointFocusMode}
            ariaLabel="Kartenfokus fuer Gebaeude-ML-Punkte"
            compact
            layout="grid"
          />
        </div>
        <div className="space-y-1.5 my-2">
          <UiLabel htmlFor="track-filter-select">Track-Filter</UiLabel>
          <Select
            value={mlBuildingTrackFilter}
            onValueChange={(value) =>
              setMlBuildingTrackFilter(value as MlBuildingTrackFilter)
            }
          >
            <SelectTrigger id="track-filter-select">
              <SelectValue placeholder="Track-Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Tracks</SelectItem>
              {mlBuildingTrackOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
          <span className="min-w-0 text-sm leading-snug text-foreground">
            Gate-ausgeschlossene Punkte anzeigen
          </span>
          <Switch
            checked={effectiveShowExcluded}
            onCheckedChange={setMlBuildingShowExcluded}
            disabled={mlBuildingPointFocusMode === "scored" || mlBuildingPointFocusMode === "cluster"}
          />
        </label>
        <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
          <span className="min-w-0 text-sm leading-snug text-foreground">
            Cluster-Huellen anzeigen
          </span>
          <Switch
            checked={mlBuildingShowHulls}
            onCheckedChange={setMlBuildingShowHulls}
          />
        </label>
        {clusters.length > 0 && (
          <div className="mt-3 grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={resetMlBuildingClusterVisibility}
                disabled={
                  !isClusterFilterActive &&
                  (mlBuildingPointFocusMode === "cluster" || effectiveShowNoise)
                }
              >
                <RotateCcw aria-hidden="true" />
                Alle anzeigen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setMlBuildingVisibleClusterIds(
                    clusterIds.filter((clusterId) => mainClusterIds.has(clusterId))
                  )
                }
                disabled={mainClusterIds.size === 0}
              >
                <Star aria-hidden="true" />
                Nur Hauptcluster
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setMlBuildingShowNoise(!mlBuildingShowNoise)}
                disabled={!hasNoisePoints || mlBuildingPointFocusMode === "cluster"}
              >
                {effectiveShowNoise ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
                {effectiveShowNoise ? "Rauschen ausblenden" : "Rauschen anzeigen"}
              </Button>
            </div>
            <div className="grid gap-2">
              {clusters.map((cluster) => {
                const isVisible = isClusterVisible(cluster);
                return (
                  <div
                    key={`${cluster.track}-${cluster.cluster_id}`}
                    className={`rounded-md border p-2.5 ${
                      isVisible ? "border-border bg-card" : "border-border bg-secondary/60 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
                        <span
                          className="mt-1 h-3.5 w-3.5 rounded-sm border border-white shadow-sm"
                          style={{ backgroundColor: clusterColor(cluster) }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="min-w-0 break-all font-mono text-xs font-bold text-foreground">
                              {cluster.cluster_id}
                            </span>
                            {cluster.is_main_cluster && <Badge>Hauptcluster</Badge>}
                            <Badge variant="secondary">T{cluster.track}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {cluster.cluster_role} · Rang {fmtStr(cluster.cluster_rank)}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant={isVisible ? "outline" : "secondary"}
                        className="h-8 w-8"
                        onClick={() =>
                          toggleMlBuildingClusterVisibility(cluster.cluster_id, clusterIds)
                        }
                        aria-label={isVisible ? "Cluster ausblenden" : "Cluster anzeigen"}
                        title={isVisible ? "Cluster ausblenden" : "Cluster anzeigen"}
                      >
                        {isVisible ? (
                          <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setMlBuildingVisibleClusterIds([cluster.cluster_id]);
                          if (cluster.cluster_role === "noise") {
                            setMlBuildingShowNoise(true);
                          }
                        }}
                      >
                        <Star aria-hidden="true" />
                        Nur dieses Cluster
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                      <div className="rounded-sm bg-secondary px-2 py-1">
                        <span className="block text-[10px] uppercase tracking-[0.7px] text-muted-foreground">
                          Punkte
                        </span>
                        <span className="font-mono font-semibold">{cluster.point_count}</span>
                      </div>
                      <div className="rounded-sm bg-secondary px-2 py-1">
                        <span className="block text-[10px] uppercase tracking-[0.7px] text-muted-foreground">
                          Bewegung
                        </span>
                        <span className="font-mono font-semibold">
                          {fmtNum(cluster.median_vertical_proxy_mm_a)}
                        </span>
                      </div>
                      <div className="rounded-sm bg-secondary px-2 py-1">
                        <span className="block text-[10px] uppercase tracking-[0.7px] text-muted-foreground">
                          Rel.
                        </span>
                        <span className="font-mono font-semibold">
                          {fmtNum(cluster.cluster_reliability_score)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                      <div>
                        Delta zum Hauptcluster:{" "}
                        <span className="font-mono text-foreground">
                          {fmtNum(cluster.motion_delta_to_main_mm_a)} mm/Jahr
                        </span>
                      </div>
                      <div>
                        Nachbarstuetzung:{" "}
                        <span className="font-mono text-foreground">
                          {cluster.supporting_neighbour_building_count} Gebaeude
                        </span>
                      </div>
                    </div>
                    {renderClusterPointList(cluster)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderBuildingMl = () => {
    const analysis = mlBuildingAnalysis;
    const runHistoryCount = buildingRunsQuery.data?.length ?? 0;
    return (
      <div>
        <div className="section-title">Aktiver ML-Lauf</div>
        {renderActiveBuildingRunCompact()}
        {activeRunId && mlBuildingAnalysisQuery.isLoading && (
          <div className="pill">Gebaeudeanalyse des aktiven Laufs wird geladen...</div>
        )}
        {activeRunId && mlBuildingAnalysisQuery.isError && !isActiveRunPending && (
          <div className="pill warning">Gebaeudeanalyse des aktiven Laufs konnte nicht geladen werden.</div>
        )}
        {analysis && (
          <>
            {renderBuildingClusterControls(analysis)}
            {isActiveRunPending && (
              <div className="pill">Diese Zusammenfassung aktualisiert sich waehrend der aktive Lauf verarbeitet wird.</div>
            )}
            {analysis.point_count === 0 ? (
              <div className="pill">Keine Punkte aus dem aktiven Lauf sind diesem Gebaeude zugeordnet.</div>
            ) : (
              <>
                <div className="section-title">Gebaeudebefund</div>
                {renderMetric("Run-zugeordnete Punkte", analysis.point_count)}
                {renderMetric(
                  "Behalten / ausgeschlossen / Rauschen",
                  `${analysis.kept_point_count} / ${analysis.excluded_point_count} / ${analysis.noise_point_count}`
                )}
                {renderMetric(
                  "Bewegung / Status",
                  `${fmtNum(analysis.building_motion_mm_a)} mm/Jahr / ${fmtStr(analysis.building_status)}`
                )}
                {renderMetric(
                  "Zuverlaessigkeit",
                  `${fmtNum(analysis.building_reliability_score)} / ${fmtStr(analysis.building_reliability_band)}`
                )}
                {renderMetric("Track-Uebereinstimmung", fmtNum(analysis.track_agreement_score))}
                {renderMetric(
                  "Hauptcluster",
                  formatTrackStringMap(analysis.main_cluster_by_track)
                )}
                {renderMetric(
                  "Track-Bewegung",
                  formatTrackNumberMap(analysis.track_motion_mm_a)
                )}
                {renderMetric("Median-Abstand", `${fmtNum(analysis.median_distance_m, 1)} m`)}
                {renderMetric("Mittlere Qualitaet", fmtNum(analysis.avg_quality_score))}
                {renderMetric("Mittlere Anomalie", fmtNum(analysis.avg_anomaly_score))}
                {renderMetric("Mittlere Cross-Track-Konsistenz", fmtNum(analysis.avg_cross_track_consistency))}
                <CollapsibleSection
                  title="Nachbarschaft und Retuning"
                  defaultOpen={false}
                  key={`neighbour-${selectionKey}-${activeRunId ?? "none"}`}
                >
                  {renderMetric(
                    "Retuning-Flags",
                    formatRetuningFlags(analysis.weak_secondary_track_flag, analysis.agreement_tension_flag)
                  )}
                  {renderMetric("Retuning-Anpassungen", formatPenaltySummary(analysis.reliability_penalties))}
                  {renderMetric("Cluster / belastbar", `${analysis.cluster_count} / ${analysis.reliable_cluster_count}`)}
                  {renderMetric("Differenzielle Bewegung", analysis.differential_motion_flag ? "ja" : "nein")}
                  {renderMetric(
                    "Kontext",
                    `${analysis.neighbour_context_available ? "ja" : "nein"} / ${
                      analysis.neighbour_candidate_building_count
                    } Kandidaten`
                  )}
                  {renderMetric(
                    "Fehlzuordnungspunkte",
                    `${analysis.neighbour_misassignment_point_count} / ${fmtPct(
                      analysis.neighbour_misassignment_share,
                      1
                    )}`
                  )}
                  {renderMetric(
                    "Nachbarereignis",
                    `${analysis.neighbour_event_flag ? "ja" : "nein"} / ${fmtNum(
                      analysis.neighbour_event_score
                    )}`
                  )}
                  {renderMetric(
                    "Konsistenz / Stuetzung",
                    `${fmtNum(analysis.neighbour_consistency_score)} / ${analysis.supporting_neighbour_count} Nachb. / T${analysis.supporting_track_count}`
                  )}
                </CollapsibleSection>
                <CollapsibleSection
                  title="Verteilungen"
                  defaultOpen={false}
                  key={`distributions-${selectionKey}-${activeRunId ?? "none"}`}
                >
                  <div className="section-title">Track-Anzahlen</div>
                  {Object.entries(analysis.track_counts).map(([key, value]) =>
                    renderMetric(formatCountLabel(key), value, undefined, `track-${key}`)
                  )}
                  <div className="section-title">Label-Anzahlen</div>
                  {Object.entries(analysis.label_counts).map(([key, value]) =>
                    renderMetric(formatCountLabel(key), value, undefined, `label-${key}`)
                  )}
                  <div className="section-title">Zuordnungsmethoden</div>
                  {Object.entries(analysis.assignment_methods).map(([key, value]) =>
                    renderMetric(formatCountLabel(key), value, undefined, `assignment-${key}`)
                  )}
                </CollapsibleSection>
                <CollapsibleSection
                  title={`Punkte mit niedrigster Qualitaet (${analysis.top_points.length})`}
                  defaultOpen={false}
                  key={`top-points-${selectionKey}-${activeRunId ?? "none"}`}
                >
                  {analysis.top_points.map((point) =>
                    renderMetric(
                      `${point.code} / ${point.track} / ${fmtStr(point.cluster_role)}`,
                      `Q ${fmtNum(point.quality_score)} / A ${fmtNum(point.anomaly_score)}`,
                      undefined,
                      `top-point-${point.code}-${point.track}`
                    )
                  )}
                </CollapsibleSection>
              </>
            )}
          </>
        )}
        <CollapsibleSection
          title="Run-Historie dieses Gebaeudes"
          defaultOpen={false}
          key={`run-history-${selectionKey}`}
          aside={runHistoryCount > 0 ? `${runHistoryCount}` : undefined}
        >
          {renderBuildingRunsFull()}
        </CollapsibleSection>
      </div>
    );
  };

  const renderBuildingRaw = () => {
    const building = buildingDetailQuery.data;
    const analysis = mlBuildingAnalysis;
    if (!building) return null;
    return (
      <div>
        <div className="section-title">Rohdaten</div>
        {renderRawDetails("Gebaeudeattribute anzeigen", building.attributes || {})}
        {renderRawDetails("Gebaeudegeometrie anzeigen", building.geometry)}
        {analysis && renderRawDetails("ML-Gebaeudeanalyse anzeigen", analysis)}
      </div>
    );
  };

  const renderBuildingContent = () => {
    if (activeBuildingTab === "metrics") return renderBuildingMetrics();
    if (activeBuildingTab === "ml") return renderBuildingMl();
    if (activeBuildingTab === "raw") return renderBuildingRaw();
    return renderBuildingOverview();
  };

  return (
    <div className="panel panel-right">
      <div>
        <h2>Inspektor</h2>
        <small>Punkt oder Gebaeude auswaehlen, um Messwerte und Diagnostik zu pruefen.</small>
      </div>

      {!selection && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="rounded-lg border border-border bg-gradient-to-br from-primary/8 via-card to-card p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-lg font-bold text-primary">
                ?
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-bold text-foreground">
                  Noch keine Auswahl
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Klicken Sie einen InSAR-Punkt oder ein Gebäude auf der Karte, um
                  Messwerte, Terrain-Kontext und ML-Diagnostik zu sehen.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              So nutzen Sie den Viewer
            </div>
            {[
              {
                n: "1",
                title: "Punkt anklicken",
                desc: "Zeigt Geschwindigkeit, Kohärenz, Terrain und (falls aktiv) ML-Analyse.",
              },
              {
                n: "2",
                title: "Gebäude anklicken",
                desc: "Zeigt Quelle, Höhe, Terrain und ML-Gebäudeanalyse des aktiven Laufs.",
              },
              {
                n: "3",
                title: "Auswertung starten",
                desc: "Tab Auswertung links: berechnet ML-Cluster für den sichtbaren Kartenausschnitt.",
              },
              {
                n: "4",
                title: "Filter setzen",
                desc: "Tab Karte links: Track-Auswahl, Geschwindigkeitsbereich, Kohärenzschwelle.",
              },
            ].map((item) => (
              <div
                key={item.n}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-xs"
              >
                <span className="mt-0.5 inline-grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {item.n}
                </span>
                <span className="leading-snug">
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <span className="block text-muted-foreground">{item.desc}</span>
                </span>
              </div>
            ))}
          </div>

          {activeRunId && (
            <div className="mt-auto rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-xs">
              <div className="text-[10px] font-bold uppercase tracking-[1px] text-primary">
                Aktiver ML-Lauf
              </div>
              <div className="break-all font-mono text-[11px] text-muted-foreground">
                {activeRunId}
              </div>
            </div>
          )}
        </div>
      )}

      {selection?.type === "point" && (
        <>
          {pointQuery.isLoading && <div className="pill">Punkt wird geladen...</div>}
          {pointQuery.data && (
            <>
              {renderTabs(pointTabs, activePointTab, setActivePointTab, "Punkt-Inspektor")}
              {renderPointContent()}
            </>
          )}
        </>
      )}

      {selection?.type === "building" && (
        <>
          {buildingDetailQuery.isLoading && <div className="pill">Gebaeude wird geladen...</div>}
          {buildingDetailQuery.data && (
            <>
              {renderTabs(buildingTabs, activeBuildingTab, setActiveBuildingTab, "Gebaeude-Inspektor")}
              {renderBuildingContent()}
            </>
          )}

        </>
      )}
    </div>
  );
}
