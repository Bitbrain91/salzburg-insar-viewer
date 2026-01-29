import { create } from "zustand";

export type LayerVisibility = {
  insar44: boolean;
  insar95: boolean;
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
  activeRunId: string | null;
  showMlLayer: boolean;
  mapBBox: [number, number, number, number] | null;
  setLayer: (key: keyof LayerVisibility, value: boolean) => void;
  setFilter: (key: keyof Filters, value: number) => void;
  setFiltersEnabled: (enabled: boolean) => void;
  setSelection: (selection: Selection) => void;
  setActiveRunId: (runId: string | null) => void;
  setShowMlLayer: (show: boolean) => void;
  setMapBBox: (bbox: [number, number, number, number] | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  layers: {
    insar44: true,
    insar95: true,
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
  activeRunId: null,
  showMlLayer: true,
  mapBBox: null,
  setLayer: (key, value) =>
    set((state) => ({ layers: { ...state.layers, [key]: value } })),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setFiltersEnabled: (enabled) => set(() => ({ filtersEnabled: enabled })),
  setSelection: (selection) => set(() => ({ selection })),
  setActiveRunId: (runId) => set(() => ({ activeRunId: runId })),
  setShowMlLayer: (show) => set(() => ({ showMlLayer: show })),
  setMapBBox: (bbox) => set(() => ({ mapBBox: bbox })),
}));
