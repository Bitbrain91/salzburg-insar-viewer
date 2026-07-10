import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Crosshair, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppConfig } from "../../hooks/useApi";
import {
  useDeleteMlRun,
  useMlRunDetail,
  useUpdateMlRun,
} from "../../hooks/useMlQueries";
import { normalizeAppConfig } from "../../lib/configMetadata";
import { fmtCount, formatRunTimestamp } from "../../lib/formatters";
import { deriveRunTitle, sensorLabelFromDatasetId, shortRunId } from "../../lib/runName";
import { useAppStore } from "../../lib/store";
import {
  Button,
  CollapsibleSection,
  EmptyState,
  MetricRow,
  StatusBadge,
  SummaryMetric,
} from "../ui";
import { RunRenameControl } from "./RunRenameControl";

/**
 * Lauf-Detailansicht im Inspector (verdraengt durch jede Karten-Selektion).
 * Uebernimmt die frueheren Detail-Sektionen des linken Panels:
 * Ergebnis-Kennzahlen, Konfiguration/Transparenz, Fehlertext.
 */
export function RunInspector({ runId }: { runId: string }) {
  const activeRunId = useAppStore((state) => state.activeRunId);
  const setActiveRunIdClearingFocus = useAppStore(
    (state) => state.setActiveRunIdClearingFocus
  );
  const setMlView = useAppStore((state) => state.setMlView);
  const setInspectedRunId = useAppStore((state) => state.setInspectedRunId);
  const setSearchFocus = useAppStore((state) => state.setSearchFocus);

  const detailQuery = useMlRunDetail(runId);
  const updateRun = useUpdateMlRun();
  const deleteRun = useDeleteMlRun();
  const configQuery = useAppConfig();

  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = detailQuery.data;

  // Notizen mit debounced Autosave (800 ms nach der letzten Eingabe).
  const [notes, setNotes] = useState("");
  const notesInitialized = useRef(false);
  const notesTimer = useRef<number | null>(null);
  useEffect(() => {
    notesInitialized.current = false;
    setNotes("");
  }, [runId]);
  useEffect(() => {
    if (run && !notesInitialized.current) {
      notesInitialized.current = true;
      setNotes(run.notes ?? "");
    }
  }, [run]);
  const scheduleNotesSave = (value: string) => {
    setNotes(value);
    if (notesTimer.current !== null) window.clearTimeout(notesTimer.current);
    notesTimer.current = window.setTimeout(() => {
      const trimmed = value.trim();
      updateRun.mutate({
        runId,
        payload: { notes: trimmed === "" ? null : trimmed.slice(0, 4000) },
      });
    }, 800);
  };
  useEffect(
    () => () => {
      if (notesTimer.current !== null) window.clearTimeout(notesTimer.current);
    },
    []
  );

  const appConfig = useMemo(
    () => normalizeAppConfig(configQuery.data),
    [configQuery.data]
  );

  if (detailQuery.isLoading || !run) {
    return (
      <EmptyState
        title="Lauf wird geladen…"
        message={`Details für ${shortRunId(runId)} werden abgerufen.`}
      />
    );
  }

  const areaLabel = appConfig.areas.find((area) => area.id === run.area_id)?.label;
  const sensor = sensorLabelFromDatasetId(run.dataset_id);
  const title = deriveRunTitle(run, { areaLabel, sensor });
  const derivedPlaceholder = deriveRunTitle(
    { ...run, label: null },
    { areaLabel, sensor }
  );
  const isActive = run.run_id === activeRunId;
  const metrics = run.metrics ?? {};
  const params = run.params ?? {};

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <RunRenameControl
                runId={run.run_id}
                currentLabel={run.label}
                placeholder={derivedPlaceholder}
                onDone={() => setRenaming(false)}
              />
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 truncate text-base font-bold text-foreground">
                  {title}
                </h3>
                <button
                  type="button"
                  aria-label="Umbenennen"
                  title="Umbenennen"
                  onClick={() => setRenaming(true)}
                  className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge status={run.status} />
              <span>·</span>
              <span>{formatRunTimestamp(run.created_at)}</span>
              {isActive && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                  Aktiv auf der Karte
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {!isActive && run.status === "succeeded" && (
            <Button
              size="sm"
              onClick={() => {
                setActiveRunIdClearingFocus(run.run_id);
                setMlView("cluster");
                setInspectedRunId(run.run_id);
              }}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Aktivieren
            </Button>
          )}
          {run.bbox && run.bbox.length === 4 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setSearchFocus({
                  requestId: Date.now(),
                  resultType: "ml_run",
                  label: title,
                  areaId: run.area_id,
                  bbox: run.bbox as [number, number, number, number],
                  center: null,
                })
              }
            >
              <Crosshair className="mr-1.5 h-3.5 w-3.5" />
              Auf Karte zeigen
            </Button>
          )}
        </div>
      </div>

      {run.status === "failed" && run.error && (
        <CollapsibleSection
          title="Fehler"
          defaultOpen
          aside={
            <button
              type="button"
              aria-label="Fehlertext kopieren"
              title="Fehlertext kopieren"
              onClick={() => {
                navigator.clipboard
                  .writeText(run.error ?? "")
                  .then(() => toast.success("Fehlertext kopiert"))
                  .catch(() => toast.error("Kopieren fehlgeschlagen"));
              }}
              className="inline-grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          }
        >
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/5 p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
            {run.error}
          </pre>
        </CollapsibleSection>
      )}

      {run.status === "succeeded" && (
        <section className="space-y-2">
          <div className="section-title">Ergebnis</div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryMetric
              label="Punkte zugeordnet"
              value={fmtCount(Number(metrics.assigned_points ?? 0))}
              showHelp={false}
            />
            <SummaryMetric
              label="Gebäude bewertet"
              value={fmtCount(Number(metrics.assigned_buildings ?? 0))}
              showHelp={false}
            />
            <SummaryMetric
              label="Normal / Verdacht / Ausreißer"
              value={`${metrics.normal_points ?? 0} / ${metrics.suspect_points ?? 0} / ${
                metrics.outlier_points ?? 0
              }`}
              showHelp={false}
            />
            <SummaryMetric
              label="Cross-Track-Verbesserung"
              value={Number(metrics.cross_track_improvement ?? 0).toFixed(2)}
              showHelp={false}
            />
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div className="section-title">Notizen</div>
        <textarea
          value={notes}
          onChange={(event) => scheduleNotesSave(event.target.value)}
          placeholder="Beobachtungen, Auffälligkeiten, Kontext dieses Laufs…"
          maxLength={4000}
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">
          Wird automatisch gespeichert.
        </p>
      </section>

      <CollapsibleSection title="Konfiguration" defaultOpen={false}>
        <MetricRow label="Run-ID" value={run.run_id} showHelp={false} />
        <MetricRow
          label="Pipeline / Version"
          value={`${run.pipeline}${run.pipeline_version ? ` @ ${run.pipeline_version}` : ""}`}
          showHelp={false}
        />
        <MetricRow
          label="Gebiet / Dataset / Track"
          value={`${run.area_id ?? "—"} / ${run.dataset_id ?? "—"} / ${
            run.track ?? "alle"
          }`}
          showHelp={false}
        />
        <MetricRow
          label="Kartenausschnitt (BBox)"
          value={run.bbox ? run.bbox.map((v) => v.toFixed(5)).join(", ") : "—"}
          showHelp={false}
        />
        <MetricRow
          label="Gestartet / beendet"
          value={`${formatRunTimestamp(run.started_at)} / ${formatRunTimestamp(
            run.finished_at
          )}`}
          showHelp={false}
        />
        {typeof params.experiment_id === "string" && (
          <MetricRow
            label="Experiment-ID"
            value={params.experiment_id}
            showHelp={false}
          />
        )}
        {run.mlflow_run_id && (
          <MetricRow label="MLflow-Run" value={run.mlflow_run_id} showHelp={false} />
        )}
        <div className="pt-1.5">
          <div className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vollständige Run-Parameter
          </div>
          {Object.keys(params).length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Keine Parameter-Overrides (Pipeline-Defaults aktiv).
            </div>
          ) : (
            Object.entries(params)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
                <MetricRow
                  key={key}
                  label={key}
                  value={
                    value === null || value === undefined
                      ? "—"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)
                  }
                  showHelp={false}
                />
              ))
          )}
        </div>
      </CollapsibleSection>

      <div className="border-t border-border pt-3">
        {confirmDelete ? (
          <div className="space-y-2 text-xs">
            <p className="text-foreground">
              Auswertung endgültig löschen? Alle Ergebnisse dieses Laufs werden
              entfernt.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await deleteRun.mutateAsync(run.run_id).catch(() => undefined);
                  if (activeRunId === run.run_id) {
                    setActiveRunIdClearingFocus(null);
                  }
                  setInspectedRunId(null);
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Endgültig löschen
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Auswertung löschen…
          </Button>
        )}
      </div>
    </div>
  );
}
