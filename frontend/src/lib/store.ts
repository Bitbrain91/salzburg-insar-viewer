import { create } from "zustand";
import type { BasemapId } from "./basemaps";
import type { CameraMode } from "./cameraModes";
import {
  DEFAULT_AREA_ID,
  getTrackVisibilityKey,
} from "./configMetadata";
import type { PointColorMode } from "./pointStyling";
import type { MlClusterKind } from "./mlClusterKind";

export type BuildingSource = "bev" | "gba" | "osm";

export type LayerVisibility = {
  insarTracks: Record<string, boolean>;
  reliefHillshade: boolean;
  reliefSlope: boolean;
  bev: boolean;
  gba: boolean;
  osm: boolean;
};
export type SimpleLayerVisibilityKey = Exclude<keyof LayerVisibility, "insarTracks">;
export type MlBuildingTrackFilter = "all" | `${string}:${number}`;
export type MlBuildingPointFocusMode = "run" | "building" | "scored" | "cluster";
export type MlBuildingFocusSelection = {
  source: BuildingSource;
  id: string;
  areaId: string;
};
export type MlClusteringFeatures = Record<string, number | null | undefined>;
export type MlFocusExplainReason = {
  key: string;
  severity: number;
  summary: string;
};
export type MlBuildingFocusPoint = {
  code: string;
  track?: number;
  areaId: string;
  datasetId: string;
  sensor?: string;
  runId: string;
  buildingSource: BuildingSource;
  buildingId: string;
  velocity?: number | null;
  velocityStd?: number | null;
  height?: number | null;
  heightStd?: number | null;
  acceleration?: number | null;
  coherence?: number | null;
  clusterId?: string | null;
  clusterRole?: string | null;
  clusterKind?: MlClusterKind | null;
  clusterRank?: number | null;
  isMainCluster?: boolean | null;
  label?: string | null;
  qualityScore?: number | null;
  anomalyScore?: number | null;
  crossTrackConsistency?: number | null;
  distanceM?: number | null;
  gateExcluded?: boolean | null;
  gateReasons?: string[];
  keptForScoring?: boolean | null;
  degradedReason?: string | null;
  clusteringFeatures?: MlClusteringFeatures;
  detectorScores?: Record<string, number>;
  explainTopFeatures?: MlFocusExplainReason[];
};
export type SetSelectionOptions = {
  preserveMlBuildingFocus?: boolean;
};

export type Selection =
  | {
      type: "point";
      code: string;
      track?: number;
      areaId: string;
      datasetId: string;
      sensor?: string;
    }
  | { type: "building"; source: BuildingSource; id: string; areaId: string }
  | null;

export type SearchFocus = {
  requestId: number;
  resultType: "point" | "building" | "ml_run" | "address";
  label: string;
  areaId?: string | null;
  center?: { lon: number; lat: number } | null;
  bbox?: [number, number, number, number] | null;
  external?: boolean;
} | null;

export type Filters = {
  velocityMin: number;
  velocityMax: number;
  coherenceMin: number;
};

export type AppState = {
  layers: LayerVisibility;
  selectedAreaId: string;
  filters: Filters;
  filtersEnabled: boolean;
  selection: Selection;
  basemapId: BasemapId;
  cameraMode: CameraMode;
  pointColorMode: PointColorMode;
  heightSensitivityM: number;
  showTrackOutlines: boolean;
  activeRunId: string | null;
  showMlLayer: boolean;
  showMlBuildings: boolean;
  mlBuildingTrackFilter: MlBuildingTrackFilter;
  mlBuildingShowExcluded: boolean;
  mlBuildingShowHulls: boolean;
  mlBuildingShowNoise: boolean;
  mlBuildingVisibleClusterIds: string[] | null;
  mlBuildingPointFocusMode: MlBuildingPointFocusMode;
  mlBuildingFocusSelection: MlBuildingFocusSelection | null;
  selectedMlBuildingFocusPoint: MlBuildingFocusPoint | null;
  mlView:
    | "cluster"
    | "quality"
    | "anomaly"
    | "cross-track"
    | "reliability";
  mlTileVersion: number;
  mapBBox: [number, number, number, number] | null;
  searchFocus: SearchFocus;
  /** Zeitreihen-Dock manuell eingeklappt (Selektion bleibt erhalten). */
  timeseriesCollapsed: boolean;
  /** Aktiver Tab der linken Spalte; im Store, damit Karte/Inspector ihn öffnen können. */
  activeLeftTab: "map" | "analysis";
  /** BBox eines gehoverten Laufs (gestrichelte Vorschau auf der Karte). */
  hoveredRunBBox: [number, number, number, number] | null;
  /** Im Inspector geöffneter Lauf; jede Karten-Selektion verdrängt ihn. */
  inspectedRunId: string | null;
  /** In der ClusterSection gehoverter Cluster (Hervorhebung der Huelle). */
  hoveredClusterId: string | null;
  setLayer: (key: SimpleLayerVisibilityKey, value: boolean) => void;
  setSelectedAreaId: (areaId: string) => void;
  setInsarTrackVisibility: (
    datasetId: string,
    track: number,
    value: boolean
  ) => void;
  setFilter: (key: keyof Filters, value: number) => void;
  setFiltersEnabled: (enabled: boolean) => void;
  setSelection: (selection: Selection, options?: SetSelectionOptions) => void;
  setBasemapId: (id: BasemapId) => void;
  setCameraMode: (mode: CameraMode) => void;
  setPointColorMode: (mode: PointColorMode) => void;
  setHeightSensitivityM: (value: number) => void;
  setShowTrackOutlines: (show: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  setActiveRunIdClearingFocus: (runId: string | null) => void;
  setShowMlLayer: (show: boolean) => void;
  setShowMlBuildings: (show: boolean) => void;
  setMlBuildingTrackFilter: (value: AppState["mlBuildingTrackFilter"]) => void;
  setMlBuildingShowExcluded: (show: boolean) => void;
  setMlBuildingShowHulls: (show: boolean) => void;
  setMlBuildingShowNoise: (show: boolean) => void;
  setMlBuildingVisibleClusterIds: (clusterIds: string[] | null) => void;
  setMlBuildingPointFocusMode: (mode: MlBuildingPointFocusMode) => void;
  setMlBuildingFocusSelection: (selection: MlBuildingFocusSelection | null) => void;
  clearMlBuildingFocus: () => void;
  setSelectedMlBuildingFocusPoint: (point: MlBuildingFocusPoint | null) => void;
  selectMlBuildingFocusPoint: (point: MlBuildingFocusPoint) => void;
  clearSelectedMlBuildingFocusPoint: () => void;
  toggleMlBuildingClusterVisibility: (clusterId: string, allClusterIds: string[]) => void;
  resetMlBuildingClusterVisibility: () => void;
  setMlView: (view: AppState["mlView"]) => void;
  bumpMlTileVersion: () => void;
  setMapBBox: (bbox: [number, number, number, number] | null) => void;
  setSearchFocus: (focus: SearchFocus) => void;
  setTimeseriesCollapsed: (collapsed: boolean) => void;
  setActiveLeftTab: (tab: "map" | "analysis") => void;
  setHoveredRunBBox: (bbox: [number, number, number, number] | null) => void;
  setInspectedRunId: (runId: string | null) => void;
  setHoveredClusterId: (clusterId: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  layers: {
    insarTracks: {},
    reliefHillshade: false,
    reliefSlope: false,
    bev: true,
    gba: false,
    osm: false,
  },
  selectedAreaId: DEFAULT_AREA_ID,
  filters: {
    velocityMin: -10,
    velocityMax: 10,
    coherenceMin: 0.6,
  },
  filtersEnabled: true,
  selection: null,
  basemapId: "light",
  cameraMode: "default",
  pointColorMode: "velocity",
  heightSensitivityM: 10,
  showTrackOutlines: true,
  activeRunId: null,
  showMlLayer: true,
  showMlBuildings: true,
  mlBuildingTrackFilter: "all",
  mlBuildingShowExcluded: true,
  mlBuildingShowHulls: true,
  mlBuildingShowNoise: true,
  mlBuildingVisibleClusterIds: null,
  mlBuildingPointFocusMode: "building",
  mlBuildingFocusSelection: null,
  selectedMlBuildingFocusPoint: null,
  mlView: "cluster",
  mlTileVersion: 0,
  mapBBox: null,
  searchFocus: null,
  timeseriesCollapsed: false,
  activeLeftTab: "map",
  hoveredRunBBox: null,
  inspectedRunId: null,
  hoveredClusterId: null,
  setLayer: (key, value) =>
    set((state) => ({ layers: { ...state.layers, [key]: value } })),
  setSelectedAreaId: (areaId) =>
    set((state) =>
      state.selectedAreaId === areaId
        ? state
        : {
            selectedAreaId: areaId,
            selection: null,
            cameraMode: "default",
            mlBuildingTrackFilter: "all",
            mlBuildingShowHulls: true,
            mlBuildingShowNoise: true,
            mlBuildingVisibleClusterIds: null,
            mlBuildingPointFocusMode: "building",
            mlBuildingFocusSelection: null,
            selectedMlBuildingFocusPoint: null,
          }
    ),
  setInsarTrackVisibility: (datasetId, track, value) =>
    set((state) => {
      const nextLayers: LayerVisibility = {
        ...state.layers,
        insarTracks: {
          ...state.layers.insarTracks,
          [getTrackVisibilityKey(datasetId, track)]: value,
        },
      };
      return { layers: nextLayers };
    }),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setFiltersEnabled: (enabled) => set(() => ({ filtersEnabled: enabled })),
  setSelection: (selection, options) =>
    set((state) => {
      const keepFocus = options?.preserveMlBuildingFocus ?? false;
      // Jede echte Karten-Selektion verdrängt den Run-Inspector.
      const inspectedRunId = selection ? null : state.inspectedRunId;
      if (selection?.type === "building") {
        return {
          selection,
          inspectedRunId,
          mlBuildingFocusSelection: selection,
          selectedMlBuildingFocusPoint: null,
          mlBuildingShowHulls: true,
          mlBuildingShowNoise: true,
          mlBuildingVisibleClusterIds: null,
          mlBuildingPointFocusMode: "building",
        };
      }
      if (keepFocus) {
        return { selection, inspectedRunId };
      }
      return {
        selection,
        inspectedRunId,
        mlBuildingFocusSelection: null,
        selectedMlBuildingFocusPoint: null,
        mlBuildingShowHulls: true,
        mlBuildingShowNoise: true,
        mlBuildingVisibleClusterIds: null,
        mlBuildingPointFocusMode: "building",
      };
    }),
  setBasemapId: (id) => set(() => ({ basemapId: id })),
  setCameraMode: (mode) => set(() => ({ cameraMode: mode })),
  setPointColorMode: (mode) => set(() => ({ pointColorMode: mode })),
  setHeightSensitivityM: (value) => set(() => ({ heightSensitivityM: value })),
  setShowTrackOutlines: (show) => set(() => ({ showTrackOutlines: show })),
  setActiveRunId: (runId) =>
    set(() => ({
      activeRunId: runId,
      selectedMlBuildingFocusPoint: null,
      mlBuildingShowHulls: true,
      mlBuildingShowNoise: true,
      mlBuildingVisibleClusterIds: null,
      mlBuildingPointFocusMode: "building",
    })),
  setActiveRunIdClearingFocus: (runId) =>
    set(() => ({
      activeRunId: runId,
      selection: null,
      mlBuildingTrackFilter: "all",
      mlBuildingShowExcluded: true,
      mlBuildingShowHulls: true,
      mlBuildingShowNoise: true,
      mlBuildingVisibleClusterIds: null,
      mlBuildingPointFocusMode: "building",
      mlBuildingFocusSelection: null,
      selectedMlBuildingFocusPoint: null,
    })),
  setShowMlLayer: (show) => set(() => ({ showMlLayer: show })),
  setShowMlBuildings: (show) => set(() => ({ showMlBuildings: show })),
  setMlBuildingTrackFilter: (value) => set(() => ({ mlBuildingTrackFilter: value })),
  setMlBuildingShowExcluded: (show) => set(() => ({ mlBuildingShowExcluded: show })),
  setMlBuildingShowHulls: (show) => set(() => ({ mlBuildingShowHulls: show })),
  setMlBuildingShowNoise: (show) => set(() => ({ mlBuildingShowNoise: show })),
  setMlBuildingVisibleClusterIds: (clusterIds) =>
    set(() => ({
      mlBuildingVisibleClusterIds:
        clusterIds === null ? null : Array.from(new Set(clusterIds)),
    })),
  setMlBuildingPointFocusMode: (mode) => set(() => ({ mlBuildingPointFocusMode: mode })),
  setMlBuildingFocusSelection: (selection) =>
    set(() => ({
      mlBuildingFocusSelection: selection,
      selectedMlBuildingFocusPoint: null,
      mlBuildingShowHulls: true,
      mlBuildingShowNoise: true,
      mlBuildingVisibleClusterIds: null,
      mlBuildingPointFocusMode: "building",
    })),
  clearMlBuildingFocus: () =>
    set(() => ({
      mlBuildingFocusSelection: null,
      selectedMlBuildingFocusPoint: null,
    })),
  setSelectedMlBuildingFocusPoint: (point) =>
    set(() => ({ selectedMlBuildingFocusPoint: point })),
  selectMlBuildingFocusPoint: (point) =>
    set((state) => {
      const focusSelection =
        state.mlBuildingFocusSelection ??
        ({
          source: point.buildingSource,
          id: point.buildingId,
          areaId: point.areaId,
        } satisfies MlBuildingFocusSelection);
      return {
        mlBuildingFocusSelection: focusSelection,
        selectedMlBuildingFocusPoint: point,
        selection: {
          type: "building",
          source: focusSelection.source,
          id: focusSelection.id,
          areaId: focusSelection.areaId,
        },
      };
    }),
  clearSelectedMlBuildingFocusPoint: () =>
    set(() => ({ selectedMlBuildingFocusPoint: null })),
  toggleMlBuildingClusterVisibility: (clusterId, allClusterIds) =>
    set((state) => {
      const visible = new Set(state.mlBuildingVisibleClusterIds ?? allClusterIds);
      if (visible.has(clusterId)) {
        visible.delete(clusterId);
      } else {
        visible.add(clusterId);
      }
      return { mlBuildingVisibleClusterIds: Array.from(visible) };
    }),
  resetMlBuildingClusterVisibility: () =>
    set(() => ({ mlBuildingShowNoise: true, mlBuildingVisibleClusterIds: null })),
  setMlView: (view) => set(() => ({ mlView: view })),
  bumpMlTileVersion: () => set((state) => ({ mlTileVersion: state.mlTileVersion + 1 })),
  setMapBBox: (bbox) => set(() => ({ mapBBox: bbox })),
  setSearchFocus: (focus) => set(() => ({ searchFocus: focus })),
  setTimeseriesCollapsed: (collapsed) => set(() => ({ timeseriesCollapsed: collapsed })),
  setActiveLeftTab: (tab) => set(() => ({ activeLeftTab: tab })),
  setHoveredRunBBox: (bbox) => set(() => ({ hoveredRunBBox: bbox })),
  setInspectedRunId: (runId) => set(() => ({ inspectedRunId: runId })),
  setHoveredClusterId: (clusterId) => set(() => ({ hoveredClusterId: clusterId })),
}));
