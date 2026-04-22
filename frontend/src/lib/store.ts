import { create } from "zustand";
import type { BasemapId } from "./basemaps";
import type { CameraMode } from "./cameraModes";
import type { PointColorMode } from "./pointStyling";

export type LayerVisibility = {
  insar44: boolean;
  insar95: boolean;
  reliefHillshade: boolean;
  reliefSlope: boolean;
  gba: boolean;
  osm: boolean;
};

export type Selection =
  | { type: "point"; code: string; track?: number }
  | { type: "building"; source: "gba" | "osm"; id: string }
  | null;

export type Filters = {
  velocityMin: number;
  velocityMax: number;
  coherenceMin: number;
};

export type AppState = {
  layers: LayerVisibility;
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
  mlBuildingTrackFilter: "both" | "44" | "95";
  mlBuildingShowExcluded: boolean;
  mlBuildingShowHulls: boolean;
  mlView:
    | "cluster"
    | "building"
    | "assignment"
    | "distance"
    | "velocity"
    | "coherence"
    | "quality"
    | "anomaly"
    | "cross-track"
    | "label";
  mlTileVersion: number;
  mapBBox: [number, number, number, number] | null;
  setLayer: (key: keyof LayerVisibility, value: boolean) => void;
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
    insar44: true,
    insar95: true,
    reliefHillshade: false,
    reliefSlope: false,
    gba: false,
    osm: false,
  },
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
  mlBuildingTrackFilter: "both",
  mlBuildingShowExcluded: true,
  mlBuildingShowHulls: true,
  mlView: "cluster",
  mlTileVersion: 0,
  mapBBox: null,
  setLayer: (key, value) =>
    set((state) => ({ layers: { ...state.layers, [key]: value } })),
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
