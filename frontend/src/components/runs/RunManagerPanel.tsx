import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { MlRunSummary } from "../../hooks/useApi";
import { useAppConfig } from "../../hooks/useApi";
import { useDeleteMlRun, useMlRuns } from "../../hooks/useMlQueries";
import { normalizeAppConfig } from "../../lib/configMetadata";
import { useAppStore } from "../../lib/store";
import { Badge, CollapsibleSection, EmptyState } from "../ui";
import { ActiveRunDisplayControls } from "./ActiveRunSummary";
import { NewRunForm } from "./NewRunForm";
import { RunCard } from "./RunCard";
import { RunListFilters } from "./RunListFilters";
import {
  filterRuns,
  groupRunsByDay,
  initialRunFilters,
  runFilterOptions,
  sortRuns,
  type RunFilterState,
  type RunSortOrder,
} from "./runFilters";

const PIPELINE_NAME = "anomaly_local_v1";

/**
 * Run-Verwaltung im linken Panel (ersetzt PipelinePanel): einklappbares
 * Start-Formular, aktiver Lauf mit Darstellungssteuerung, Filterleiste und
 * Tages-gruppierte Run-Karten. Run-Details öffnen im Inspector.
 */
export default function RunManagerPanel() {
  const activeRunId = useAppStore((state) => state.activeRunId);
  const setActiveRunIdClearingFocus = useAppStore(
    (state) => state.setActiveRunIdClearingFocus
  );
  const setMlView = useAppStore((state) => state.setMlView);
  const setInspectedRunId = useAppStore((state) => state.setInspectedRunId);
  const setSelection = useAppStore((state) => state.setSelection);
  const setHoveredRunBBox = useAppStore((state) => state.setHoveredRunBBox);
  const setSearchFocus = useAppStore((state) => state.setSearchFocus);

  const [newRunOpen, setNewRunOpen] = useState(false);
  const [filters, setFilters] = useState<RunFilterState>(initialRunFilters);
  const [sortOrder, setSortOrder] = useState<RunSortOrder>("newest");

  const configQuery = useAppConfig();
  const appConfig = useMemo(
    () => normalizeAppConfig(configQuery.data),
    [configQuery.data]
  );
  const areaLabels = useMemo(
    () => new Map(appConfig.areas.map((area) => [area.id, area.label])),
    [appConfig.areas]
  );

  const runsQuery = useMlRuns();
  const deleteRun = useDeleteMlRun();

  const pipelineRuns = useMemo(
    () => (runsQuery.data ?? []).filter((run) => run.pipeline === PIPELINE_NAME),
    [runsQuery.data]
  );
  const filteredRuns = useMemo(
    () => sortRuns(filterRuns(pipelineRuns, filters), sortOrder),
    [pipelineRuns, filters, sortOrder]
  );
  const groups = useMemo(() => groupRunsByDay(filteredRuns), [filteredRuns]);
  const filterOptions = useMemo(() => runFilterOptions(pipelineRuns), [pipelineRuns]);
  const activeRun = pipelineRuns.find((run) => run.run_id === activeRunId) ?? null;

  const openRun = (run: MlRunSummary) => {
    // Details immer im Inspector zeigen; abgeschlossene Läufe zusätzlich
    // aktivieren (Karteneinfaerbung), wie im alten Panel.
    if (run.status === "succeeded" && run.run_id !== activeRunId) {
      setActiveRunIdClearingFocus(run.run_id);
      setMlView("cluster");
    }
    setSelection(null);
    setInspectedRunId(run.run_id);
  };

  const showRunOnMap = (run: MlRunSummary) => {
    if (!run.bbox || run.bbox.length !== 4) return;
    setSearchFocus({
      requestId: Date.now(),
      resultType: "ml_run",
      label: run.label ?? run.run_id,
      areaId: run.area_id,
      bbox: run.bbox as [number, number, number, number],
      center: null,
    });
  };

  const handleDelete = async (run: MlRunSummary) => {
    await deleteRun.mutateAsync(run.run_id).catch(() => undefined);
    setHoveredRunBBox(null);
    if (activeRunId === run.run_id) {
      setActiveRunIdClearingFocus(null);
    }
    const { inspectedRunId } = useAppStore.getState();
    if (inspectedRunId === run.run_id) {
      setInspectedRunId(null);
    }
  };

  const handleHoverChange = (run: MlRunSummary | null) => {
    setHoveredRunBBox(
      run?.bbox && run.bbox.length === 4
        ? (run.bbox as [number, number, number, number])
        : null
    );
  };

  return (
    <div className="panel panel-left">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2>Auswertungen</h2>
          <small>ML-Läufe starten, verwalten und auf der Karte aktivieren.</small>
        </div>
        {pipelineRuns.length > 0 && (
          <Badge variant="secondary" className="mt-1 shrink-0 font-mono">
            {pipelineRuns.length}
          </Badge>
        )}
      </div>

      <CollapsibleSection
        title={
          <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-sm font-semibold">
            <Plus className="h-3.5 w-3.5" />
            Neue Auswertung
          </span>
        }
        open={newRunOpen}
        onOpenChange={setNewRunOpen}
      >
        <NewRunForm onStarted={() => setNewRunOpen(false)} />
      </CollapsibleSection>

      {activeRun && (
        <section className="space-y-2">
          <div className="section-title">Aktiver Lauf</div>
          <RunCard
            run={activeRun}
            isActive
            variant="active-slot"
            areaLabel={areaLabels.get(activeRun.area_id ?? "")}
            onOpen={openRun}
            onShowOnMap={showRunOnMap}
            onDelete={handleDelete}
            onHoverChange={handleHoverChange}
          />
          <CollapsibleSection title="Darstellung" defaultOpen={false}>
            <ActiveRunDisplayControls />
          </CollapsibleSection>
        </section>
      )}
      {!activeRun && (
        <section className="space-y-2">
          <div className="section-title">Darstellung</div>
          <ActiveRunDisplayControls />
        </section>
      )}

      <section className="space-y-2">
        <div className="section-title">Alle Auswertungen</div>
        <RunListFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          options={filterOptions}
        />

        {runsQuery.isLoading && (
          <Badge variant="secondary" className="font-normal">
            Auswertungen laden…
          </Badge>
        )}

        {!runsQuery.isLoading && pipelineRuns.length === 0 && (
          <EmptyState
            title="Noch keine Auswertungen"
            message="Starten Sie die erste Analyse für den sichtbaren Kartenausschnitt."
          />
        )}

        {pipelineRuns.length > 0 && filteredRuns.length === 0 && (
          <EmptyState
            title="Keine Auswertung entspricht dem Filter"
            action={
              <button
                type="button"
                onClick={() => setFilters(initialRunFilters)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Filter zurücksetzen
              </button>
            }
          />
        )}

        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <div className="grid gap-2">
                {group.runs.map((run) => (
                  <RunCard
                    key={run.run_id}
                    run={run}
                    isActive={run.run_id === activeRunId}
                    areaLabel={areaLabels.get(run.area_id ?? "")}
                    onOpen={openRun}
                    onShowOnMap={showRunOnMap}
                    onDelete={handleDelete}
                    onHoverChange={handleHoverChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
