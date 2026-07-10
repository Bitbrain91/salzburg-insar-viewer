import { useState } from "react";
import {
  Crosshair,
  Info,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MlRunSummary } from "../../hooks/useApi";
import { fmtCount } from "../../lib/formatters";
import {
  deriveRunTitle,
  sensorLabelFromDatasetId,
  shortRunId,
  trackLabel,
} from "../../lib/runName";
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  StatusBadge,
} from "../ui";
import { RunRenameControl } from "./RunRenameControl";

const timeFormat = new Intl.DateTimeFormat("de-AT", {
  hour: "2-digit",
  minute: "2-digit",
});

function runningSince(startedAt: string | null | undefined): string | null {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - started) / 60_000));
  if (minutes < 1) return "Läuft seit unter einer Minute";
  return `Läuft seit ${minutes} Min`;
}

export type RunCardProps = {
  run: MlRunSummary;
  isActive: boolean;
  areaLabel?: string;
  /** Karte klicken: aktivieren (falls abgeschlossen) + Details oeffnen. */
  onOpen: (run: MlRunSummary) => void;
  onShowOnMap: (run: MlRunSummary) => void;
  onDelete: (run: MlRunSummary) => void;
  onHoverChange?: (run: MlRunSummary | null) => void;
  /** Kompaktvariante fuer den "Aktiver Lauf"-Slot (ohne Aktiv-Badge-Doppelung). */
  variant?: "list" | "active-slot";
};

export function RunCard({
  run,
  isActive,
  areaLabel,
  onOpen,
  onShowOnMap,
  onDelete,
  onHoverChange,
  variant = "list",
}: RunCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sensor = sensorLabelFromDatasetId(run.dataset_id);
  const title = deriveRunTitle(run, { areaLabel, sensor });
  const derivedPlaceholder = deriveRunTitle(
    { ...run, label: null },
    { areaLabel, sensor }
  );
  const isFailed = run.status === "failed";
  const isRunning = run.status === "running" || run.status === "queued";
  const metrics = run.metrics ?? {};
  const assignedPoints = metrics.assigned_points;
  const assignedBuildings = metrics.assigned_buildings;
  const since = isRunning ? runningSince(run.started_at) : null;

  // Ohne Nutzer-Label steckt Gebiet/Sensor/Track schon im abgeleiteten
  // Titel; die Metazeile wiederholt dann nichts.
  const metaParts = (
    run.label
      ? [
          areaLabel ?? run.area_id ?? "unbekannt",
          [sensor, trackLabel(run.track)].filter(Boolean).join(" "),
          timeFormat.format(new Date(run.created_at)),
        ]
      : [timeFormat.format(new Date(run.created_at)), shortRunId(run.run_id)]
  ).filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !renaming && onOpen(run)}
      onKeyDown={(event) => {
        if (!renaming && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen(run);
        }
      }}
      onMouseEnter={() => onHoverChange?.(run)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={cn(
        "group/run-card grid cursor-pointer gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "border-l-[3px] border-primary border-l-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40",
        isFailed && !isActive && "border-destructive/40 bg-destructive/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StatusBadge status={run.status} iconOnly className="shrink-0" />
          {renaming ? (
            <RunRenameControl
              runId={run.run_id}
              currentLabel={run.label}
              placeholder={derivedPlaceholder}
              onDone={() => setRenaming(false)}
            />
          ) : (
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">
              {title}
            </span>
          )}
          {run.experiment_id && (
            <span
              className="shrink-0 rounded-sm bg-violet-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700"
              title={`Experiment-Variante ${run.experiment_id} (Forschungs-Harness)`}
            >
              {run.experiment_id}
            </span>
          )}
        </div>
        <Popover
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setConfirmDelete(false);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Aktionen"
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "inline-grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "opacity-0 focus-visible:opacity-100 group-hover/run-card:opacity-100",
                menuOpen && "opacity-100"
              )}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={4}
            className="w-56 p-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            {confirmDelete ? (
              <div className="space-y-2 p-1.5 text-xs">
                <p className="leading-snug text-foreground">
                  Auswertung endgültig löschen? Alle Ergebnisse dieses Laufs werden
                  entfernt.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(false);
                      onDelete(run);
                    }}
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-0.5">
                <MenuItem
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  label="Umbenennen"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenaming(true);
                  }}
                />
                <MenuItem
                  icon={<Crosshair className="h-3.5 w-3.5" />}
                  label="Auf Karte zeigen"
                  disabled={!run.bbox || run.bbox.length !== 4}
                  onClick={() => {
                    setMenuOpen(false);
                    onShowOnMap(run);
                  }}
                />
                <MenuItem
                  icon={<Info className="h-3.5 w-3.5" />}
                  label="Details anzeigen"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpen(run);
                  }}
                />
                <div className="my-0.5 border-t border-border" />
                <MenuItem
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  label="Löschen…"
                  destructive
                  onClick={() => setConfirmDelete(true)}
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {metaParts.map((part, index) => (
          <span key={`${part}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>·</span>}
            <span className="truncate">{part}</span>
          </span>
        ))}
      </div>

      {run.status === "succeeded" &&
        (assignedPoints !== undefined || assignedBuildings !== undefined) && (
          <div className="text-xs text-muted-foreground">
            <span className="font-mono text-foreground">
              {fmtCount(Number(assignedPoints ?? 0))}
            </span>{" "}
            Punkte ·{" "}
            <span className="font-mono text-foreground">
              {fmtCount(Number(assignedBuildings ?? 0))}
            </span>{" "}
            Gebäude
          </div>
        )}
      {since && <div className="text-xs text-muted-foreground">{since}</div>}
      {isFailed && (
        <div className="text-xs font-medium text-destructive">
          Fehlgeschlagen — anklicken für Fehlerdetails.
        </div>
      )}
      {isActive && variant === "list" && (
        <div>
          <Badge className="bg-primary text-primary-foreground hover:bg-primary">
            Aktiv
          </Badge>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
