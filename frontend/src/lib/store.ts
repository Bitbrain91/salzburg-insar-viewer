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
  setLayer: (key: keyof LayerVisibility, value: boolean) => void;
  setFilter: (key: keyof Filters, value: number) => void;
  setFiltersEnabled: (enabled: boolean) => void;
  setSelection: (selection: Selection) => void;
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
  setLayer: (key, value) =>
    set((state) => ({ layers: { ...state.layers, [key]: value } })),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setFiltersEnabled: (enabled) => set(() => ({ filtersEnabled: enabled })),
  setSelection: (selection) => set(() => ({ selection })),
}));
