import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppConfig } from "../../hooks/useApi";
import { normalizeAppConfig, getTrackVisibilityKey } from "../../lib/configMetadata";
import {
  ML_CLUSTER_KIND_COLORS,
  ML_CLUSTER_KIND_LABELS,
} from "../../lib/mlClusterKind";
import {
  HEIGHT_PALETTE,
  formatHeightLegendValue,
  getHeightCycleLength,
  getHeightLegendAnchors,
  getTrackOutlineColor,
} from "../../lib/pointStyling";
import { useAppStore } from "../../lib/store";

const velocityLegendItems = [
  { color: "#8e0f2f", label: "Starke Senkung (< -5)" },
  { color: "#e67f1c", label: "Moderate Senkung (-5 bis -2)" },
  { color: "#f2c14e", label: "Leichte Senkung (-2 bis -1)" },
  { color: "#2c9f7a", label: "Stabil (-1 bis 1)" },
  { color: "#4aa5d5", label: "Hebung (1 bis 5)" },
  { color: "#1c2f4a", label: "Starke Hebung (> 5)" },
];

const LEGEND_OPEN_STORAGE_KEY = "insar.legend.open";

/**
 * Kontextabhängige Legende als Karten-Overlay unten links (ersetzt die
 * Legenden-Sektion im LayerPanel): zeigt genau das, was gerade färbt.
 */
export function MapLegend() {
  const pointColorMode = useAppStore((state) => state.pointColorMode);
  const heightSensitivityM = useAppStore((state) => state.heightSensitivityM);
  const showTrackOutlines = useAppStore((state) => state.showTrackOutlines);
  const selectedAreaId = useAppStore((state) => state.selectedAreaId);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const showMlLayer = useAppStore((state) => state.showMlLayer);
  const mlView = useAppStore((state) => state.mlView);
  const layers = useAppStore((state) => state.layers);
  const configQuery = useAppConfig();

  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(LEGEND_OPEN_STORAGE_KEY) !== "0";
  });
  useEffect(() => {
    window.localStorage.setItem(LEGEND_OPEN_STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  const appConfig = normalizeAppConfig(configQuery.data);
  const selectedArea =
    appConfig.areas.find((area) => area.id === selectedAreaId) ?? appConfig.areas[0];
  const selectedTracks = appConfig.datasets
    .filter((dataset) => selectedArea && dataset.areaId === selectedArea.id)
    .flatMap((dataset) => dataset.tracks.map((track) => ({ dataset, track })));

  const heightLegendAnchors = getHeightLegendAnchors(heightSensitivityM);
  const heightCycleLength = getHeightCycleLength(heightSensitivityM);
  const heightLegendItems = HEIGHT_PALETTE.map((color, index) => ({
    color,
    label: `${formatHeightLegendValue(heightLegendAnchors[index])} bis ${formatHeightLegendValue(
      heightLegendAnchors[index] + heightSensitivityM
    )} m`,
  }));
  const pointLegendItems =
    pointColorMode === "height" ? heightLegendItems : velocityLegendItems;
  const pointLegendTitle =
    pointColorMode === "height" ? "InSAR-Höhe" : "Geschwindigkeit (mm/Jahr)";

  const showClusterKinds = Boolean(activeRunId) && showMlLayer && mlView === "cluster";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute bottom-8 left-3 z-[3] inline-flex items-center gap-1.5 rounded-full border border-border bg-popover/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Legende anzeigen"
      >
        Legende
        <ChevronUp className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-8 left-3 z-[3] w-56 max-w-[calc(100%-24px)] rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">Legende</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Legende einklappen"
          className="inline-grid h-5 w-5 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {pointLegendTitle}
          </div>
          <div className="legend">
            {pointLegendItems.map((item) => (
              <div className="legend-item" key={item.label}>
                <span className="legend-swatch" style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
          {pointColorMode === "height" && (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Klassen ab 450 m, Wiederholung alle {formatHeightLegendValue(heightCycleLength)} m.
            </p>
          )}
        </div>

        {showClusterKinds && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Cluster-Typen (aktiver Lauf)
            </div>
            <div className="legend">
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: "#5f6b7a" }}
                />
                {ML_CLUSTER_KIND_LABELS.standard} (Clusterpalette)
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: ML_CLUSTER_KIND_COLORS.annex }}
                />
                {ML_CLUSTER_KIND_LABELS.annex}
              </div>
              <div className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ background: ML_CLUSTER_KIND_COLORS.foreign }}
                />
                {ML_CLUSTER_KIND_LABELS.foreign}
              </div>
            </div>
          </div>
        )}

        {showTrackOutlines && selectedTracks.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Track-Ränder
            </div>
            <div className="legend">
              {selectedTracks
                .map(({ dataset, track }, index) => ({ dataset, track, index }))
                .filter(({ dataset, track }) => {
                  const key = getTrackVisibilityKey(dataset.id, track.track);
                  return layers.insarTracks[key] ?? true;
                })
                .map(({ dataset, track, index }) => (
                  <div
                    className="legend-item"
                    key={getTrackVisibilityKey(dataset.id, track.track)}
                  >
                    <span
                      className="legend-swatch"
                      style={{
                        background: "#fbfaf7",
                        border: `2px solid ${getTrackOutlineColor(index)}`,
                        boxShadow: "0 0 0 1px rgba(251, 250, 247, 0.95)",
                      }}
                    />
                    {track.sensor} T{track.track}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
