import type { BasemapId } from "./basemaps";
import {
  useAppStore,
  type AppState,
  type MlBuildingTrackFilter,
  type Selection,
} from "./store";

// Deep-Link-Unterstuetzung fuer den Visual-Audit (P7-B-W2-T0):
// Query-Parameter werden SYNCHRON vor dem ersten React-Render in den Store
// geschrieben, damit weder der Area-fitBounds noch der Selection-Reset von
// setSelectedAreaId mit dem Deep-Link konkurrieren. Die Kamera kommt
// weiterhin aus dem MapLibre-Hash; ohne Hash zoomt MapView einmalig auf das
// per `building` angeforderte Gebaeude (Nadir, pitch=0).

const ML_VIEWS: readonly AppState["mlView"][] = [
  "cluster",
  "quality",
  "anomaly",
  "cross-track",
  "reliability",
];

export type UrlCameraOverride = { pitch?: number; bearing?: number };

export type BootHashCamera = {
  zoom: number;
  lat: number;
  lon: number;
  bearing: number;
  pitch: number;
};

let autoFitUrlBuildingPending = false;
let cameraOverride: UrlCameraOverride = {};
let bootHashCamera: BootHashCamera | null = null;

function parseHashCamera(hash: string): BootHashCamera | null {
  // MapLibre-Hash-Format: #zoom/lat/lon[/bearing[/pitch]]
  const parts = hash.replace(/^#/, "").split("/");
  if (parts.length < 3) return null;
  const [zoom, lat, lon, bearing, pitch] = parts.map(Number);
  if (![zoom, lat, lon].every(Number.isFinite)) return null;
  return {
    zoom,
    lat,
    lon,
    bearing: Number.isFinite(bearing) ? bearing : 0,
    pitch: Number.isFinite(pitch) ? pitch : 0,
  };
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
}

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBuildingSelection(
  value: string | null,
  areaId: string
): Selection | undefined {
  if (!value) return undefined;
  const separator = value.indexOf(":");
  if (separator <= 0 || separator === value.length - 1) return undefined;
  const source = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (source !== "gba" && source !== "osm") return undefined;
  return { type: "building", source, id, areaId };
}

export function applyUrlStateToStore(
  search: string = window.location.search,
  hash: string = window.location.hash
): void {
  // Boot-Hash VOR jedem Map-Leben einfrieren: Unter React.StrictMode
  // (Dev-Doppelmount) kann die erste, sofort wieder zerstoerte
  // Map-Instanz den URL-Hash ueberschreiben, bevor die zweite ihn liest.
  // MapView wendet die eingefrorene Kamera nach der Konstruktion
  // explizit per jumpTo an (P7-D-W1-T3-Fix).
  bootHashCamera = parseHashCamera(hash);
  const params = new URLSearchParams(search);
  if ([...params.keys()].length === 0) return;

  const current = useAppStore.getState();
  const next: Partial<AppState> = {};

  const area = params.get("area");
  if (area) next.selectedAreaId = area;

  const run = params.get("run");
  if (run) next.activeRunId = run;

  const selection = parseBuildingSelection(
    params.get("building"),
    area ?? current.selectedAreaId
  );
  if (selection) next.selection = selection;

  const mlView = params.get("mlview") as AppState["mlView"] | null;
  if (mlView && ML_VIEWS.includes(mlView)) next.mlView = mlView;

  const track = params.get("track");
  if (track === "all") {
    next.mlBuildingTrackFilter = "all";
  } else if (track && /^[\w-]+:\d+$/.test(track)) {
    next.mlBuildingTrackFilter = track as MlBuildingTrackFilter;
  }

  const hulls = parseBoolean(params.get("hulls"));
  if (hulls !== undefined) next.mlBuildingShowHulls = hulls;

  const excluded = parseBoolean(params.get("excluded"));
  if (excluded !== undefined) next.mlBuildingShowExcluded = excluded;

  const mlPoints = parseBoolean(params.get("mlpoints"));
  if (mlPoints !== undefined) next.showMlLayer = mlPoints;

  const mlBuildings = parseBoolean(params.get("mlbuildings"));
  if (mlBuildings !== undefined) next.showMlBuildings = mlBuildings;

  const basemap = params.get("basemap");
  if (basemap === "light" || basemap === "satellite") {
    next.basemapId = basemap as BasemapId;
  }

  const camera = params.get("camera");
  if (camera === "default" || camera === "nadir" || /^track:[\w-]+:\d+$/.test(camera ?? "")) {
    next.cameraMode = camera as AppState["cameraMode"];
  }

  const gba = parseBoolean(params.get("gba"));
  const osm = parseBoolean(params.get("osm"));
  // `rawtracks=0` blendet alle rohen InSAR-Track-Layer aus (Audit-Ansicht):
  // fehlende Keys gelten in MapView als sichtbar, daher alle bekannten
  // dataset:track-Kombinationen explizit setzen (statisches Track-Register,
  // vgl. backend/app/ml/track_geometry.py).
  const rawTracks = parseBoolean(params.get("rawtracks"));
  if (gba !== undefined || osm !== undefined || rawTracks !== undefined) {
    next.layers = {
      ...current.layers,
      ...(gba !== undefined ? { gba } : {}),
      ...(osm !== undefined ? { osm } : {}),
      ...(rawTracks !== undefined
        ? {
            insarTracks: Object.fromEntries(
              [
                "salzburg_snt:44",
                "salzburg_snt:95",
                "bad_gastein_snt:22",
                "bad_gastein_snt:44",
                "bad_gastein_snt:95",
                "bad_gastein_tsx_paz:70",
                "bad_gastein_tsx_paz:93",
              ].map((key) => [key, rawTracks])
            ),
          }
        : {}),
    };
  }

  const pitch = parseNumber(params.get("pitch"));
  const bearing = parseNumber(params.get("bearing"));
  cameraOverride = {
    ...(pitch !== undefined ? { pitch: Math.min(Math.max(pitch, 0), 85) } : {}),
    ...(bearing !== undefined ? { bearing } : {}),
  };

  // Ohne Kamera-Hash uebernimmt MapView den einmaligen Zoom auf das Gebaeude.
  autoFitUrlBuildingPending = Boolean(selection) && hash.length <= 1;

  if (Object.keys(next).length > 0) {
    useAppStore.setState(next);
  }
}

export function consumeAutoFitUrlBuilding(): boolean {
  if (!autoFitUrlBuildingPending) return false;
  autoFitUrlBuildingPending = false;
  return true;
}

// Bewusst NICHT konsumierend: unter StrictMode konstruiert jede der beiden
// Map-Instanzen einmal und beide sollen dieselbe Boot-Kamera anwenden.
export function initialHashCamera(): BootHashCamera | null {
  return bootHashCamera;
}

export function urlCameraOverride(): UrlCameraOverride {
  return cameraOverride;
}
