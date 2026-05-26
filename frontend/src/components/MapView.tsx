import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import maplibregl, { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { basemaps } from "../lib/basemaps";
import type { BasemapId } from "../lib/basemaps";
import {
  DEFAULT_MAP_BEARING,
  DEFAULT_MAP_PITCH,
  isSatelliteCameraMode,
  satelliteCameraPresets,
} from "../lib/cameraModes";
import type { CameraMode } from "../lib/cameraModes";
import {
  TRACK_44_OUTLINE_COLOR,
  TRACK_95_OUTLINE_COLOR,
  TRACK_OUTLINE_SEPARATOR_COLOR,
  basePointInnerStrokeWidthExpression,
  basePointRadiusExpression,
  formatHeightLegendValue,
  getBasePointColorExpression,
  trackOutlineRingRadiusExpression,
  trackOutlineRingStrokeWidthExpression,
  velocityExpression,
} from "../lib/pointStyling";
import {
  getMlBuildingContext,
  getMlBuildingPoints,
  getMlRunDetail,
} from "../hooks/useApi";
import { useAppStore } from "../lib/store";

const tilesBase =
  import.meta.env.VITE_TILES_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "");
const apiBase =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "");

const CAMERA_TRANSITION_MS = 700;
const CAMERA_EPSILON = 0.05;

function getReliefOpacity(basemap: BasemapId) {
  return basemap === "satellite" ? 0.22 : 0.35;
}

function getBearingDifference(a: number, b: number) {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function setCameraInteractionLock(map: MapLibreMap, locked: boolean) {
  if (locked) {
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.touchPitch.disable();
    map.keyboard.disableRotation();
    return;
  }

  map.dragRotate.enable();
  map.touchZoomRotate.enableRotation();
  map.touchPitch.enable();
  map.keyboard.enableRotation();
}

function applyCameraMode(
  map: MapLibreMap,
  mode: CameraMode,
  freeCamera: { bearing: number; pitch: number },
  animate: boolean
) {
  const target = isSatelliteCameraMode(mode)
    ? satelliteCameraPresets[mode]
    : freeCamera;

  const needsBearing = getBearingDifference(map.getBearing(), target.bearing) > CAMERA_EPSILON;
  const needsPitch = Math.abs(map.getPitch() - target.pitch) > CAMERA_EPSILON;

  if (!needsBearing && !needsPitch) {
    return;
  }

  map.easeTo({
    bearing: target.bearing,
    pitch: target.pitch,
    duration: animate ? CAMERA_TRANSITION_MS : 0,
    essential: true,
  });
}

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
const mlPalette = Array.from({ length: mlPaletteSize }, (_, i) => {
  const hue = (i * 360) / mlPaletteSize;
  return hslToHex(hue, 0.7, 0.5);
});

const clusterPaletteExpression: any[] = [
  "match",
  ["get", "cluster_color_index"],
  ...mlPalette.flatMap((color, idx) => [idx, color]),
  "#9aa0a6",
];

const mlClusterColorExpression: any[] = [
  "case",
  ["==", ["get", "gate_excluded"], true],
  "#9aa0a6",
  ["==", ["get", "cluster_role"], "excluded"],
  "#9aa0a6",
  ["==", ["get", "cluster_role"], "noise"],
  "#c6372a",
  ["==", ["get", "cluster_role"], "insufficient_support"],
  "#f2c14e",
  clusterPaletteExpression,
];

const mlBuildingColorExpression: any[] = [
  "match",
  ["get", "building_color_index"],
  ...mlPalette.flatMap((color, idx) => [idx, color]),
  "#9aa0a6",
];

const mlBuildingHeightExpression: any[] = [
  "max",
  ["coalesce", ["get", "height_m"], 12],
  4,
];

const qualityExpression: any[] = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "quality_score"], 0],
  0,
  "#8e0f2f",
  0.4,
  "#d97b29",
  0.7,
  "#f2c14e",
  1,
  "#1b9e77",
];

const anomalyExpression: any[] = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "anomaly_score"], 0],
  0,
  "#1b9e77",
  0.4,
  "#f2c14e",
  0.7,
  "#d97b29",
  1,
  "#8e0f2f",
];

const crossTrackExpression: any[] = [
  "case",
  ["==", ["get", "cross_track_consistency"], null],
  "#9aa0a6",
  [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "cross_track_consistency"], 0],
    0,
    "#8e0f2f",
    0.5,
    "#f2c14e",
    1,
    "#1b9e77",
  ],
];

const pointReliabilityExpression: any[] = [
  "match",
  ["get", "label"],
  "normal",
  "#1b9e77",
  "suspect",
  "#f2c14e",
  "outlier",
  "#c6372a",
  "#9aa0a6",
];

const buildingReliabilityScoreExpression: any[] = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "building_reliability_score"], 0],
  0,
  "#8e0f2f",
  0.4,
  "#d97b29",
  0.7,
  "#f2c14e",
  1,
  "#1b9e77",
];

const buildingMotionExpression: any[] = [
  "step",
  ["coalesce", ["get", "building_motion_mm_a"], 0],
  "#8e0f2f",
  -5,
  "#c6372a",
  -2,
  "#e67f1c",
  -1,
  "#f2c14e",
  1,
  "#2c9f7a",
  2,
  "#4aa5d5",
  5,
  "#345995",
  10,
  "#1c2f4a",
];

const buildingCrossTrackExpression: any[] = [
  "case",
  ["==", ["get", "track_agreement_score"], null],
  "#9aa0a6",
  [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "track_agreement_score"], 0],
    0,
    "#8e0f2f",
    0.5,
    "#f2c14e",
    1,
    "#1b9e77",
  ],
];

const buildingReliabilityBandExpression: any[] = [
  "match",
  ["get", "building_reliability_band"],
  "high",
  "#1b9e77",
  "medium",
  "#f2c14e",
  "low",
  "#c6372a",
  "#9aa0a6",
];

const focusCandidateColorExpression: any[] = [
  "match",
  ["get", "track"],
  44,
  "rgba(41, 128, 185, 0.28)",
  95,
  "rgba(216, 112, 52, 0.28)",
  "rgba(140, 140, 140, 0.18)",
];

const focusCandidateLineExpression: any[] = [
  "match",
  ["get", "track"],
  44,
  "#2980b9",
  95,
  "#d87034",
  "#7f8c8d",
];

function hasFeatureProperty(properties: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(properties, key);
}

function formatRetuningTooltipLine(properties: Record<string, unknown>) {
  const flags = [
    properties.weak_secondary_track_flag === true ? "weak secondary track" : null,
    properties.agreement_tension_flag === true ? "agreement tension" : null,
  ].filter(Boolean);
  const hasFlagFields =
    hasFeatureProperty(properties, "weak_secondary_track_flag") ||
    hasFeatureProperty(properties, "agreement_tension_flag");
  if (!hasFlagFields) {
    return "";
  }
  return `<br/>Retuning: ${flags.length ? flags.join(", ") : "none"}`;
}

function readFeatureProperty(properties: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (hasFeatureProperty(properties, key)) {
      return properties[key];
    }
  }
  return undefined;
}

function readBooleanFeatureProperty(
  properties: Record<string, unknown>,
  ...keys: string[]
): boolean | null {
  const value = readFeatureProperty(properties, ...keys);
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function readNumberFeatureProperty(
  properties: Record<string, unknown>,
  ...keys: string[]
): number | null {
  const value = readFeatureProperty(properties, ...keys);
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatTooltipNumber(value: number | null, digits = 2) {
  return value === null ? "—" : value.toFixed(digits);
}

function formatTooltipPercent(value: number | null, digits = 0) {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

function formatTooltipYesNo(value: boolean | null) {
  return value === null ? "—" : value ? "yes" : "no";
}

function formatNeighbourPointTooltipLines(properties: Record<string, unknown>) {
  const hasNeighbourFields =
    hasFeatureProperty(properties, "neighbour_context_available") ||
    hasFeatureProperty(properties, "context_available") ||
    hasFeatureProperty(properties, "neighbour_misassignment_flag") ||
    hasFeatureProperty(properties, "neighbour_event_flag") ||
    hasFeatureProperty(properties, "supporting_neighbour_count");
  if (!hasNeighbourFields) {
    return "";
  }

  const contextAvailable = readBooleanFeatureProperty(
    properties,
    "neighbour_context_available",
    "context_available"
  );
  const misassignmentFlag = readBooleanFeatureProperty(
    properties,
    "neighbour_misassignment_flag"
  );
  const eventFlag = readBooleanFeatureProperty(properties, "neighbour_event_flag");
  const eventScore = readNumberFeatureProperty(properties, "neighbour_event_score");
  const supportingCount = readNumberFeatureProperty(properties, "supporting_neighbour_count");
  const eventParts = [formatTooltipYesNo(eventFlag)];
  if (eventScore !== null) {
    eventParts.push(formatTooltipNumber(eventScore));
  }
  if (supportingCount !== null) {
    eventParts.push(`${supportingCount.toFixed(0)} support`);
  }

  return `
        <br/>Neighbour context: ${formatTooltipYesNo(contextAvailable)}
        <br/>Neighbour misassignment: ${formatTooltipYesNo(misassignmentFlag)}
        <br/>Neighbour event: ${eventParts.join(" / ")}
      `;
}

function formatNeighbourBuildingTooltipLines(properties: Record<string, unknown>) {
  const hasNeighbourFields =
    hasFeatureProperty(properties, "neighbour_context_available") ||
    hasFeatureProperty(properties, "neighbour_misassignment_point_count") ||
    hasFeatureProperty(properties, "neighbour_event_flag") ||
    hasFeatureProperty(properties, "supporting_neighbour_count");
  if (!hasNeighbourFields) {
    return "";
  }

  const contextAvailable = readBooleanFeatureProperty(properties, "neighbour_context_available");
  const candidateCount = readNumberFeatureProperty(
    properties,
    "neighbour_candidate_building_count"
  );
  const misassignmentCount = readNumberFeatureProperty(
    properties,
    "neighbour_misassignment_point_count"
  );
  const misassignmentShare = readNumberFeatureProperty(
    properties,
    "neighbour_misassignment_share"
  );
  const eventFlag = readBooleanFeatureProperty(properties, "neighbour_event_flag");
  const eventScore = readNumberFeatureProperty(properties, "neighbour_event_score");
  const consistencyScore = readNumberFeatureProperty(
    properties,
    "neighbour_consistency_score"
  );
  const supportingCount = readNumberFeatureProperty(properties, "supporting_neighbour_count");
  const supportingTrackCount = readNumberFeatureProperty(properties, "supporting_track_count");
  const contextParts = [formatTooltipYesNo(contextAvailable)];
  if (candidateCount !== null) {
    contextParts.push(`${candidateCount.toFixed(0)} cand`);
  }
  const misassignmentText =
    misassignmentCount === null
      ? "—"
      : `${misassignmentCount.toFixed(0)}${
          misassignmentShare === null ? "" : ` (${formatTooltipPercent(misassignmentShare, 0)})`
        }`;
  const eventParts = [formatTooltipYesNo(eventFlag)];
  if (eventScore !== null) {
    eventParts.push(formatTooltipNumber(eventScore));
  }
  if (consistencyScore !== null) {
    eventParts.push(`cons ${formatTooltipNumber(consistencyScore)}`);
  }
  const supportText =
    supportingCount === null
      ? "—"
      : `${supportingCount.toFixed(0)}${
          supportingTrackCount === null ? "" : ` / T${supportingTrackCount.toFixed(0)}`
        }`;

  return `
        <br/>Neighbour context: ${contextParts.join(" / ")}
        <br/>Neighbour misassignment: ${misassignmentText}
        <br/>Neighbour event: ${eventParts.join(" / ")}
        <br/>Neighbour support: ${supportText}
      `;
}

function formatMlBuildingTooltip(properties: Record<string, unknown>, title: string) {
  const buildingSource = readFeatureProperty(properties, "building_source");
  const buildingId = readFeatureProperty(properties, "building_id");
  const heightM = readNumberFeatureProperty(properties, "height_m");
  const motion = readNumberFeatureProperty(properties, "building_motion_mm_a");
  const reliabilityScore = readNumberFeatureProperty(
    properties,
    "building_reliability_score"
  );
  const reliabilityBand = readFeatureProperty(properties, "building_reliability_band");
  const buildingStatus = readFeatureProperty(properties, "building_status");
  const trackAgreement = readNumberFeatureProperty(properties, "track_agreement_score");
  const differentialMotion = readBooleanFeatureProperty(
    properties,
    "differential_motion_flag"
  );
  const clusterCount = readNumberFeatureProperty(properties, "cluster_count");
  const reliableClusterCount = readNumberFeatureProperty(properties, "reliable_cluster_count");

  return `
        <strong>${title}</strong><br/>
        Source: ${buildingSource === undefined || buildingSource === null ? "—" : String(buildingSource)}<br/>
        ID: ${buildingId === undefined || buildingId === null ? "—" : String(buildingId)}<br/>
        Height: ${heightM === null ? "—" : `${heightM.toFixed(1)} m`}<br/>
        Motion: ${motion === null ? "—" : `${motion.toFixed(2)} mm/yr`}<br/>
        Reliability: ${reliabilityScore === null ? "—" : reliabilityScore.toFixed(2)} (${
          reliabilityBand === undefined || reliabilityBand === null ? "—" : String(reliabilityBand)
        })<br/>
        Status: ${buildingStatus === undefined || buildingStatus === null ? "—" : String(buildingStatus)}<br/>
        Track agreement: ${trackAgreement === null ? "—" : trackAgreement.toFixed(2)}${formatRetuningTooltipLine(properties)}<br/>
        Differential motion: ${formatTooltipYesNo(differentialMotion)}<br/>
        Clusters: ${clusterCount === null ? "—" : clusterCount.toFixed(0)} / Reliable: ${
          reliableClusterCount === null ? "—" : reliableClusterCount.toFixed(0)
        }${formatNeighbourBuildingTooltipLines(properties)}
      `;
}

function applyBasePointColors(
  map: MapLibreMap,
  pointColorMode: "velocity" | "height",
  heightSensitivityM: number
) {
  const pointColorExpression = getBasePointColorExpression(pointColorMode, heightSensitivityM);
  if (map.getLayer("insar_t44")) {
    map.setPaintProperty("insar_t44", "circle-color", pointColorExpression as any);
  }
  if (map.getLayer("insar_t95")) {
    map.setPaintProperty("insar_t95", "circle-color", pointColorExpression as any);
  }
}

function applyTrackOutlineStyle(map: MapLibreMap, enabled: boolean) {
  const innerStrokeWidth = enabled ? (basePointInnerStrokeWidthExpression as any) : 0;
  if (map.getLayer("insar_t44")) {
    map.setPaintProperty("insar_t44", "circle-stroke-width", innerStrokeWidth);
  }
  if (map.getLayer("insar_t95")) {
    map.setPaintProperty("insar_t95", "circle-stroke-width", innerStrokeWidth);
  }
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const basemapRef = useRef<BasemapId | null>(null);
  const cameraModeRef = useRef<CameraMode>("default");
  const previousCameraModeRef = useRef<CameraMode>("default");
  const lastFreeCameraRef = useRef({
    bearing: DEFAULT_MAP_BEARING,
    pitch: DEFAULT_MAP_PITCH,
  });
  const pointColorModeRef = useRef<"velocity" | "height">("velocity");
  const [tooltip, setTooltip] = useState<
    { x: number; y: number; html: string } | null
  >(null);
  const [styleVersion, setStyleVersion] = useState(0);

  const layers = useAppStore((state) => state.layers);
  const filters = useAppStore((state) => state.filters);
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const selection = useAppStore((state) => state.selection);
  const basemapId = useAppStore((state) => state.basemapId);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const pointColorMode = useAppStore((state) => state.pointColorMode);
  const heightSensitivityM = useAppStore((state) => state.heightSensitivityM);
  const showTrackOutlines = useAppStore((state) => state.showTrackOutlines);
  const setSelection = useAppStore((state) => state.setSelection);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const showMlLayer = useAppStore((state) => state.showMlLayer);
  const showMlBuildings = useAppStore((state) => state.showMlBuildings);
  const mlBuildingTrackFilter = useAppStore((state) => state.mlBuildingTrackFilter);
  const mlBuildingShowExcluded = useAppStore((state) => state.mlBuildingShowExcluded);
  const mlBuildingShowHulls = useAppStore((state) => state.mlBuildingShowHulls);
  const mlView = useAppStore((state) => state.mlView);
  const mlTileVersion = useAppStore((state) => state.mlTileVersion);
  const setMapBBox = useAppStore((state) => state.setMapBBox);
  const activeSatellitePreset = isSatelliteCameraMode(cameraMode)
    ? satelliteCameraPresets[cameraMode]
    : null;
  const focusBuildingSelection = selection?.type === "building" ? selection : null;

  const activeRunQuery = useQuery({
    queryKey: ["map-ml-run-detail", activeRunId],
    queryFn: () => getMlRunDetail(activeRunId as string),
    enabled: Boolean(activeRunId),
    refetchInterval: activeRunId ? 5000 : false,
  });
  const isLocalAnomalyRun = activeRunQuery.data?.pipeline === "anomaly_local_v1";
  const focusPointsQuery = useQuery({
    queryKey: ["map-ml-building-points", activeRunId, focusBuildingSelection],
    queryFn: () =>
      focusBuildingSelection && activeRunId
        ? getMlBuildingPoints(activeRunId, focusBuildingSelection.source, focusBuildingSelection.id)
        : Promise.resolve(null),
    enabled: Boolean(activeRunId && focusBuildingSelection && isLocalAnomalyRun),
    retry: false,
  });
  const focusContextQuery = useQuery({
    queryKey: ["map-ml-building-context", activeRunId, focusBuildingSelection],
    queryFn: () =>
      focusBuildingSelection && activeRunId
        ? getMlBuildingContext(activeRunId, focusBuildingSelection.source, focusBuildingSelection.id)
        : Promise.resolve(null),
    enabled: Boolean(activeRunId && focusBuildingSelection && isLocalAnomalyRun),
    retry: false,
  });

  useEffect(() => {
    pointColorModeRef.current = pointColorMode;
  }, [pointColorMode]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initialCameraMode = useAppStore.getState().cameraMode;
    const initialPreset = isSatelliteCameraMode(initialCameraMode)
      ? satelliteCameraPresets[initialCameraMode]
      : null;
    cameraModeRef.current = initialCameraMode;
    previousCameraModeRef.current = initialCameraMode;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: basemaps[basemapId].style,
      center: [13.05, 47.8],
      zoom: 12,
      pitch: initialPreset?.pitch ?? DEFAULT_MAP_PITCH,
      bearing: initialPreset?.bearing ?? DEFAULT_MAP_BEARING,
      hash: true,
    });

    basemapRef.current = basemapId;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }));

    const updateBBox = () => {
      const bounds = map.getBounds();
      setMapBBox([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    };

    const handleMoveEnd = () => {
      updateBBox();
      if (cameraModeRef.current === "default") {
        lastFreeCameraRef.current = {
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };
        return;
      }

      applyCameraMode(map, cameraModeRef.current, lastFreeCameraRef.current, false);
    };

    map.on("style.load", () => {
      addCoreSourcesAndLayers(map);
      const state = useAppStore.getState();
      applyLayerVisibility(map, state.layers, state.showTrackOutlines);
      applyTrackOutlineStyle(map, state.showTrackOutlines);
      applyFilters(map, state.filters, state.filtersEnabled);
      applySelection(map, state.selection);
      setCameraInteractionLock(map, state.cameraMode !== "default");
      if (isSatelliteCameraMode(state.cameraMode)) {
        applyCameraMode(map, state.cameraMode, lastFreeCameraRef.current, false);
      }
      updateBBox();
      setStyleVersion((value) => value + 1);
    });

    map.on("mousemove", (event) => handleHover(event, map));
    map.on("click", (event) => handleClick(event, map));
    map.on("moveend", handleMoveEnd);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      basemapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (basemapRef.current === basemapId) return;
    basemapRef.current = basemapId;
    // Force a full style swap so background styles can't keep stale overlay ordering.
    mapRef.current.setStyle(basemaps[basemapId].style, { diff: false });
  }, [basemapId]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const previousMode = previousCameraModeRef.current;

    if (previousMode === "default" && cameraMode !== "default") {
      lastFreeCameraRef.current = {
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      };
    }

    setCameraInteractionLock(map, cameraMode !== "default");
    applyCameraMode(map, cameraMode, lastFreeCameraRef.current, true);
    previousCameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (map.getLayer("relief_hillshade")) {
      map.setPaintProperty("relief_hillshade", "raster-opacity", getReliefOpacity(basemapId));
    }
  }, [basemapId]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyLayerVisibility(mapRef.current, layers, showTrackOutlines);
  }, [layers, showTrackOutlines, styleVersion]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyBasePointColors(mapRef.current, pointColorMode, heightSensitivityM);
  }, [pointColorMode, heightSensitivityM, styleVersion]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyTrackOutlineStyle(mapRef.current, showTrackOutlines);
  }, [showTrackOutlines, styleVersion]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyFilters(mapRef.current, filters, filtersEnabled);
  }, [filters, filtersEnabled, styleVersion]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    removeMlLayersAndSources(map);
    if (!activeRunId) {
      ensureLayerOrder(map);
      return;
    }

    const colorExpression = getMlColorExpression(mlView);
    const buildingColorExpression = getMlBuildingColorExpression(mlView);

    addSourceIfMissing(map, "ml_points", {
      type: "vector",
      tiles: [
        `${apiBase}/api/ml/runs/${activeRunId}/tiles/{z}/{x}/{y}.pbf?v=${mlTileVersion}&sv=${styleVersion}`,
      ],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });

    addSourceIfMissing(map, "ml_buildings", {
      type: "vector",
      tiles: [
        `${apiBase}/api/ml/runs/${activeRunId}/buildings/{z}/{x}/{y}.pbf?v=${mlTileVersion}&sv=${styleVersion}`,
      ],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });

    addLayerIfMissing(map, {
      id: "ml_buildings_flat",
      type: "fill",
      source: "ml_buildings",
      "source-layer": "ml_buildings",
      paint: {
        "fill-color": buildingColorExpression,
        "fill-opacity": 0.35,
      },
      layout: {
        visibility: showMlBuildings ? "visible" : "none",
      },
    });

    addLayerIfMissing(map, {
      id: "ml_buildings_fill",
      type: "fill-extrusion",
      source: "ml_buildings",
      "source-layer": "ml_buildings",
      paint: {
        "fill-extrusion-color": buildingColorExpression,
        "fill-extrusion-height": mlBuildingHeightExpression,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.6,
      },
      layout: {
        visibility: showMlBuildings ? "visible" : "none",
      },
    });

    addLayerIfMissing(map, {
      id: "ml_buildings_outline",
      type: "line",
      source: "ml_buildings",
      "source-layer": "ml_buildings",
      paint: {
        "line-color": buildingColorExpression,
        "line-opacity": 0.95,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          1.6,
          14,
          2.6,
          18,
          3.4,
        ],
      },
      layout: {
        visibility: showMlBuildings ? "visible" : "none",
      },
    });

    addLayerIfMissing(map, {
      id: "ml_points",
      type: "circle",
      source: "ml_points",
      "source-layer": "ml_points",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          2,
          12,
          3,
          14,
          5,
          16,
          7,
          20,
          9,
          22,
          10,
        ],
        "circle-color": colorExpression,
        "circle-opacity": 0.85,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#ffffff",
      },
      layout: {
        visibility: showMlLayer ? "visible" : "none",
      },
    });

    ensureLayerOrder(map);
  }, [activeRunId, mlTileVersion, styleVersion]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (mapRef.current.getLayer("ml_points")) {
      mapRef.current.setLayoutProperty(
        "ml_points",
        "visibility",
        showMlLayer ? "visible" : "none"
      );
    }
    if (mapRef.current.getLayer("ml_buildings_fill")) {
      mapRef.current.setLayoutProperty(
        "ml_buildings_fill",
        "visibility",
        showMlBuildings ? "visible" : "none"
      );
    }
    if (mapRef.current.getLayer("ml_buildings_flat")) {
      mapRef.current.setLayoutProperty(
        "ml_buildings_flat",
        "visibility",
        showMlBuildings ? "visible" : "none"
      );
    }
    if (mapRef.current.getLayer("ml_buildings_outline")) {
      mapRef.current.setLayoutProperty(
        "ml_buildings_outline",
        "visibility",
        showMlBuildings ? "visible" : "none"
      );
    }
    ensureLayerOrder(map);
  }, [showMlLayer, showMlBuildings, styleVersion]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getLayer("ml_points")) return;
    const map = mapRef.current;
    const pointColorExpression = getMlColorExpression(mlView);
    const buildingColorExpression = getMlBuildingColorExpression(mlView);
    map.setPaintProperty("ml_points", "circle-color", pointColorExpression as any);
    if (map.getLayer("ml_buildings_flat")) {
      map.setPaintProperty("ml_buildings_flat", "fill-color", buildingColorExpression as any);
    }
    if (map.getLayer("ml_buildings_fill")) {
      map.setPaintProperty(
        "ml_buildings_fill",
        "fill-extrusion-color",
        buildingColorExpression as any
      );
    }
    if (map.getLayer("ml_buildings_outline")) {
      map.setPaintProperty("ml_buildings_outline", "line-color", buildingColorExpression as any);
    }
    ensureLayerOrder(map);
  }, [mlView, activeRunId, styleVersion]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    const map = mapRef.current;

    const restack = () => {
      if (!map.getStyle()) return;
      ensureLayerOrder(map);
      applyMlBuildingFocusFilters(
        map,
        mlBuildingTrackFilter,
        mlBuildingShowExcluded,
        mlBuildingShowHulls
      );
    };

    restack();
    const frameId = window.requestAnimationFrame(restack);
    const timeoutId = window.setTimeout(restack, 250);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [styleVersion, mlBuildingTrackFilter, mlBuildingShowExcluded, mlBuildingShowHulls]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    const map = mapRef.current;

    if (
      !isLocalAnomalyRun ||
      !focusBuildingSelection ||
      !focusPointsQuery.data?.feature_collection ||
      !focusContextQuery.data?.building
    ) {
      removeMlBuildingFocusLayersAndSources(map);
      ensureLayerOrder(map);
      return;
    }

    addOrUpdateGeoJsonSource(map, "ml_focus_building", {
      type: "FeatureCollection",
      features: [focusContextQuery.data.building],
    });
    addOrUpdateGeoJsonSource(map, "ml_focus_candidates", focusContextQuery.data.candidate_areas);
    addOrUpdateGeoJsonSource(map, "ml_focus_hulls", focusContextQuery.data.cluster_hulls);
    addOrUpdateGeoJsonSource(map, "ml_focus_points", focusPointsQuery.data.feature_collection);
    addMlBuildingFocusLayers(map);
    applyMlBuildingFocusFilters(
      map,
      mlBuildingTrackFilter,
      mlBuildingShowExcluded,
      mlBuildingShowHulls
    );
    ensureLayerOrder(map);
  }, [
    focusBuildingSelection,
    focusContextQuery.data,
    focusPointsQuery.data,
    isLocalAnomalyRun,
    mlBuildingShowExcluded,
    mlBuildingShowHulls,
    mlBuildingTrackFilter,
    styleVersion,
  ]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyMlBuildingFocusFilters(
      mapRef.current,
      mlBuildingTrackFilter,
      mlBuildingShowExcluded,
      mlBuildingShowHulls
    );
  }, [mlBuildingTrackFilter, mlBuildingShowExcluded, mlBuildingShowHulls]);

  useEffect(() => {
    if (!mapRef.current || !focusContextQuery.data?.bounds?.length || !focusBuildingSelection) return;
    if (!isLocalAnomalyRun) return;
    const [minLon, minLat, maxLon, maxLat] = focusContextQuery.data.bounds;
    mapRef.current.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 80, duration: 700, maxZoom: 18 }
    );
  }, [focusBuildingSelection?.id, focusContextQuery.data?.bounds, isLocalAnomalyRun]);

  useEffect(() => {
    if (!mapRef.current) return;
    applySelection(mapRef.current, selection);
  }, [selection]);

  function getMlColorExpression(view: typeof mlView) {
    if (view === "quality") return qualityExpression;
    if (view === "anomaly") return anomalyExpression;
    if (view === "cross-track") return crossTrackExpression;
    if (view === "reliability") return pointReliabilityExpression;
    if (view === "cluster") return mlClusterColorExpression;
    return mlClusterColorExpression;
  }

  function getMlBuildingColorExpression(view: typeof mlView) {
    if (view === "quality") return buildingReliabilityScoreExpression;
    if (view === "anomaly") return buildingMotionExpression;
    if (view === "cross-track") return buildingCrossTrackExpression;
    if (view === "reliability") return buildingReliabilityBandExpression;
    return mlBuildingColorExpression;
  }

  function addSourceIfMissing(map: MapLibreMap, id: string, source: any) {
    if (!map.getSource(id)) {
      map.addSource(id, source);
    }
  }

  function addOrUpdateGeoJsonSource(map: MapLibreMap, id: string, data: any) {
    const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource(id, {
      type: "geojson",
      data,
    });
  }

  function addLayerIfMissing(map: MapLibreMap, layer: any) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }

  function ensureLayerOrder(map: MapLibreMap) {
    // Move operational layers above any basemap style layers (including satellite raster).
    const orderedLayerIds = [
      "relief_hillshade",
      "relief_slope",
      "osm",
      "gba",
      "ml_buildings_flat",
      "ml_buildings_fill",
      "ml_buildings_outline",
      "ml_focus_candidate_fill",
      "ml_focus_candidate_line",
      "ml_focus_hulls_fill",
      "ml_focus_hulls_line",
      "ml_focus_points_excluded",
      "ml_focus_points_noise",
      "ml_focus_points_core",
      "ml_focus_building_outline",
      "insar_t44_outline",
      "insar_t44",
      "insar_t95_outline",
      "insar_t95",
      "ml_points",
      "insar_selected_t44",
      "insar_selected_t95",
      "gba_highlight",
      "osm_highlight",
    ];
    for (const layerId of orderedLayerIds) {
      if (map.getLayer(layerId)) {
        map.moveLayer(layerId);
      }
    }
  }

  function addMlBuildingFocusLayers(map: MapLibreMap) {
    addLayerIfMissing(map, {
      id: "ml_focus_candidate_fill",
      type: "fill",
      source: "ml_focus_candidates",
      paint: {
        "fill-color": focusCandidateColorExpression,
        "fill-opacity": 0.12,
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_candidate_line",
      type: "line",
      source: "ml_focus_candidates",
      paint: {
        "line-color": focusCandidateLineExpression,
        "line-width": 1.6,
        "line-opacity": 0.9,
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_hulls_fill",
      type: "fill",
      source: "ml_focus_hulls",
      paint: {
        "fill-color": clusterPaletteExpression,
        "fill-opacity": 0.18,
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_hulls_line",
      type: "line",
      source: "ml_focus_hulls",
      paint: {
        "line-color": clusterPaletteExpression,
        "line-width": 2,
        "line-opacity": 0.95,
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_building_outline",
      type: "line",
      source: "ml_focus_building",
      paint: {
        "line-color": "#111827",
        "line-width": 2.4,
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_points_core",
      type: "circle",
      source: "ml_focus_points",
      paint: {
        "circle-radius": 7,
        "circle-color": mlClusterColorExpression,
        "circle-opacity": 0.96,
        "circle-stroke-width": 1.2,
        "circle-stroke-color": "#ffffff",
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_points_noise",
      type: "circle",
      source: "ml_focus_points",
      paint: {
        "circle-radius": 8,
        "circle-color": "#c6372a",
        "circle-opacity": 0.98,
        "circle-stroke-width": 1.4,
        "circle-stroke-color": "#ffffff",
      },
    });

    addLayerIfMissing(map, {
      id: "ml_focus_points_excluded",
      type: "circle",
      source: "ml_focus_points",
      paint: {
        "circle-radius": 6,
        "circle-color": "#9aa0a6",
        "circle-opacity": 0.4,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#f9fafb",
      },
    });
  }

  function removeMlBuildingFocusLayersAndSources(map: MapLibreMap) {
    const layerIds = [
      "ml_focus_points_excluded",
      "ml_focus_points_noise",
      "ml_focus_points_core",
      "ml_focus_hulls_line",
      "ml_focus_hulls_fill",
      "ml_focus_candidate_line",
      "ml_focus_candidate_fill",
      "ml_focus_building_outline",
    ];
    const sourceIds = ["ml_focus_points", "ml_focus_hulls", "ml_focus_candidates", "ml_focus_building"];
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    for (const sourceId of sourceIds) {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }
  }

  function trackFilterExpression(trackFilter: "both" | "44" | "95") {
    if (trackFilter === "both") {
      return null;
    }
    return ["==", ["get", "track"], Number(trackFilter)] as any;
  }

  function applyMlBuildingFocusFilters(
    map: MapLibreMap,
    trackFilter: "both" | "44" | "95",
    showExcluded: boolean,
    showHulls: boolean
  ) {
    const trackExpr = trackFilterExpression(trackFilter);
    const coreFilter = [
      "all",
      ...(trackExpr ? [trackExpr] : []),
      ["==", ["get", "gate_excluded"], false],
      ["!=", ["get", "cluster_role"], "noise"],
    ] as any;
    const noiseFilter = [
      "all",
      ...(trackExpr ? [trackExpr] : []),
      ["==", ["get", "gate_excluded"], false],
      ["==", ["get", "cluster_role"], "noise"],
    ] as any;
    const excludedFilter = showExcluded
      ? (["all", ...(trackExpr ? [trackExpr] : []), ["==", ["get", "gate_excluded"], true]] as any)
      : (["==", ["get", "code"], ""] as any);
    const areaFilter = trackExpr ?? null;

    if (map.getLayer("ml_focus_points_core")) {
      map.setFilter("ml_focus_points_core", coreFilter);
    }
    if (map.getLayer("ml_focus_points_noise")) {
      map.setFilter("ml_focus_points_noise", noiseFilter);
    }
    if (map.getLayer("ml_focus_points_excluded")) {
      map.setFilter("ml_focus_points_excluded", excludedFilter);
    }
    if (map.getLayer("ml_focus_candidate_fill")) {
      map.setFilter("ml_focus_candidate_fill", areaFilter);
    }
    if (map.getLayer("ml_focus_candidate_line")) {
      map.setFilter("ml_focus_candidate_line", areaFilter);
    }
    if (map.getLayer("ml_focus_hulls_fill")) {
      map.setFilter("ml_focus_hulls_fill", showHulls ? areaFilter : ["==", ["get", "cluster_id"], ""]);
    }
    if (map.getLayer("ml_focus_hulls_line")) {
      map.setFilter("ml_focus_hulls_line", showHulls ? areaFilter : ["==", ["get", "cluster_id"], ""]);
    }
  }

  function addCoreSourcesAndLayers(map: MapLibreMap) {
    const currentBasemapId = useAppStore.getState().basemapId;
    const {
      pointColorMode: currentPointColorMode,
      heightSensitivityM: currentHeightSensitivityM,
      showTrackOutlines: currentShowTrackOutlines,
    } = useAppStore.getState();
    const pointColorExpression = getBasePointColorExpression(
      currentPointColorMode,
      currentHeightSensitivityM
    );
    addSourceIfMissing(map, "insar_t44", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/insar_t44/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });
    addSourceIfMissing(map, "insar_t95", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/insar_t95/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });
    addSourceIfMissing(map, "gba", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/gba/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 15,
    });
    addSourceIfMissing(map, "osm", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/osm/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 15,
    });
    addSourceIfMissing(map, "relief_hillshade", {
      type: "raster",
      tiles: [`${apiBase}/raster/relief_hillshade/{z}/{x}/{y}.png`],
      tileSize: 256,
      minzoom: 8,
      maxzoom: 15,
    });
    addSourceIfMissing(map, "relief_slope", {
      type: "raster",
      tiles: [`${apiBase}/raster/relief_slope/{z}/{x}/{y}.png`],
      tileSize: 256,
      minzoom: 8,
      maxzoom: 15,
    });

    addLayerIfMissing(map, {
      id: "relief_hillshade",
      type: "raster",
      source: "relief_hillshade",
      paint: {
        "raster-opacity": getReliefOpacity(currentBasemapId),
        "raster-resampling": "linear",
      },
      layout: {
        visibility: "none",
      },
    });

    addLayerIfMissing(map, {
      id: "relief_slope",
      type: "raster",
      source: "relief_slope",
      paint: {
        "raster-opacity": 0.45,
        "raster-resampling": "nearest",
      },
      layout: {
        visibility: "none",
      },
    });

    addLayerIfMissing(map, {
      id: "insar_t44_outline",
      type: "circle",
      source: "insar_t44",
      "source-layer": "insar_t44",
      paint: {
        "circle-radius": trackOutlineRingRadiusExpression,
        "circle-color": "rgba(0, 0, 0, 0)",
        "circle-stroke-width": trackOutlineRingStrokeWidthExpression,
        "circle-stroke-color": TRACK_44_OUTLINE_COLOR,
      },
      layout: {
        visibility: currentShowTrackOutlines ? "visible" : "none",
      },
    });

    addLayerIfMissing(map, {
      id: "insar_t44",
      type: "circle",
      source: "insar_t44",
      "source-layer": "insar_t44",
      paint: {
        "circle-radius": basePointRadiusExpression,
        "circle-color": pointColorExpression,
        "circle-opacity": 1,
        "circle-stroke-width": currentShowTrackOutlines ? basePointInnerStrokeWidthExpression : 0,
        "circle-stroke-color": TRACK_OUTLINE_SEPARATOR_COLOR,
      },
    });

    addLayerIfMissing(map, {
      id: "insar_t95_outline",
      type: "circle",
      source: "insar_t95",
      "source-layer": "insar_t95",
      paint: {
        "circle-radius": trackOutlineRingRadiusExpression,
        "circle-color": "rgba(0, 0, 0, 0)",
        "circle-stroke-width": trackOutlineRingStrokeWidthExpression,
        "circle-stroke-color": TRACK_95_OUTLINE_COLOR,
      },
      layout: {
        visibility: currentShowTrackOutlines ? "visible" : "none",
      },
    });

    addLayerIfMissing(map, {
      id: "insar_t95",
      type: "circle",
      source: "insar_t95",
      "source-layer": "insar_t95",
      paint: {
        "circle-radius": basePointRadiusExpression,
        "circle-color": pointColorExpression,
        "circle-opacity": 1,
        "circle-stroke-width": currentShowTrackOutlines ? basePointInnerStrokeWidthExpression : 0,
        "circle-stroke-color": TRACK_OUTLINE_SEPARATOR_COLOR,
      },
    });

    addLayerIfMissing(map, {
      id: "gba",
      type: "fill-extrusion",
      source: "gba",
      "source-layer": "gba",
      paint: {
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#4aa5d5",
        "fill-extrusion-opacity": 0.6,
      },
    });

    addLayerIfMissing(map, {
      id: "osm",
      type: "fill",
      source: "osm",
      "source-layer": "osm",
      paint: {
        "fill-color": "#c9c6bf",
        "fill-opacity": 0.5,
      },
    });

    addLayerIfMissing(map, {
      id: "insar_selected_t44",
      type: "circle",
      source: "insar_t44",
      "source-layer": "insar_t44",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#e27d3f",
      },
      filter: ["==", ["get", "code"], ""],
    });

    addLayerIfMissing(map, {
      id: "insar_selected_t95",
      type: "circle",
      source: "insar_t95",
      "source-layer": "insar_t95",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#e27d3f",
      },
      filter: ["==", ["get", "code"], ""],
    });

    addLayerIfMissing(map, {
      id: "gba_highlight",
      type: "line",
      source: "gba",
      "source-layer": "gba",
      paint: {
        "line-color": "#e27d3f",
        "line-width": 2,
      },
      filter: ["==", ["get", "gba_id"], ""],
    });

    addLayerIfMissing(map, {
      id: "osm_highlight",
      type: "line",
      source: "osm",
      "source-layer": "osm",
      paint: {
        "line-color": "#e27d3f",
        "line-width": 2,
      },
      filter: ["==", ["get", "osm_id"], ""],
    });

    ensureLayerOrder(map);
  }

  function removeMlLayersAndSources(map: MapLibreMap) {
    if (map.getLayer("ml_points")) map.removeLayer("ml_points");
    if (map.getLayer("ml_buildings_outline")) map.removeLayer("ml_buildings_outline");
    if (map.getLayer("ml_buildings_fill")) map.removeLayer("ml_buildings_fill");
    if (map.getLayer("ml_buildings_flat")) map.removeLayer("ml_buildings_flat");
    if (map.getSource("ml_points")) map.removeSource("ml_points");
    if (map.getSource("ml_buildings")) map.removeSource("ml_buildings");
  }

  function applySelection(map: MapLibreMap, currentSelection: typeof selection) {
    if (!currentSelection) {
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter("insar_selected_t44", ["==", ["get", "code"], ""]);
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter("insar_selected_t95", ["==", ["get", "code"], ""]);
      }
      if (map.getLayer("gba_highlight")) {
        map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
      }
      if (map.getLayer("osm_highlight")) {
        map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
      }
      return;
    }

    if (currentSelection.type === "point") {
      const show44 =
        currentSelection.track === 44 || currentSelection.track === undefined;
      const show95 =
        currentSelection.track === 95 || currentSelection.track === undefined;
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter(
          "insar_selected_t44",
          show44
            ? ["==", ["get", "code"], currentSelection.code]
            : ["==", ["get", "code"], ""]
        );
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter(
          "insar_selected_t95",
          show95
            ? ["==", ["get", "code"], currentSelection.code]
            : ["==", ["get", "code"], ""]
        );
      }
      if (map.getLayer("gba_highlight")) {
        map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
      }
      if (map.getLayer("osm_highlight")) {
        map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
      }
    } else {
      if (currentSelection.source === "gba") {
        if (map.getLayer("gba_highlight")) {
          map.setFilter("gba_highlight", [
            "==",
            ["get", "gba_id"],
            currentSelection.id,
          ]);
        }
        if (map.getLayer("osm_highlight")) {
          map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
        }
      } else {
        if (map.getLayer("osm_highlight")) {
          map.setFilter("osm_highlight", [
            "==",
            ["get", "osm_id"],
            currentSelection.id,
          ]);
        }
        if (map.getLayer("gba_highlight")) {
          map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
        }
      }
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter("insar_selected_t44", ["==", ["get", "code"], ""]);
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter("insar_selected_t95", ["==", ["get", "code"], ""]);
      }
    }
  }

  function applyLayerVisibility(
    map: MapLibreMap,
    vis: typeof layers,
    showTrackOutlines: boolean
  ) {
    if (map.getLayer("insar_t44_outline")) {
      map.setLayoutProperty(
        "insar_t44_outline",
        "visibility",
        vis.insar44 && showTrackOutlines ? "visible" : "none"
      );
    }
    if (map.getLayer("insar_t44")) {
      map.setLayoutProperty("insar_t44", "visibility", vis.insar44 ? "visible" : "none");
    }
    if (map.getLayer("insar_t95_outline")) {
      map.setLayoutProperty(
        "insar_t95_outline",
        "visibility",
        vis.insar95 && showTrackOutlines ? "visible" : "none"
      );
    }
    if (map.getLayer("insar_t95")) {
      map.setLayoutProperty("insar_t95", "visibility", vis.insar95 ? "visible" : "none");
    }
    if (map.getLayer("relief_hillshade")) {
      map.setLayoutProperty(
        "relief_hillshade",
        "visibility",
        vis.reliefHillshade ? "visible" : "none"
      );
    }
    if (map.getLayer("relief_slope")) {
      map.setLayoutProperty("relief_slope", "visibility", vis.reliefSlope ? "visible" : "none");
    }
    if (map.getLayer("gba")) {
      map.setLayoutProperty("gba", "visibility", vis.gba ? "visible" : "none");
    }
    if (map.getLayer("osm")) {
      map.setLayoutProperty("osm", "visibility", vis.osm ? "visible" : "none");
    }
  }

  function applyFilters(
    map: MapLibreMap,
    filterState: typeof filters,
    enabled: boolean
  ) {
    if (!enabled) {
      if (map.getLayer("insar_t44_outline")) {
        map.setFilter("insar_t44_outline", null);
      }
      if (map.getLayer("insar_t44")) {
        map.setFilter("insar_t44", null);
      }
      if (map.getLayer("insar_t95_outline")) {
        map.setFilter("insar_t95_outline", null);
      }
      if (map.getLayer("insar_t95")) {
        map.setFilter("insar_t95", null);
      }
      return;
    }
    const filterExpr = [
      "all",
      [">=", ["get", "velocity"], filterState.velocityMin],
      ["<=", ["get", "velocity"], filterState.velocityMax],
      [">=", ["get", "coherence"], filterState.coherenceMin],
    ] as any;
    if (map.getLayer("insar_t44_outline")) {
      map.setFilter("insar_t44_outline", filterExpr);
    }
    if (map.getLayer("insar_t44")) {
      map.setFilter("insar_t44", filterExpr);
    }
    if (map.getLayer("insar_t95_outline")) {
      map.setFilter("insar_t95_outline", filterExpr);
    }
    if (map.getLayer("insar_t95")) {
      map.setFilter("insar_t95", filterExpr);
    }
  }

  function handleHover(event: MapMouseEvent, map: MapLibreMap) {
    const queryLayers = ["insar_t44", "insar_t95", "gba", "osm"];
    if (map.getLayer("ml_focus_points_core")) {
      queryLayers.unshift("ml_focus_points_core");
    }
    if (map.getLayer("ml_focus_points_noise")) {
      queryLayers.unshift("ml_focus_points_noise");
    }
    if (map.getLayer("ml_focus_points_excluded")) {
      queryLayers.unshift("ml_focus_points_excluded");
    }
    if (map.getLayer("ml_focus_building_outline")) {
      queryLayers.unshift("ml_focus_building_outline");
    }
    if (map.getLayer("ml_points")) {
      queryLayers.push("ml_points");
    }
    if (map.getLayer("ml_buildings_outline")) {
      queryLayers.push("ml_buildings_outline");
    }
    const features = map.queryRenderedFeatures(event.point, {
      layers: queryLayers,
    });
    if (!features.length) {
      map.getCanvas().style.cursor = "";
      setTooltip(null);
      return;
    }
    map.getCanvas().style.cursor = "pointer";
    const feature = features[0];
    if (!feature || !feature.properties) {
      setTooltip(null);
      return;
    }

    const props = feature.properties as any;
    let html = "";

    if (feature.layer.id === "ml_buildings_outline") {
      html = formatMlBuildingTooltip(props, "Assigned Building");
    } else if (feature.layer.id.startsWith("ml_focus_points")) {
      html = `
        <strong>Building Focus Point</strong><br/>
        Code: ${props.code || "—"}<br/>
        Track: ${props.track || "—"}<br/>
        Cluster: ${props.cluster_id || props.cluster_role || "—"}${
          props.is_main_cluster ? " (main)" : ""
        }<br/>
        Rank: ${props.cluster_rank ?? "—"}<br/>
        Quality: ${
          props.quality_score !== undefined && props.quality_score !== null
            ? Number(props.quality_score).toFixed(2)
            : "—"
        }<br/>
        Anomaly: ${
          props.anomaly_score !== undefined && props.anomaly_score !== null
            ? Number(props.anomaly_score).toFixed(2)
            : "—"
        }<br/>
        Gate: ${
          Array.isArray(props.gate_reasons) && props.gate_reasons.length > 0
            ? props.gate_reasons.join(", ")
            : props.gate_excluded
              ? "excluded"
              : "kept"
        }${formatNeighbourPointTooltipLines(props)}
      `;
    } else if (feature.layer.id === "ml_focus_building_outline") {
      html = `
        <strong>Building Focus</strong><br/>
        Cluster hulls and candidate buffers are active for this building.
      `;
    } else if (feature.layer.id.startsWith("ml_buildings")) {
      html = formatMlBuildingTooltip(props, "ML Building");
    } else if (feature.layer.id === "ml_points") {
      html = `
        <strong>ML Result</strong><br/>
        Label: ${props.label || props.cluster_id || "—"}<br/>
        Building: ${props.building_id || "—"}<br/>
        Main cluster: ${props.is_main_cluster ? "yes" : "no"}<br/>
        Quality: ${
          props.quality_score !== undefined && props.quality_score !== null
            ? Number(props.quality_score).toFixed(2)
            : "—"
        }<br/>
        Anomaly: ${
          props.anomaly_score !== undefined && props.anomaly_score !== null
            ? Number(props.anomaly_score).toFixed(2)
            : "—"
        }<br/>
        Cross-track: ${
          props.cross_track_consistency !== undefined && props.cross_track_consistency !== null
            ? Number(props.cross_track_consistency).toFixed(2)
            : "—"
        }${formatNeighbourPointTooltipLines(props)}<br/>
        Reason: ${props.top_reason || props.degraded_reason || props.method || "—"}
      `;
    } else if (feature.layer.id.startsWith("insar")) {
      const currentPointColorMode = pointColorModeRef.current;
      const heightValue =
        props.height !== undefined && props.height !== null
          ? `${formatHeightLegendValue(Number(props.height))} m`
          : "—";
      const velocityValue =
        props.velocity !== undefined && props.velocity !== null
          ? `${Number(props.velocity).toFixed(2)} mm/yr`
          : "—";
      const coherenceValue =
        props.coherence !== undefined && props.coherence !== null
          ? Number(props.coherence).toFixed(2)
          : "—";
      html = `
        <strong>InSAR Point</strong><br/>
        Code: ${props.code || "—"}<br/>
        ${
          currentPointColorMode === "height"
            ? `<strong>Height: ${heightValue}</strong><br/>`
            : ""
        }
        Velocity: ${velocityValue}<br/>
        Coherence: ${coherenceValue}<br/>
        ${
          currentPointColorMode === "height"
            ? "Color mode: InSAR height"
            : `Height: ${heightValue}`
        }
      `;
    } else if (feature.layer.id === "gba") {
      html = `
        <strong>GBA Building</strong><br/>
        Height: ${Number(props.height || 0).toFixed(1)} m
      `;
    } else if (feature.layer.id === "osm") {
      html = `
        <strong>OSM Building</strong><br/>
        ${props.name || "Unnamed"}<br/>
        Type: ${props.building_type || "—"}
      `;
    }

    setTooltip({ x: event.point.x + 12, y: event.point.y + 12, html });
  }

  function handleClick(event: MapMouseEvent, map: MapLibreMap) {
    const queryLayers = ["insar_t44", "insar_t95", "gba", "osm"];
    if (map.getLayer("ml_focus_points_core")) {
      queryLayers.unshift("ml_focus_points_core");
    }
    if (map.getLayer("ml_focus_points_noise")) {
      queryLayers.unshift("ml_focus_points_noise");
    }
    if (map.getLayer("ml_focus_points_excluded")) {
      queryLayers.unshift("ml_focus_points_excluded");
    }
    if (map.getLayer("ml_focus_building_outline")) {
      queryLayers.unshift("ml_focus_building_outline");
    }
    if (map.getLayer("ml_points")) {
      queryLayers.unshift("ml_points");
    }
    if (map.getLayer("ml_buildings_flat")) {
      queryLayers.unshift("ml_buildings_flat");
    }
    if (map.getLayer("ml_buildings_fill")) {
      queryLayers.unshift("ml_buildings_fill");
    }
    if (map.getLayer("ml_buildings_outline")) {
      queryLayers.unshift("ml_buildings_outline");
    }
    const features = map.queryRenderedFeatures(event.point, {
      layers: queryLayers,
    });
    if (!features.length) {
      setSelection(null);
      return;
    }

    const feature = features[0];
    const props = feature.properties as any;

    if (feature.layer.id.startsWith("ml_focus_points")) {
      if (props.code) {
        setSelection({
          type: "point",
          code: String(props.code),
          track: props.track === undefined || props.track === null ? undefined : Number(props.track),
        });
      }
    } else if (feature.layer.id.startsWith("ml_buildings")) {
      if (props.building_id && props.building_source) {
        setSelection({
          type: "building",
          source: props.building_source,
          id: String(props.building_id),
        });
      }
    } else if (feature.layer.id === "ml_points") {
      if (props.code) {
        setSelection({
          type: "point",
          code: String(props.code),
          track: props.track === undefined || props.track === null ? undefined : Number(props.track),
        });
      }
    } else if (feature.layer.id.startsWith("insar")) {
      const track = feature.layer.id === "insar_t44" ? 44 : 95;
      if (props.code) {
        setSelection({ type: "point", code: props.code, track });
      }
    } else if (feature.layer.id === "gba") {
      if (props.gba_id) {
        setSelection({ type: "building", source: "gba", id: String(props.gba_id) });
      }
    } else if (feature.layer.id === "osm") {
      if (props.osm_id) {
        setSelection({ type: "building", source: "osm", id: String(props.osm_id) });
      }
    }
  }

  return (
    <div className="map" ref={mapContainer}>
      {activeSatellitePreset && (
        <div className="map-camera-badge">
          <span className="badge">{activeSatellitePreset.overlayTitle}</span>
          <span>{activeSatellitePreset.overlayText}</span>
        </div>
      )}
      {tooltip && (
        <div
          className="tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
