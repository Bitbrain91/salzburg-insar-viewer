import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Play, X } from "lucide-react";
import {
  useAppStore,
  type MlBuildingFocusPoint,
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
  type BuildingAddress,
  type MlBuildingAnalysis,
  type MlBuildingClusterSummary,
  type MlBuildingRunSummary,
} from "../hooks/useApi";
import {
  Badge,
  Button,
  CollapsibleSection,
  EmptyState,
  HelpButton,
  SegmentedTabs,
  SummaryMetric,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label as UiLabel,
  type SummaryMetricTone,
} from "./ui";
import {
  getAttributeMetadata,
  type AttributeContext,
  type AttributeMetadata,
} from "../lib/attributeMetadata";
import {
  fmtBool,
  fmtNum,
  fmtPct,
  fmtStr,
  formatAssignmentMethod,
  formatCountLabel,
  formatDifferentialMotionLevel,
  formatFocusDetectorKey,
  formatFocusReasonKey,
  formatLabelCounts,
  formatPenaltySummary,
  formatRawValue,
  formatRetuningFlags,
  formatRunTimestamp,
} from "../lib/formatters";
import { metricAttributeHints, type AttributeHint } from "../lib/metricHints";
import {
  getTrackVisibilityKey,
  normalizeAppConfig,
} from "../lib/configMetadata";
import { RunInspector } from "./runs/RunInspector";
import { BuildingBefund } from "./inspector/building/BuildingBefund";
import { PointVerdict } from "./inspector/point/PointVerdict";
import { GlossarSheet } from "./inspector/shared/GlossarSheet";
import { WhyPanel, type WhyReason } from "./inspector/shared/WhyPanel";
import { deriveRunTitle } from "../lib/runName";
import { buildGoogleEarthUrlForGeometry } from "../lib/googleEarth";
import {
  V3_ANNEX_CLASSIFICATION_NOTE,
  formatMlClusterKindForModel,
  isV3ModelSetVersion,
  type MlClusterKind,
} from "../lib/mlClusterKind";

type InspectorTabId = "befund" | "details" | "raw";

type InspectorTabConfig = {
  id: InspectorTabId;
  label: string;
};

const pointTabs: InspectorTabConfig[] = [
  { id: "befund", label: "Befund" },
  { id: "details", label: "Details" },
  { id: "raw", label: "Rohdaten" },
];

const buildingTabs: InspectorTabConfig[] = [
  { id: "befund", label: "Befund" },
  { id: "details", label: "Details" },
  { id: "raw", label: "Rohdaten" },
];


const clusteringFeatureLabels: Array<{ key: string; label: string; unit?: string; digits?: number }> = [
  { key: "along_look_offset_m", label: "Look-Laengsversatz", unit: "m", digits: 1 },
  { key: "cross_look_offset_m", label: "Look-Querversatz", unit: "m", digits: 1 },
  { key: "height_rank_in_building", label: "Hoehenrang im Gebaeude", digits: 2 },
  { key: "velocity", label: "Geschwindigkeit", unit: "mm/Jahr", digits: 2 },
  { key: "acceleration", label: "Beschleunigung", unit: "mm/Jahr²", digits: 2 },
  { key: "coherence_penalty", label: "Kohaerenz-Penalty", digits: 2 },
];

const focusAssignmentReasonKeys = new Set(["nearest_assignment"]);


type BuildingSelection = Extract<NonNullable<Selection>, { type: "building" }>;
type EarthLosTrackOption = {
  key: string;
  label: string;
  lookBearingDeg: number;
  incidenceDeg: number;
};

type LocalDeviationBreakdownItem = {
  key: string;
  label: string;
  value: number | null;
  unit?: string;
  median?: number | null;
  scale?: number | null;
  z?: number | null;
  component: number;
  detail: string;
};

type LocalDeviationBreakdown = {
  items: LocalDeviationBreakdownItem[];
  topItem: LocalDeviationBreakdownItem | null;
  note?: string;
};

const EARTH_LOS_FALLBACK_INCIDENCE_DEG = 45;
const EARTH_LOS_MIN_DISTANCE_M = 120;
const EARTH_LOS_MAX_DISTANCE_M = 360;
const EARTH_LOS_DISTANCE_MULTIPLIER = 2.8;
const EARTH_TOP_VIEW_KEY = "top";

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


export default function InspectorPanel() {
  const selection = useAppStore((state) => state.selection);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const inspectedRunId = useAppStore((state) => state.inspectedRunId);
  const setActiveRunId = useAppStore((state) => state.setActiveRunId);
  const setSelection = useAppStore((state) => state.setSelection);
  const setActiveLeftTab = useAppStore((state) => state.setActiveLeftTab);
  const selectedMlBuildingFocusPoint = useAppStore(
    (state) => state.selectedMlBuildingFocusPoint
  );
  const selectMlBuildingFocusPoint = useAppStore(
    (state) => state.selectMlBuildingFocusPoint
  );
  const clearSelectedMlBuildingFocusPoint = useAppStore(
    (state) => state.clearSelectedMlBuildingFocusPoint
  );
  const clearMlBuildingFocus = useAppStore((state) => state.clearMlBuildingFocus);
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
  const [activePointTab, setActivePointTab] = useState<InspectorTabId>("befund");
  const [activeBuildingTab, setActiveBuildingTab] = useState<InspectorTabId>("befund");
  const [glossarOpen, setGlossarOpen] = useState(false);
  const [earthViewKey, setEarthViewKey] = useState<string>(EARTH_TOP_VIEW_KEY);
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
  const appConfig = useMemo(() => normalizeAppConfig(configQuery.data), [configQuery.data]);
  const hasResolvedActiveRun =
    Boolean(activeRunId) && activeRunQuery.data?.run_id === activeRunId;
  const activeRunStatus = hasResolvedActiveRun ? activeRunQuery.data?.status : undefined;
  const isActiveRunPending = activeRunStatus === "queued" || activeRunStatus === "running";
  const isActiveLocalAnomalyRun =
    hasResolvedActiveRun && activeRunQuery.data?.pipeline === "anomaly_local_v1";
  const mlBuildingTrackOptions =
    selectedBuilding
      ? appConfig.datasets
          .filter(
            (dataset) =>
              dataset.areaId === selectedBuilding.areaId &&
              dataset.id === activeRunQuery.data?.dataset_id
          )
          .flatMap((dataset) =>
            dataset.tracks.map((track) => ({
              value: getTrackVisibilityKey(dataset.id, track.track) as MlBuildingTrackFilter,
              label: `${track.sensor} Track ${track.track}${track.los ? ` ${track.los}` : ""}`,
            }))
          )
      : [];
  const earthLosTrackOptions = useMemo<EarthLosTrackOption[]>(() => {
    if (!selectedBuilding) return [];
    const datasetLabels = new Map(
      appConfig.datasets.map((dataset) => [dataset.id, dataset.label])
    );
    return appConfig.tracks
      .filter(
        (track) =>
          track.areaId === selectedBuilding.areaId &&
          typeof track.lookBearingDeg === "number"
      )
      .map((track) => ({
        key: getTrackVisibilityKey(track.datasetId, track.track),
        label: `${track.sensor} Track ${track.track}${track.los ? ` ${track.los}` : ""} · ${
          datasetLabels.get(track.datasetId) ?? track.datasetId
        }`,
        lookBearingDeg: track.lookBearingDeg as number,
        incidenceDeg: track.defaultIncidenceDeg ?? EARTH_LOS_FALLBACK_INCIDENCE_DEG,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "de"));
  }, [appConfig.datasets, appConfig.tracks, selectedBuilding?.areaId]);
  const selectedEarthLosTrack =
    earthViewKey === EARTH_TOP_VIEW_KEY
      ? null
      : earthLosTrackOptions.find((option) => option.key === earthViewKey) ?? null;
  const selectedEarthViewKey =
    earthViewKey === EARTH_TOP_VIEW_KEY || selectedEarthLosTrack
      ? earthViewKey
      : EARTH_TOP_VIEW_KEY;
  const selectedBuildingFocusPoint =
    selectedMlBuildingFocusPoint &&
    selectedBuilding &&
    selectedMlBuildingFocusPoint.runId === activeRunId &&
    selectedMlBuildingFocusPoint.buildingSource === selectedBuilding.source &&
    selectedMlBuildingFocusPoint.buildingId === selectedBuilding.id &&
    selectedMlBuildingFocusPoint.areaId === selectedBuilding.areaId
      ? selectedMlBuildingFocusPoint
      : null;

  useEffect(() => {
    setActivePointTab("befund");
    setActiveBuildingTab("befund");
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

  useEffect(() => {
    if (selectedBuildingFocusPoint && selectedBuildingFocusPoint === selectedMlBuildingFocusPoint) {
      setActiveBuildingTab("befund");
    }
  }, [selectedBuildingFocusPoint, selectedMlBuildingFocusPoint]);

  useEffect(() => {
    if (!selectedMlBuildingFocusPoint) return;
    if (activeRunId && selectedMlBuildingFocusPoint.runId !== activeRunId) {
      clearSelectedMlBuildingFocusPoint();
      return;
    }
    if (
      selectedBuilding &&
      (selectedMlBuildingFocusPoint.buildingSource !== selectedBuilding.source ||
        selectedMlBuildingFocusPoint.buildingId !== selectedBuilding.id ||
        selectedMlBuildingFocusPoint.areaId !== selectedBuilding.areaId)
    ) {
      clearSelectedMlBuildingFocusPoint();
    }
  }, [
    activeRunId,
    clearSelectedMlBuildingFocusPoint,
    selectedBuilding?.areaId,
    selectedBuilding?.id,
    selectedBuilding?.source,
    selectedMlBuildingFocusPoint,
  ]);

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
  const buildingGoogleEarthUrl = useMemo(() => {
    const building = buildingDetailQuery.data;
    if (!building) return null;
    return buildGoogleEarthUrlForGeometry(
      building.geometry,
      building.terrain?.elevation_mean_m ?? null
    );
  }, [buildingDetailQuery.data]);
  const buildingGoogleEarthLosUrl = useMemo(() => {
    const building = buildingDetailQuery.data;
    if (!building || !selectedEarthLosTrack) return null;
    return buildGoogleEarthUrlForGeometry(
      building.geometry,
      building.terrain?.elevation_mean_m ?? null,
      {
        headingDeg: selectedEarthLosTrack.lookBearingDeg,
        tiltDeg: selectedEarthLosTrack.incidenceDeg,
        minDistanceM: EARTH_LOS_MIN_DISTANCE_M,
        maxDistanceM: EARTH_LOS_MAX_DISTANCE_M,
        distanceMultiplier: EARTH_LOS_DISTANCE_MULTIPLIER,
      }
    );
  }, [buildingDetailQuery.data, selectedEarthLosTrack]);
  const selectedBuildingGoogleEarthUrl =
    selectedEarthViewKey === EARTH_TOP_VIEW_KEY
      ? buildingGoogleEarthUrl
      : buildingGoogleEarthLosUrl;

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
  const selectedBuildingFocusPointAnalysisQuery = useQuery({
    queryKey: [
      "ml-building-focus-point-analysis",
      selectedBuildingFocusPoint?.runId ?? null,
      selectedBuildingFocusPoint?.code ?? null,
      selectedBuildingFocusPoint?.track ?? null,
      selectedBuildingFocusPoint?.areaId ?? null,
      selectedBuildingFocusPoint?.datasetId ?? null,
    ],
    queryFn: () =>
      selectedBuildingFocusPoint && typeof selectedBuildingFocusPoint.track === "number"
        ? getMlPointAnalysis(selectedBuildingFocusPoint.runId, selectedBuildingFocusPoint.code, {
            track: selectedBuildingFocusPoint.track,
            areaId: selectedBuildingFocusPoint.areaId,
            datasetId: selectedBuildingFocusPoint.datasetId,
          })
        : Promise.resolve(null),
    enabled:
      Boolean(selectedBuildingFocusPoint) &&
      typeof selectedBuildingFocusPoint?.track === "number",
    retry: false,
  });
  const selectedBuildingFocusPointAnalysis =
    selectedBuildingFocusPointAnalysisQuery.data?.analysis ?? null;
  const selectedBuildingFocusPointStatus =
    selectedBuildingFocusPointAnalysisQuery.data?.status;
  const selectedBuildingFocusPointMessage =
    selectedBuildingFocusPointAnalysisQuery.data?.message;
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

  const fmtBuildingAddress = (address?: BuildingAddress | null) => {
    if (!address) return "Keine lokale Adresse gefunden";
    if (address.match_type === "osm_nearest" && address.distance_m !== null) {
      return `${address.label} (${fmtNum(address.distance_m, 1)} m entfernt)`;
    }
    return address.label;
  };
  const getBuildingAddressHelp = (address?: BuildingAddress | null) => {
    if (!address) return "Keine passende lokale Adresse in den OSM-Gebaeudedaten gefunden.";
    if (address.match_type === "osm_nearest") {
      return "Naechstgelegene lokale OSM-Adresse innerhalb von 25 m; sie ist als Naeherung zum GBA-Gebaeude zu lesen.";
    }
    if (address.match_type === "osm_intersection") {
      return "Adresse aus einem lokalen OSM-Gebaeude, dessen Footprint das ausgewaehlte GBA-Gebaeude schneidet.";
    }
    return "Adresse aus lokalen OSM-Tags des ausgewaehlten Gebaeudes.";
  };
  const getNumber = (value: unknown) => {
    const parsed =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;
    return parsed === null || Number.isNaN(parsed) ? null : parsed;
  };
  const getString = (value: unknown) => {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return undefined;
  };
  const getBoolean = (value: unknown) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
    return null;
  };
  const getStringArray = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry).trim()).filter(Boolean);
    }
    if (typeof value === "string" && value.trim() !== "") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry).trim()).filter(Boolean);
        }
      } catch {
        // Fall back to comma-separated values below.
      }
      return value.split(",").map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
  };
  const getObject = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === "string" && value.trim() !== "") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      } catch {
        return {};
      }
    }
    return {};
  };
  const getNumberMap = (value: unknown): Record<string, number | null> =>
    Object.fromEntries(
      Object.entries(getObject(value)).map(([key, entry]) => [key, getNumber(entry)])
    );
  const median = (values: number[]) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };
  const robustScale = (values: number[], center: number, minimum: number) => {
    const deviations = values.map((value) => Math.abs(value - center));
    return Math.max(1.4826 * median(deviations), minimum);
  };
  const getClusteringFeature = (point: Record<string, unknown>, key: string) =>
    getNumberMap(point.clustering_features)[key];
  const finiteOrFallback = (value: number | null | undefined, fallback = 0) =>
    value !== null && value !== undefined && Number.isFinite(value) ? value : fallback;
  const getDetectorScores = (value: unknown): Record<string, number> =>
    Object.fromEntries(
      Object.entries(getNumberMap(value)).filter(
        (entry): entry is [string, number] => entry[1] !== null
      )
    );
  const getExplainTopFeatures = (value: unknown): NonNullable<MlBuildingFocusPoint["explainTopFeatures"]> => {
    const parsed =
      typeof value === "string" && value.trim() !== ""
        ? (() => {
            try {
              return JSON.parse(value);
            } catch {
              return [];
            }
          })()
        : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const item = entry as Record<string, unknown>;
        return {
          key: getString(item.key) ?? "unknown",
          severity: getNumber(item.severity) ?? 0,
          summary: getString(item.summary) ?? "",
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  };

  const buildFocusPointFromRecord = (
    point: Record<string, unknown>,
    cluster?: MlBuildingClusterSummary
  ): MlBuildingFocusPoint | null => {
    if (!selectedBuilding || !activeRunId) return null;
    const code = getString(point.code);
    const datasetId =
      getString(point.dataset_id) ??
      getString(cluster?.dataset_id) ??
      activeRunQuery.data?.dataset_id ??
      undefined;
    const areaId = getString(point.area_id) ?? getString(cluster?.area_id) ?? selectedBuilding.areaId;
    const track = getNumber(point.track) ?? cluster?.track;
    if (!code || !datasetId || !areaId) return null;
    return {
      code,
      track: track ?? undefined,
      areaId,
      datasetId,
      sensor: getString(point.sensor) ?? getString(cluster?.sensor),
      runId: activeRunId,
      buildingSource: selectedBuilding.source,
      buildingId: selectedBuilding.id,
      velocity: getNumber(point.velocity),
      velocityStd: getNumber(point.velocity_std),
      height: getNumber(point.height),
      heightStd: getNumber(point.height_std),
      acceleration: getNumber(point.acceleration),
      coherence: getNumber(point.coherence),
      clusterId: getString(point.cluster_id) ?? cluster?.cluster_id ?? null,
      clusterRole: getString(point.cluster_role) ?? cluster?.cluster_role ?? null,
      clusterKind:
        (getString(point.cluster_kind) as MlClusterKind | null) ?? cluster?.cluster_kind ?? null,
      clusterRank: getNumber(point.cluster_rank) ?? cluster?.cluster_rank ?? null,
      isMainCluster: getBoolean(point.is_main_cluster) ?? cluster?.is_main_cluster ?? null,
      label: getString(point.label) ?? null,
      qualityScore: getNumber(point.quality_score),
      anomalyScore: getNumber(point.anomaly_score),
      crossTrackConsistency: getNumber(point.cross_track_consistency),
      distanceM: getNumber(point.distance_m),
      gateExcluded: getBoolean(point.gate_excluded),
      gateReasons: getStringArray(point.gate_reasons),
      keptForScoring: getBoolean(point.kept_for_scoring),
      degradedReason: getString(point.degraded_reason) ?? null,
      clusteringFeatures: getNumberMap(point.clustering_features),
      detectorScores: getDetectorScores(point.detector_scores),
      explainTopFeatures: getExplainTopFeatures(point.explain_top_features),
    };
  };

  const buildLocalDeviationBreakdown = (
    point: MlBuildingFocusPoint,
    analysis: typeof selectedBuildingFocusPointAnalysis
  ): LocalDeviationBreakdown | null => {
    if (typeof point.track !== "number") return null;
    const features = mlBuildingPointsData?.feature_collection.features ?? [];
    const group = features
      .map((feature) => feature.properties ?? {})
      .filter((properties) => {
        const track = getNumber(properties.track);
        const datasetId = getString(properties.dataset_id);
        return (
          track === point.track &&
          (!datasetId || datasetId === point.datasetId)
        );
      });
    if (!group.length) return null;

    const selected =
      group.find((properties) => {
        const code = getString(properties.code);
        const track = getNumber(properties.track);
        const datasetId = getString(properties.dataset_id);
        return (
          code === point.code &&
          track === point.track &&
          (!datasetId || datasetId === point.datasetId)
        );
      }) ?? null;

    const selectedValues = {
      velocity: point.velocity ?? analysis?.velocity ?? null,
      acceleration: point.acceleration ?? analysis?.acceleration ?? null,
      along:
        point.clusteringFeatures?.along_look_offset_m ??
        analysis?.clustering_features?.along_look_offset_m ??
        (selected ? getClusteringFeature(selected, "along_look_offset_m") : null),
      cross:
        point.clusteringFeatures?.cross_look_offset_m ??
        analysis?.clustering_features?.cross_look_offset_m ??
        (selected ? getClusteringFeature(selected, "cross_look_offset_m") : null),
      heightRank:
        point.clusteringFeatures?.height_rank_in_building ??
        analysis?.clustering_features?.height_rank_in_building ??
        (selected ? getClusteringFeature(selected, "height_rank_in_building") : null),
      coherence: point.coherence ?? analysis?.coherence ?? null,
    };

    const robustItems: Array<{
      key: string;
      label: string;
      selectedValue: number | null | undefined;
      values: number[];
      divisor: number;
      unit?: string;
      minimumScale?: number;
    }> = [
      {
        key: "velocity",
        label: "Geschwindigkeit",
        selectedValue: selectedValues.velocity,
        values: group.map((properties) => finiteOrFallback(getNumber(properties.velocity))),
        divisor: 3.5,
        unit: "mm/Jahr",
      },
      {
        key: "acceleration",
        label: "Beschleunigung",
        selectedValue: selectedValues.acceleration,
        values: group.map((properties) => finiteOrFallback(getNumber(properties.acceleration))),
        divisor: 3.5,
        unit: "mm/Jahr²",
      },
      {
        key: "along_look_offset_m",
        label: "Look-Laengsversatz",
        selectedValue: selectedValues.along,
        values: group.map((properties) =>
          finiteOrFallback(getClusteringFeature(properties, "along_look_offset_m"))
        ),
        divisor: 4.0,
        unit: "m",
      },
      {
        key: "cross_look_offset_m",
        label: "Look-Querversatz",
        selectedValue: selectedValues.cross,
        values: group.map((properties) =>
          finiteOrFallback(getClusteringFeature(properties, "cross_look_offset_m"))
        ),
        divisor: 4.0,
        unit: "m",
      },
    ];

    const items: LocalDeviationBreakdownItem[] = robustItems.map((item) => {
      const value = finiteOrFallback(item.selectedValue);
      const center = median(item.values);
      const scale = robustScale(item.values, center, item.minimumScale ?? 0.5);
      const z = Math.abs(value - center) / scale;
      const component = z / item.divisor;
      return {
        key: item.key,
        label: item.label,
        value,
        unit: item.unit,
        median: center,
        scale,
        z,
        component,
        detail: `Wert ${fmtNum(value)}${item.unit ? ` ${item.unit}` : ""}, Gruppenmedian ${fmtNum(center)}${item.unit ? ` ${item.unit}` : ""}`,
      };
    });

    const heightRank = selectedValues.heightRank;
    if (heightRank !== null && heightRank !== undefined) {
      const value = finiteOrFallback(heightRank, 0.5);
      const component = Math.abs(value - 0.5) * 1.4;
      items.push({
        key: "height_edge",
        label: "Hoehenrand",
        value,
        component,
        detail: `Hoehenrang ${fmtNum(value)}; 0.5 ist mittig, 0 oder 1 sind Randlagen.`,
      });
    }

    const coherence = finiteOrFallback(selectedValues.coherence, 0.65);
    const coherenceGap = Math.max(0, (0.65 - coherence) / 0.65);
    items.push({
      key: "coherence_gap",
      label: "Kohaerenzluecke",
      value: coherence,
      component: coherenceGap,
      detail: `Kohaerenz ${fmtNum(coherence)}; erst unter 0.65 entsteht ein Gap.`,
    });

    const sorted = items.sort((a, b) => b.component - a.component);
    return {
      items: sorted,
      topItem: sorted[0] ?? null,
      note:
        "Zeitreihensprung ist in bestehenden API-Antworten nicht als Einzelwert enthalten; die Anzeige zerlegt die sichtbaren Teilwerte.",
    };
  };

  const selectFocusPointFromRecord = (
    point: Record<string, unknown>,
    cluster?: MlBuildingClusterSummary
  ) => {
    const focusPoint = buildFocusPointFromRecord(point, cluster);
    if (focusPoint) {
      selectMlBuildingFocusPoint(focusPoint);
      setActiveBuildingTab("befund");
    }
  };

  const isSelectedFocusPointRecord = (point: Record<string, unknown>) => {
    if (!selectedBuildingFocusPoint) return false;
    const code = getString(point.code);
    const track = getNumber(point.track);
    const datasetId = getString(point.dataset_id);
    return (
      code === selectedBuildingFocusPoint.code &&
      (track === null || selectedBuildingFocusPoint.track === undefined || track === selectedBuildingFocusPoint.track) &&
      (!datasetId || datasetId === selectedBuildingFocusPoint.datasetId)
    );
  };









  const formatRunLine = (run: MlBuildingRunSummary) =>
    `${fmtStr(run.dataset_id)} / ${run.track === null || run.track === undefined ? "alle Tracks" : `T${run.track}`}`;


  const activateBuildingRun = (runId: string) => {
    setActiveRunId(runId);
    setMlView("cluster");
    setActiveBuildingTab("befund");
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

  const renderPointIdentity = () => {
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
        {renderMetric("Deformations-Std.", `${fmtNum(point.std_def)} mm`)}
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

  const activeRunTitle = activeRunQuery.data
    ? deriveRunTitle(activeRunQuery.data, {
        areaLabel: appConfig.areas.find(
          (area) => area.id === activeRunQuery.data?.area_id
        )?.label,
      })
    : activeRunId
      ? activeRunId.slice(0, 8)
      : "—";

  const openBuildingFromPointAnalysis = () => {
    if (!mlPointAnalysis?.building_id || !mlPointAnalysis.building_source) return;
    const source = mlPointAnalysis.building_source;
    if (source !== "bev" && source !== "gba" && source !== "osm") return;
    const areaId =
      mlPointAnalysis.area_id ??
      (selection?.type === "point" ? selection.areaId : null);
    if (!areaId) return;
    setSelection({
      type: "building",
      source,
      id: String(mlPointAnalysis.building_id),
      areaId,
    });
  };

  const pointWhyReasons: WhyReason[] = (mlPointAnalysis?.explain_top_features ?? []).map(
    (item) => ({
      key: `${item.key}-${item.summary}`,
      label: formatFocusReasonKey(item.key),
      detail: item.summary,
      tone: item.severity >= 0.5 ? "bad" : item.severity >= 0.25 ? "warning" : "neutral",
    })
  );

  const renderNoMlEmptyState = () => (
    <EmptyState
      title="Keine ML-Bewertung aktiv"
      message="Aktivieren Sie links einen Lauf, der dieses Gebiet abdeckt, oder starten Sie eine neue Auswertung."
      action={
        <Button size="sm" variant="secondary" onClick={() => setActiveLeftTab("analysis")}>
          Zur Run-Verwaltung
        </Button>
      }
    />
  );

  const renderPointBefund = () => {
    const point = pointQuery.data;
    if (!point) return null;
    return (
      <div className="flex flex-col gap-4">
        {renderPointIdentity()}
        {pointAnalysisRunId === activeRunId && mlPointAnalysis ? (
          <>
            <PointVerdict
              analysis={mlPointAnalysis}
              runTitle={activeRunTitle}
              onOpenBuilding={openBuildingFromPointAnalysis}
            />
            <WhyPanel
              title="Warum diese Punktbewertung?"
              reasons={pointWhyReasons}
              maxVisible={3}
              emptyText="Keine Bewertungsgründe für diesen Punkt gespeichert."
              sectionKey={`point-why-${selectionKey}-${activeRunId ?? "none"}`}
            />
          </>
        ) : activeRunId ? (
          <div>
            <div className="section-title">Aktiver ML-Lauf</div>
            {renderActiveRunSummary()}
            {renderPointMlStatus()}
          </div>
        ) : (
          renderNoMlEmptyState()
        )}
      </div>
    );
  };

  const renderPointDetails = () => {
    const point = pointQuery.data;
    if (!point) return null;
    const analysis = pointAnalysisRunId === activeRunId ? mlPointAnalysis : null;
    return (
      <div className="flex flex-col gap-4">
        {renderPointMetrics()}
        {analysis && (
          <CollapsibleSection
            title="ML-Modellwerte"
            defaultOpen
            key={`pd-ml-${selectionKey}-${activeRunId ?? "none"}`}
          >
            <p className="text-xs leading-snug text-muted-foreground">
              Rohgrößen der Punktbewertung im aktiven Lauf.
            </p>
            {renderMetric("Cross-Track-Konsistenz", fmtNum(analysis.cross_track_consistency))}
            {renderMetric("Clusterrolle", fmtStr(analysis.cluster_role))}
            {renderMetric("Cluster-Wahrscheinlichkeit", fmtNum(analysis.cluster_probability))}
            {renderMetric("Cluster-Ausreisserwert", fmtNum(analysis.cluster_outlier_score))}
            {renderMetric("Fuer Scoring genutzt", fmtBool(analysis.kept_for_scoring))}
            {renderMetric(
              "Gate-Gruende",
              analysis.gate_reasons.length > 0
                ? analysis.gate_reasons.map((reason) => formatFocusReasonKey(reason)).join(" · ")
                : "—"
            )}
            {renderMetric(
              "Zuordnung",
              formatAssignmentMethod(
                typeof analysis.building_context.assignment_method === "string"
                  ? analysis.building_context.assignment_method
                  : null
              )
            )}
            {renderMetric(
              "Track-Stuetzung",
              fmtNum(getNumber(analysis.building_context.track_point_count), 0)
            )}
            {renderMetric(
              "Step-Stuetzung",
              fmtNum(getNumber(analysis.building_context.step_support))
            )}
            {Object.entries(analysis.detector_scores).map(([key, value]) =>
              renderMetric(formatFocusDetectorKey(key), fmtNum(value), undefined, `pd-det-${key}`)
            )}
            {renderMetric(
              "Degradierungsgrund",
              fmtStr(
                typeof analysis.feature_flags.degraded_reason === "string"
                  ? analysis.feature_flags.degraded_reason
                  : null
              )
            )}
          </CollapsibleSection>
        )}
        {analysis && showPointNeighbourhood && (
          <CollapsibleSection
            title="Nachbarschaft"
            defaultOpen
            key={`pd-nb-${selectionKey}-${activeRunId ?? "none"}`}
          >
            <p className="text-xs leading-snug text-muted-foreground">
              Vergleich mit Clustern benachbarter Gebäude.
            </p>
            {renderMetric(
              "Kontext",
              mlPointNeighbourhood?.context_available
                ? `${fmtNum(mlPointNeighbourhood.candidate_neighbour_count, 0)} Kandidaten / ${fmtNum(
                    mlPointNeighbourhood.eligible_neighbour_cluster_count,
                    0
                  )} geeignet`
                : "nicht verfuegbar"
            )}
            {renderMetric("Bester Nachbar (Gebäude)", fmtStr(mlPointNeighbourhood?.best_neighbour_building_id))}
            {renderMetric("Bester Nachbar (Cluster)", fmtStr(mlPointNeighbourhood?.best_neighbour_cluster_id))}
            {renderMetric("Fit eigener Cluster", fmtNum(mlPointNeighbourhood?.own_cluster_fit_score))}
            {renderMetric("Fit bester Nachbar", fmtNum(mlPointNeighbourhood?.neighbour_fit_score))}
            {renderMetric("Fit-Differenz", fmtNum(mlPointNeighbourhood?.neighbour_fit_delta))}
            {renderMetric("Fehlzuordnungs-Flag", fmtBool(mlPointNeighbourhood?.neighbour_misassignment_flag))}
            {renderMetric("Schwacher Eigenfit", fmtBool(mlPointNeighbourhood?.own_fit_weak_flag))}
            {renderMetric("Nachbarereignis", fmtBool(mlPointNeighbourhood?.neighbour_event_flag))}
            {renderMetric("Ereignis-Score", fmtNum(mlPointNeighbourhood?.neighbour_event_score))}
            {renderMetric(
              "Stützende Nachbarn",
              fmtNum(mlPointNeighbourhood?.supporting_neighbour_count, 0)
            )}
          </CollapsibleSection>
        )}
      </div>
    );
  };

  const renderPointContent = () => {
    if (activePointTab === "details") return renderPointDetails();
    if (activePointTab === "raw") return renderPointRaw();
    return renderPointBefund();
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



  const renderBuildingMetrics = () => {
    const building = buildingDetailQuery.data;
    if (!building) return null;
    return (
      <div>
        {building.source === "bev" && (
          <>
            <div className="section-title">BEV-Hoehenattribute</div>
            {renderMetric("Gebaeudehoehe", `${fmtNum(building.height_m, 1)} m`)}
            {renderMetric(
              "Objekthoehe Median / Max / Traufe",
              `${fmtNum(building.height_median_m, 1)} / ${fmtNum(building.height_max_m, 1)} / ${fmtNum(
                building.height_eaves_m,
                1
              )} m`
            )}
            {renderMetric(
              "Bodenhoehe Min / Median / Max",
              `${fmtNum(building.ground_min_m, 1)} / ${fmtNum(building.ground_median_m, 1)} / ${fmtNum(
                building.ground_max_m,
                1
              )} m`
            )}
            {renderMetric("Footprint-Flaeche", `${fmtNum(building.footprint_area_m2, 1)} m2`)}
            {renderMetric("BEV-Reliefspanne", `${fmtNum(building.relief_range_m, 1)} m`)}
            {renderMetric("Hoehenquelle", fmtStr(building.height_source))}
            {renderMetric("Erfassungsart", fmtStr(building.capture_method))}
            {renderMetric("ALS-Datum / Befliegungsjahr", `${fmtStr(building.als_date)} / ${fmtNum(building.flight_year, 0)}`)}
            {renderMetric("AGWR-Typ", fmtStr(building.agwr_type))}
            {renderMetric("Verifikation LB", fmtStr(building.verification_lb))}
          </>
        )}
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

  const openFocusPointAsRegularPoint = (point: MlBuildingFocusPoint) => {
    setSelection(
      {
        type: "point",
        code: point.code,
        track: point.track,
        areaId: point.areaId,
        datasetId: point.datasetId,
        sensor: point.sensor,
      },
      { preserveMlBuildingFocus: true }
    );
    setActivePointTab("befund");
  };

  const endBuildingFocus = () => {
    clearMlBuildingFocus();
    setSelection(null);
  };

  const renderSelectedBuildingFocusPoint = () => {
    const point = selectedBuildingFocusPoint;
    if (!point) return null;
    const analysis = selectedBuildingFocusPointAnalysis;
    const gateReasons =
      point.gateReasons && point.gateReasons.length > 0
        ? point.gateReasons
        : analysis?.gate_reasons ?? [];
    const clusterRole = point.clusterRole ?? analysis?.cluster_role ?? null;
    const clusterKind = point.clusterKind ?? analysis?.cluster_kind ?? null;
    const modelSetVersion = analysis?.model_set_version ?? null;
    const clusterProbability = analysis?.cluster_probability ?? null;
    const pointLabel = point.label ?? analysis?.label ?? null;
    const qualityScore = point.qualityScore ?? analysis?.quality_score ?? null;
    const anomalyScore = point.anomalyScore ?? analysis?.anomaly_score ?? null;
    const crossTrackConsistency =
      point.crossTrackConsistency ?? analysis?.cross_track_consistency ?? null;
    const distanceM = point.distanceM ?? analysis?.distance_m ?? null;
    const gateExcluded = point.gateExcluded ?? analysis?.gate_excluded ?? null;
    const keptForScoring = point.keptForScoring ?? analysis?.kept_for_scoring ?? null;
    const velocity = point.velocity ?? analysis?.velocity ?? null;
    const velocityStd = point.velocityStd ?? analysis?.velocity_std ?? null;
    const height = point.height ?? analysis?.height ?? null;
    const heightStd = point.heightStd ?? analysis?.height_std ?? null;
    const acceleration = point.acceleration ?? analysis?.acceleration ?? null;
    const coherence = point.coherence ?? analysis?.coherence ?? null;
    const degradedReason =
      point.degradedReason ??
      analysis?.degraded_reason ??
      getString(analysis?.feature_flags?.degraded_reason) ??
      null;
    const explainTopFeatures =
      point.explainTopFeatures && point.explainTopFeatures.length > 0
        ? point.explainTopFeatures
        : analysis?.explain_top_features ?? [];
    const detectorScores =
      point.detectorScores && Object.keys(point.detectorScores).length > 0
        ? point.detectorScores
        : analysis?.detector_scores ?? {};
    const buildingContext = analysis?.building_context ?? {};
    const assignmentMethod = getString(buildingContext.assignment_method);
    const anomalyExplainFeatures = explainTopFeatures.filter(
      (item) => !focusAssignmentReasonKeys.has(item.key)
    );
    const assignmentWarnings = explainTopFeatures.filter((item) =>
      focusAssignmentReasonKeys.has(item.key)
    );
    const degradedReasonIsAssignment = degradedReason
      ? focusAssignmentReasonKeys.has(degradedReason)
      : false;
    const hasNearestAssignmentWarning = assignmentWarnings.some(
      (item) => item.key === "nearest_assignment"
    );
    const showNearestAssignmentFallback =
      assignmentMethod === "nearest" && !hasNearestAssignmentWarning;
    const showAssignmentWarnings =
      assignmentWarnings.length > 0 ||
      showNearestAssignmentFallback ||
      degradedReasonIsAssignment;
    const showGateScoring =
      gateExcluded === true ||
      keptForScoring === false ||
      gateReasons.length > 0 ||
      Boolean(degradedReason && !degradedReasonIsAssignment);
    const clusteringFeatureValue = (key: string) =>
      point.clusteringFeatures?.[key] ?? analysis?.clustering_features?.[key] ?? null;
    const formatFeature = (key: string, digits = 2, unit?: string) => {
      const value = clusteringFeatureValue(key);
      return value === null || value === undefined
        ? "—"
        : `${fmtNum(value, digits)}${unit ? ` ${unit}` : ""}`;
    };
    const localDeviationBreakdown = buildLocalDeviationBreakdown(point, analysis);
    return (
      <div className="sticky top-0 z-20 my-3 max-h-[48vh] overflow-auto rounded-md border border-primary/40 bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.9px] text-primary">
              Ausgewaehlter Punkt
            </div>
            <div className="mt-1 break-all font-mono text-sm font-bold text-foreground">
              {point.code} · T{fmtStr(point.track)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {fmtStr(point.datasetId)} · {fmtStr(pointLabel)} · Cluster {fmtStr(point.clusterId)}
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 shrink-0"
            onClick={clearSelectedMlBuildingFocusPoint}
            aria-label="Punktdetail schliessen"
            title="Punktdetail schliessen"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-3 rounded-md border border-border bg-secondary/40 p-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
            Kurzbefund
          </div>
          <div className="mt-1 grid gap-1">
            {renderMetric("Label", fmtStr(pointLabel))}
            {renderMetric("Anomaliewert", fmtNum(anomalyScore))}
            {renderMetric("Qualitaetswert", fmtNum(qualityScore))}
            {renderMetric(
              "Clusterrolle / Wahrscheinlichkeit",
              `${fmtStr(clusterRole)} / ${fmtNum(clusterProbability)}`
            )}
            {renderMetric(
              "Cluster-Typ",
              formatMlClusterKindForModel(clusterKind, modelSetVersion)
            )}
            {renderMetric("Cross-Track-Konsistenz", fmtNum(crossTrackConsistency))}
            {renderMetric("Fuer Scoring genutzt", fmtBool(keptForScoring))}
          </div>
        </div>

        <div className="mt-3 rounded-md border border-border bg-secondary/40 p-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
            Messwerte
          </div>
          <div className="mt-1 grid gap-1">
            {renderMetric("InSAR-Hoehe", `${fmtNum(height, 1)} m`)}
            {renderMetric("Hoehe Std.", `${fmtNum(heightStd, 1)} m`)}
            {renderMetric("Geschwindigkeit", `${fmtNum(velocity)} mm/Jahr`)}
            {renderMetric("Geschwindigkeit Std.", `${fmtNum(velocityStd)} mm/Jahr`)}
            {renderMetric("Beschleunigung", `${fmtNum(acceleration)} mm/Jahr²`)}
            {renderMetric("Kohaerenz", fmtNum(coherence))}
          </div>
        </div>

        <div className="mt-3 rounded-md border border-border bg-secondary/40 p-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
            Warum diese Punktbewertung?
          </div>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            Diese Faktoren erklaeren den Punkt-Score und die Outlier-Einstufung.
          </p>
          {anomalyExplainFeatures.length > 0 ? (
            <div className="mt-2 grid gap-1.5">
              {anomalyExplainFeatures.map((item) => (
                <div
                  key={`${item.key}-${item.severity}-${item.summary}`}
                  className="rounded-sm border border-border bg-card px-2 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <span className="min-w-0 font-semibold text-foreground">
                      {formatFocusReasonKey(item.key)}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {fmtNum(item.severity)}
                    </span>
                  </div>
                  <div className="mt-0.5 break-words text-muted-foreground">
                    {fmtStr(item.summary)}
                  </div>
                  {item.key === "local_motion_deviation" && localDeviationBreakdown?.topItem && (
                    <div className="mt-2 rounded-sm border border-border bg-secondary/60 p-2 text-[11px] text-muted-foreground">
                      <div className="font-semibold text-foreground">
                        Haupttreiber: {localDeviationBreakdown.topItem.label}
                      </div>
                      <div className="mt-1">
                        Teilwert {fmtNum(localDeviationBreakdown.topItem.component)}
                        {localDeviationBreakdown.topItem.component > 1
                          ? " (local_deviation wird bei 1.00 gedeckelt)"
                          : ""}
                      </div>
                      <div>{localDeviationBreakdown.topItem.detail}</div>
                      <div className="mt-2 grid gap-1">
                        {localDeviationBreakdown.items.map((breakdownItem) => (
                          <div
                            key={breakdownItem.key}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                          >
                            <span className="min-w-0">
                              {breakdownItem.label}
                              {breakdownItem.unit && breakdownItem.value !== null
                                ? ` (${fmtNum(breakdownItem.value)} ${breakdownItem.unit})`
                                : breakdownItem.value !== null
                                  ? ` (${fmtNum(breakdownItem.value)})`
                                  : ""}
                            </span>
                            <span className="font-mono text-foreground">
                              {fmtNum(breakdownItem.component)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {localDeviationBreakdown.note && (
                        <div className="mt-2 text-[10px] leading-snug">
                          {localDeviationBreakdown.note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="pill mt-2">Keine Bewertungsgruende fuer diesen Punkt gespeichert.</div>
          )}
        </div>

        <div className="mt-3 rounded-md border border-border bg-secondary/40 p-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
            Zuordnung zum Gebaeude
          </div>
          <div className="mt-1 grid gap-1">
            {renderMetric(
              "Gebaeude",
              `${fmtStr(point.buildingSource).toUpperCase()} / ${fmtStr(point.buildingId)}`
            )}
            {renderMetric("Abstand zum Gebaeude", `${fmtNum(distanceM, 1)} m`)}
            {renderMetric("Zuordnung", formatAssignmentMethod(assignmentMethod))}
          </div>
          {showAssignmentWarnings && (
            <div className="mt-2 rounded-sm border border-warning/30 bg-warning/10 px-2 py-1.5 text-xs text-warning">
              <div className="font-semibold">Zuordnungswarnung</div>
              <p className="mt-0.5 leading-snug">
                Diese Hinweise betreffen die Zuordnung zum Gebaeude, nicht zwingend die Bewegung
                selbst.
              </p>
              <div className="mt-1.5 grid gap-1 text-warning">
                {assignmentWarnings.map((item) => (
                  <div key={`${item.key}-${item.severity}-${item.summary}`}>
                    <span className="font-semibold">{formatFocusReasonKey(item.key)}</span>
                    <span className="font-mono"> · {fmtNum(item.severity)}</span>
                    <span className="block break-words opacity-90">{fmtStr(item.summary)}</span>
                  </div>
                ))}
                {showNearestAssignmentFallback && (
                  <div>
                    <span className="font-semibold">
                      {formatFocusReasonKey("nearest_assignment")}
                    </span>
                    <span className="block break-words opacity-90">
                      Punkt wurde nur ueber das naechstgelegene Gebaeude zugeordnet.
                    </span>
                  </div>
                )}
                {degradedReasonIsAssignment && !hasNearestAssignmentWarning && (
                  <div>
                    <span className="font-semibold">{formatFocusReasonKey(degradedReason)}</span>
                    <span className="block break-words opacity-90">
                      Die Punktbewertung wurde wegen dieser Zuordnungsunsicherheit herabgestuft.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showGateScoring && (
          <div className="mt-3 rounded-md border border-border bg-secondary/40 p-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
              Gate & Scoring
            </div>
            <div className="mt-1 grid gap-1">
              {renderMetric("Gate-ausgeschlossen", fmtBool(gateExcluded))}
              {renderMetric("Fuer Scoring genutzt", fmtBool(keptForScoring))}
              {renderMetric(
                "Gate-Gruende",
                gateReasons.length > 0
                  ? gateReasons.map((reason) => formatFocusReasonKey(reason)).join(", ")
                  : "—"
              )}
              {renderMetric(
                "Degradierungsgrund",
                degradedReason ? formatFocusReasonKey(degradedReason) : "—"
              )}
            </div>
          </div>
        )}

        <div className="mt-3 rounded-md border border-border bg-secondary/40 p-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
            Technische Modellwerte
          </div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.7px] text-muted-foreground">
            Clustering-Features
          </div>
          <div className="mt-1 grid gap-1">
            {clusteringFeatureLabels.map((feature) =>
              renderMetric(
                feature.label,
                formatFeature(feature.key, feature.digits ?? 2, feature.unit),
                undefined,
                `focus-feature-${feature.key}`
              )
            )}
          </div>
          {Object.keys(detectorScores).length > 0 && (
            <>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.7px] text-muted-foreground">
                Bewertungstreiber
              </div>
              <div className="mt-1 grid gap-1">
                {Object.entries(detectorScores).map(([key, value]) =>
                  renderMetric(
                    formatFocusDetectorKey(key),
                    fmtNum(value),
                    undefined,
                    `focus-detector-${key}`
                  )
                )}
              </div>
            </>
          )}
        </div>

        {selectedBuildingFocusPointAnalysisQuery.isLoading && (
          <div className="pill mt-2">Punktanalyse wird geladen...</div>
        )}
        {selectedBuildingFocusPointStatus === "missing" && (
          <div className="pill warning mt-2">
            {selectedBuildingFocusPointMessage || "Keine Punktanalyse fuer diesen Lauf gefunden."}
          </div>
        )}
        {selectedBuildingFocusPointAnalysisQuery.isError && (
          <div className="pill warning mt-2">Punktanalyse konnte nicht geladen werden.</div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => openFocusPointAsRegularPoint(point)}
          >
            <ExternalLink aria-hidden="true" />
            Als Punkt oeffnen
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={endBuildingFocus}>
            <X aria-hidden="true" />
            Gebaeude-Fokus beenden
          </Button>
        </div>
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

  const renderBuildingBefundTab = () => {
    const building = buildingDetailQuery.data;
    if (!building) return null;
    const runHistoryCount = buildingRunsQuery.data?.length ?? 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="section-title !mt-0">Gebäude</div>
          {renderMetric("Quelle", building.source.toUpperCase(), "Datenquelle des Gebaeudeobjekts.")}
          {renderMetric("Gebaeude-ID", building.id)}
          {renderMetric(
            "Adresse",
            fmtBuildingAddress(building.address),
            getBuildingAddressHelp(building.address)
          )}
          {renderMetric(
            "Gebaeudehoehe",
            building.height === null ? "—" : `${building.height.toFixed(1)} m`
          )}
          {building.source === "bev" &&
            renderMetric("Bauwerksfunktion", fmtStr(building.building_function))}
        </div>

        {renderSelectedBuildingFocusPoint()}

        {activeRunId && mlBuildingAnalysisQuery.isLoading && (
          <div className="pill">Gebaeudeanalyse des aktiven Laufs wird geladen...</div>
        )}
        {activeRunId && mlBuildingAnalysisQuery.isError && !isActiveRunPending && (
          <div className="pill warning">
            Gebaeudeanalyse des aktiven Laufs konnte nicht geladen werden.
          </div>
        )}
        {isActiveRunPending && (
          <div className="pill">
            Diese Zusammenfassung aktualisiert sich waehrend der aktive Lauf verarbeitet wird.
          </div>
        )}

        {mlBuildingAnalysis ? (
          mlBuildingAnalysis.point_count === 0 ? (
            <div className="pill">
              Keine Punkte aus dem aktiven Lauf sind diesem Gebaeude zugeordnet.
            </div>
          ) : (
            <BuildingBefund
              analysis={mlBuildingAnalysis}
              runTitle={activeRunTitle}
              sectionKey={`${selectionKey}-${activeRunId ?? "none"}`}
              showClusters={isActiveLocalAnomalyRun}
              trackOptions={mlBuildingTrackOptions}
              pointsByCluster={buildingPointsByCluster}
              pointsLoading={mlBuildingPointsQuery.isLoading}
              isSelectedPoint={isSelectedFocusPointRecord}
              onFocusPoint={selectFocusPointFromRecord}
              onEndFocus={endBuildingFocus}
            />
          )
        ) : !activeRunId ? (
          renderNoMlEmptyState()
        ) : null}

        <CollapsibleSection
          title="Frühere Läufe dieses Gebäudes"
          defaultOpen={false}
          key={`run-history-${selectionKey}`}
          aside={runHistoryCount > 0 ? `${runHistoryCount}` : undefined}
        >
          {renderBuildingRunsFull()}
        </CollapsibleSection>
      </div>
    );
  };

  const renderBuildingDetails = () => {
    const building = buildingDetailQuery.data;
    if (!building) return null;
    const analysis = mlBuildingAnalysis;
    return (
      <div className="flex flex-col gap-4">
        {renderBuildingMetrics()}
        {analysis && (
          <>
            <CollapsibleSection
              title="ML-Detailmetriken"
              defaultOpen
              key={`bd-ml-${selectionKey}-${activeRunId ?? "none"}`}
            >
              <p className="text-xs leading-snug text-muted-foreground">
                Aggregierte Modellwerte des Gebäuderollups im aktiven Lauf.
              </p>
              {renderMetric(
                "Modellstand",
                isV3ModelSetVersion(analysis.model_set_version)
                  ? `${fmtStr(analysis.model_set_version)} – Annex: ${V3_ANNEX_CLASSIFICATION_NOTE}`
                  : fmtStr(analysis.model_set_version)
              )}
              {renderMetric("Track-Uebereinstimmung", fmtNum(analysis.track_agreement_score))}
              {renderMetric(
                "Retuning-Flags",
                formatRetuningFlags(
                  analysis.weak_secondary_track_flag,
                  analysis.agreement_tension_flag
                )
              )}
              {renderMetric(
                "Retuning-Anpassungen",
                formatPenaltySummary(analysis.reliability_penalties)
              )}
              {renderMetric(
                "Cluster / belastbar",
                `${analysis.cluster_count} / ${analysis.reliable_cluster_count}`
              )}
              {renderMetric(
                "Differenzielle Bewegung",
                formatDifferentialMotionLevel(analysis.differential_motion_level)
              )}
              {renderMetric("Median-Abstand", `${fmtNum(analysis.median_distance_m, 1)} m`)}
              {renderMetric("Mittlere Qualitaet", fmtNum(analysis.avg_quality_score))}
              {renderMetric("Mittlere Anomalie", fmtNum(analysis.avg_anomaly_score))}
              {renderMetric(
                "Mittlere Cross-Track-Konsistenz",
                fmtNum(analysis.avg_cross_track_consistency)
              )}
              {renderMetric(
                "Nachbarschaftskontext",
                analysis.neighbour_context_available ? "verfuegbar" : "nicht verfuegbar"
              )}
              {renderMetric(
                "Nachbar-Kandidaten",
                fmtNum(analysis.neighbour_candidate_building_count, 0)
              )}
              {renderMetric(
                "Fehlzuordnungspunkte",
                fmtNum(analysis.neighbour_misassignment_point_count, 0)
              )}
              {renderMetric(
                "Fehlzuordnungsanteil",
                fmtPct(analysis.neighbour_misassignment_share, 1)
              )}
              {renderMetric("Nachbarereignis", analysis.neighbour_event_flag ? "ja" : "nein")}
              {renderMetric("Ereignis-Score", fmtNum(analysis.neighbour_event_score))}
              {renderMetric("Konsistenz-Score", fmtNum(analysis.neighbour_consistency_score))}
              {renderMetric(
                "Stützende Nachbarn",
                fmtNum(analysis.supporting_neighbour_count, 0)
              )}
              {renderMetric("Stützende Tracks", fmtNum(analysis.supporting_track_count, 0))}
            </CollapsibleSection>
            <CollapsibleSection
              title="Verteilungen"
              defaultOpen={false}
              key={`bd-dist-${selectionKey}-${activeRunId ?? "none"}`}
            >
              <p className="text-xs leading-snug text-muted-foreground">
                Punktverteilungen nach Track, Label und Zuordnungsmethode.
              </p>
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
              key={`bd-top-${selectionKey}-${activeRunId ?? "none"}`}
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
      </div>
    );
  };

  const renderBuildingContent = () => {
    if (activeBuildingTab === "details") return renderBuildingDetails();
    if (activeBuildingTab === "raw") return renderBuildingRaw();
    return renderBuildingBefundTab();
  };

  const renderBuildingExternalActions = () => {
    if (!buildingDetailQuery.data) return null;
    if (!buildingGoogleEarthUrl) {
      return (
        <div className="pill warning mb-3">
          Google-Earth-Link nicht verfuegbar.
        </div>
      );
    }
    return (
      <div className="mb-3 grid gap-2">
        <div className="space-y-1.5">
          <UiLabel htmlFor="google-earth-view-select">Blickrichtung</UiLabel>
          <Select value={selectedEarthViewKey} onValueChange={setEarthViewKey}>
            <SelectTrigger id="google-earth-view-select">
              <SelectValue placeholder="Blickrichtung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EARTH_TOP_VIEW_KEY}>
                Von oben, geringe Neigung
              </SelectItem>
              {earthLosTrackOptions.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  Satellitenblick: {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedBuildingGoogleEarthUrl ? (
          <Button asChild size="sm" variant="outline" className="w-full justify-start">
            <a
              href={selectedBuildingGoogleEarthUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Ausgewaehltes Gebaeude in Google Earth oeffnen"
            >
              <ExternalLink aria-hidden="true" />
              In Google Earth öffnen
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full justify-start"
            disabled
          >
            <ExternalLink aria-hidden="true" />
            In Google Earth öffnen
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="panel panel-right">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2>Inspektor</h2>
          <small>Punkt oder Gebaeude auswaehlen, um Messwerte und Diagnostik zu pruefen.</small>
        </div>
        <button
          type="button"
          aria-label="Glossar der Fachbegriffe öffnen"
          title="Glossar der Fachbegriffe"
          onClick={() => setGlossarOpen(true)}
          className="mt-1 inline-grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen className="h-3.5 w-3.5" />
        </button>
      </div>
      <GlossarSheet open={glossarOpen} onClose={() => setGlossarOpen(false)} />

      {!selection && inspectedRunId && <RunInspector runId={inspectedRunId} />}

      {!selection && !inspectedRunId && (
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
              {renderBuildingExternalActions()}
              {renderBuildingContent()}
            </>
          )}

        </>
      )}
    </div>
  );
}
