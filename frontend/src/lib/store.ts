import { create } from "zustand";
import type { BasemapId } from "./basemaps";
import type { CameraMode } from "./cameraModes";
import {
  DEFAULT_AREA_ID,
  getTrackVisibilityKey,
} from "./configMetadata";
import type { PointColorMode } from "./pointStyling";

export type LayerVisibility = {
  insarTracks: Record<string, boolean>;
  reliefHillshade: boolean;
  reliefSlope: boolean;
  gba: boolean;
  osm: boolean;
};
export type SimpleLayerVisibilityKey = Exclude<keyof LayerVisibility, "insarTracks">;
export type MlBuildingTrackFilter = "all" | `${string}:${number}`;

export type Selection =
  | {
      type: "point";
      code: string;
      track?: number;
      areaId: string;
      datasetId: string;
      sensor?: string;
    }
  | { type: "building"; source: "gba" | "osm"; id: string; areaId: string }
  | null;

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
  mlView:
    | "cluster"
    | "quality"
    | "anomaly"
    | "cross-track"
    | "reliability";
  mlTileVersion: number;
  mapBBox: [number, number, number, number] | null;
  setLayer: (key: SimpleLayerVisibilityKey, value: boolean) => void;
  setSelectedAreaId: (areaId: string) => void;
  setInsarTrackVisibility: (
    datasetId: string,
    track: number,
    value: boolean
  ) => void;
  setFilter: (key: keyof Filters, value: number) => void;
  setFiltersEnabled: (enabled: boolean) => void;
  setSelection: (selection: Selection) => void;
  setBasemapId: (id: BasemapId) => void;
  setCameraMode: (mode: CameraMode) => void;
  setPointColorMode: (mode: PointColorMode) => void;
  setHeightSensitivityM: (value: number) => void;
  setShowTrackOutlines: (show: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  setShowMlLayer: (show: boolean) => void;
  setShowMlBuildings: (show: boolean) => void;
  setMlBuildingTrackFilter: (value: AppState["mlBuildingTrackFilter"]) => void;
  setMlBuildingShowExcluded: (show: boolean) => void;
  setMlBuildingShowHulls: (show: boolean) => void;
  setMlView: (view: AppState["mlView"]) => void;
  bumpMlTileVersion: () => void;
  setMapBBox: (bbox: [number, number, number, number] | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  layers: {
    insarTracks: {},
    reliefHillshade: false,
    reliefSlope: false,
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
  mlView: "cluster",
  mlTileVersion: 0,
  mapBBox: null,
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
  setSelection: (selection) => set(() => ({ selection })),
  setBasemapId: (id) => set(() => ({ basemapId: id })),
  setCameraMode: (mode) => set(() => ({ cameraMode: mode })),
  setPointColorMode: (mode) => set(() => ({ pointColorMode: mode })),
  setHeightSensitivityM: (value) => set(() => ({ heightSensitivityM: value })),
  setShowTrackOutlines: (show) => set(() => ({ showTrackOutlines: show })),
  setActiveRunId: (runId) => set(() => ({ activeRunId: runId })),
  setShowMlLayer: (show) => set(() => ({ showMlLayer: show })),
  setShowMlBuildings: (show) => set(() => ({ showMlBuildings: show })),
  setMlBuildingTrackFilter: (value) => set(() => ({ mlBuildingTrackFilter: value })),
  setMlBuildingShowExcluded: (show) => set(() => ({ mlBuildingShowExcluded: show })),
  setMlBuildingShowHulls: (show) => set(() => ({ mlBuildingShowHulls: show })),
  setMlView: (view) => set(() => ({ mlView: view })),
  bumpMlTileVersion: () => set((state) => ({ mlTileVersion: state.mlTileVersion + 1 })),
  setMapBBox: (bbox) => set(() => ({ mapBBox: bbox })),
}));
