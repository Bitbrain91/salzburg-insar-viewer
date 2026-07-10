import { useEffect } from "react";
import { useMlRunDetail, useRecolorMlRun } from "../../hooks/useMlQueries";
import { useAppStore, type AppState } from "../../lib/store";
import {
  Button,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "../ui";
import { cn } from "@/lib/utils";

const PIPELINE_NAME = "anomaly_local_v1";

const localAnomalyViews = [
  "cluster",
  "quality",
  "anomaly",
  "cross-track",
  "reliability",
] as const;

type LocalAnomalyView = (typeof localAnomalyViews)[number];

const visualizationOptions: Array<{ value: LocalAnomalyView; label: string }> = [
  { value: "cluster", label: "Clusterfarben" },
  { value: "quality", label: "Qualitätswert" },
  { value: "anomaly", label: "Anomaliewert" },
  { value: "cross-track", label: "Cross-Track-Konsistenz" },
  { value: "reliability", label: "Zuverlässigkeit" },
];

function isLocalAnomalyView(view: AppState["mlView"]): view is LocalAnomalyView {
  return localAnomalyViews.includes(view as LocalAnomalyView);
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 py-1.5 cursor-pointer",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span className="min-w-0 text-sm leading-snug text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

/**
 * Darstellungssteuerung fuer den aktiven Lauf (aus PipelinePanel extrahiert,
 * inkl. der mlView-erzwingenden Effekte: Nicht-Anomaly-Runs und "kein Lauf"
 * fallen auf die Cluster-Ansicht zurueck).
 */
export function ActiveRunDisplayControls() {
  const activeRunId = useAppStore((state) => state.activeRunId);
  const showMlLayer = useAppStore((state) => state.showMlLayer);
  const setShowMlLayer = useAppStore((state) => state.setShowMlLayer);
  const showMlBuildings = useAppStore((state) => state.showMlBuildings);
  const setShowMlBuildings = useAppStore((state) => state.setShowMlBuildings);
  const mlView = useAppStore((state) => state.mlView);
  const setMlView = useAppStore((state) => state.setMlView);
  const bumpMlTileVersion = useAppStore((state) => state.bumpMlTileVersion);

  const activeRunQuery = useMlRunDetail(activeRunId);
  const recolorRun = useRecolorMlRun();

  const assignedBuildings = activeRunQuery.data?.metrics?.assigned_buildings;
  const hasAssignedBuildings =
    assignedBuildings === undefined ? true : Number(assignedBuildings) > 0;
  const activeRunPipeline = activeRunQuery.data?.pipeline;
  const isActiveRunLocalAnomaly = activeRunPipeline === PIPELINE_NAME;

  useEffect(() => {
    if (activeRunId) return;
    if (!isLocalAnomalyView(mlView)) {
      setMlView("cluster");
    }
  }, [activeRunId, mlView, setMlView]);

  useEffect(() => {
    if (!activeRunId || activeRunPipeline === undefined) return;
    if (isActiveRunLocalAnomaly) {
      if (!isLocalAnomalyView(mlView)) {
        setMlView("cluster");
      }
    } else {
      setMlView("cluster");
    }
  }, [activeRunId, activeRunPipeline, isActiveRunLocalAnomaly, mlView, setMlView]);

  async function handleRefresh() {
    if (activeRunId && showMlBuildings) {
      await recolorRun.mutateAsync(activeRunId).catch(() => undefined);
    }
    bumpMlTileVersion();
    activeRunQuery.refetch();
  }

  return (
    <div className="space-y-2">
      <ToggleRow
        label="ML-Punkte anzeigen"
        checked={showMlLayer}
        onChange={setShowMlLayer}
      />
      <ToggleRow
        label="Bewertete Gebäude anzeigen"
        checked={showMlBuildings}
        onChange={setShowMlBuildings}
        disabled={!hasAssignedBuildings}
      />
      {activeRunId && assignedBuildings === 0 && (
        <EmptyState
          tone="warning"
          title="Keine Gebäude zugeordnet"
          message="Prüfen Sie, ob BEV-Daten in PostGIS geladen sind und der Kartenausschnitt unterstützte Gebäude schneidet."
        />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="map-color-select">Karteneinfärbung</Label>
        <Select
          value={mlView}
          onValueChange={(value) => setMlView(value as LocalAnomalyView)}
        >
          <SelectTrigger id="map-color-select">
            <SelectValue placeholder="Einfärbung wählen" />
          </SelectTrigger>
          <SelectContent>
            {visualizationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={handleRefresh}
        disabled={!activeRunId}
      >
        ML-Kacheln aktualisieren
      </Button>
    </div>
  );
}
