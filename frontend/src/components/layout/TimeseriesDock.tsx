import { ChevronDown, ChevronUp } from "lucide-react";
import TimeseriesPanel from "../TimeseriesPanel";
import { useAppStore } from "../../lib/store";

/**
 * Dock für die Zeitreihe innerhalb der Kartenspalte. Ersetzt die frühere
 * Grid-Zeile (app-has-timeseries): Seitenspalten bewegen sich nicht mehr,
 * nur der Karten-Viewport wird vertikal kleiner.
 */
export function TimeseriesDock() {
  const setTimeseriesCollapsed = useAppStore((state) => state.setTimeseriesCollapsed);

  return (
    <div className="timeseries-dock relative h-full min-h-0">
      <TimeseriesPanel />
      <button
        type="button"
        aria-label="Zeitreihe einklappen"
        title="Zeitreihe einklappen"
        onClick={() => setTimeseriesCollapsed(true)}
        className="absolute right-2.5 top-2 z-10 inline-grid h-6 w-6 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Schmale Leiste am Kartenboden, wenn das Zeitreihen-Dock eingeklappt ist. */
export function TimeseriesCollapsedBar() {
  const selection = useAppStore((state) => state.selection);
  const setTimeseriesCollapsed = useAppStore((state) => state.setTimeseriesCollapsed);
  if (selection?.type !== "point") return null;

  return (
    <button
      type="button"
      onClick={() => setTimeseriesCollapsed(false)}
      className="mt-2 flex h-9 w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 text-xs shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Zeitreihe ausklappen"
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="font-semibold text-foreground">Zeitreihe</span>
        <span className="truncate font-mono text-muted-foreground">
          {selection.code}
          {selection.track !== undefined ? ` · T${selection.track}` : ""}
        </span>
      </span>
      <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
