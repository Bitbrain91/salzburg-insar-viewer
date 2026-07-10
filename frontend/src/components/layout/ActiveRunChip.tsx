import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { getMlRunDetail, useAppConfig } from "../../hooks/useApi";
import { normalizeAppConfig } from "../../lib/configMetadata";
import { deriveRunTitle } from "../../lib/runName";
import { useAppStore } from "../../lib/store";
import { StatusBadge } from "../ui";

/**
 * Kompakter Chip oben mittig auf der Karte: beantwortet jederzeit
 * "welcher Lauf faerbt gerade meine Karte?". Klick oeffnet die
 * Run-Verwaltung, x deaktiviert den Lauf.
 */
export function ActiveRunChip() {
  const activeRunId = useAppStore((state) => state.activeRunId);
  const setActiveRunIdClearingFocus = useAppStore(
    (state) => state.setActiveRunIdClearingFocus
  );
  const setActiveLeftTab = useAppStore((state) => state.setActiveLeftTab);
  const configQuery = useAppConfig();

  const runQuery = useQuery({
    queryKey: ["ml-run-detail", activeRunId],
    queryFn: () => getMlRunDetail(activeRunId as string),
    enabled: Boolean(activeRunId),
  });

  if (!activeRunId) return null;

  const run = runQuery.data;
  const appConfig = normalizeAppConfig(configQuery.data);
  const areaLabel = run
    ? appConfig.areas.find((area) => area.id === run.area_id)?.label
    : undefined;
  const title = run
    ? deriveRunTitle(run, { areaLabel })
    : `Lauf ${activeRunId.slice(0, 8)}`;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[3] flex max-w-[min(420px,calc(100%-140px))] -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-popover/95 py-1.5 pl-3 pr-1.5 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setActiveLeftTab("analysis")}
        title="Zur Run-Verwaltung wechseln"
        className="inline-flex min-w-0 items-center gap-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
      >
        <StatusBadge status={run?.status} iconOnly />
        <span className="truncate font-semibold text-foreground">{title}</span>
      </button>
      <button
        type="button"
        aria-label="Lauf deaktivieren"
        title="Lauf deaktivieren (Karteneinfärbung entfernen)"
        onClick={() => setActiveRunIdClearingFocus(null)}
        className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
