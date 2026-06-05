import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Trash2 } from "lucide-react";
import {
  createMlRun,
  deleteMlRun,
  useAppConfig,
  getMlRunDetail,
  listMlRuns,
  recolorMlRun,
} from "../hooks/useApi";
import { useAppStore, type AppState } from "../lib/store";
import { normalizeAppConfig } from "../lib/configMetadata";
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "./ui";
import { cn } from "@/lib/utils";

const localAnomalyViews = [
  "cluster",
  "quality",
  "anomaly",
  "cross-track",
  "reliability",
] as const;
const PIPELINE_NAME = "anomaly_local_v1";

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

function MetricLine({ label, value }: { label: string; value: unknown }) {
  const displayValue =
    value === null || value === undefined
      ? "—"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 border-b border-border/70 py-1.5 text-xs last:border-b-0">
      <span className="min-w-0 break-words leading-snug text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 justify-self-end break-words text-right font-mono text-[12px] leading-snug text-foreground">
        {displayValue}
      </span>
    </div>
  );
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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <div className="section-title">{title}</div>
        {description && (
          <p className="-mt-1 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function PipelinePanel() {
  const mapBBox = useAppStore((state) => state.mapBBox);
  const selectedAreaId = useAppStore((state) => state.selectedAreaId);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const setActiveRunId = useAppStore((state) => state.setActiveRunId);
  const showMlLayer = useAppStore((state) => state.showMlLayer);
  const setShowMlLayer = useAppStore((state) => state.setShowMlLayer);
  const showMlBuildings = useAppStore((state) => state.showMlBuildings);
  const setShowMlBuildings = useAppStore((state) => state.setShowMlBuildings);
  const mlView = useAppStore((state) => state.mlView);
  const setMlView = useAppStore((state) => state.setMlView);
  const bumpMlTileVersion = useAppStore((state) => state.bumpMlTileVersion);

  const pipeline = PIPELINE_NAME;
  const configQuery = useAppConfig();
  const appConfig = useMemo(() => normalizeAppConfig(configQuery.data), [configQuery.data]);
  const areaLabel =
    appConfig.areas.find((area) => area.id === selectedAreaId)?.label ?? selectedAreaId;
  const datasetsForArea = useMemo(
    () => appConfig.datasets.filter((dataset) => dataset.areaId === selectedAreaId),
    [appConfig.datasets, selectedAreaId]
  );
  const [datasetId, setDatasetId] = useState("");
  const [track, setTrack] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState(30);
  const [bufferMultiplier, setBufferMultiplier] = useState(1.0);
  const [minBuffer, setMinBuffer] = useState(3.0);
  const [defaultHeight, setDefaultHeight] = useState(12.0);
  const [paramsOpen, setParamsOpen] = useState(false);

  const runsQuery = useQuery({
    queryKey: ["ml-runs"],
    queryFn: () => listMlRuns(),
    refetchInterval: 5000,
  });
  const activeRunQuery = useQuery({
    queryKey: ["ml-run-detail", activeRunId],
    queryFn: () => getMlRunDetail(activeRunId as string),
    enabled: Boolean(activeRunId),
    refetchInterval: 5000,
  });

  const assignedBuildings = activeRunQuery.data?.metrics?.assigned_buildings;
  const hasAssignedBuildings =
    assignedBuildings === undefined ? true : Number(assignedBuildings) > 0;
  const activeRunPipeline = activeRunQuery.data?.pipeline;
  const isActiveRunLocalAnomaly = activeRunPipeline === PIPELINE_NAME;
  const selectedDataset =
    datasetsForArea.find((dataset) => dataset.id === datasetId) ?? datasetsForArea[0];
  const mlTrackOptions = (selectedDataset?.tracks ?? []).filter(
    (option) => option.directionDependentMl !== false
  );

  const bboxLabel = useMemo(() => {
    if (!mapBBox) return "Kartenausschnitt noch nicht verfügbar";
    return mapBBox.map((v) => v.toFixed(4)).join(", ");
  }, [mapBBox]);
  const visibleRuns = useMemo(
    () => (runsQuery.data ?? []).filter((run) => run.pipeline === PIPELINE_NAME),
    [runsQuery.data]
  );

  useEffect(() => {
    if (activeRunId) {
      return;
    }
    if (!isLocalAnomalyView(mlView)) {
      setMlView("cluster");
    }
  }, [activeRunId, mlView, setMlView]);

  useEffect(() => {
    if (!activeRunId || activeRunPipeline === undefined) {
      return;
    }
    if (isActiveRunLocalAnomaly) {
      if (!isLocalAnomalyView(mlView)) {
        setMlView("cluster");
      }
    } else {
      setMlView("cluster");
    }
  }, [activeRunId, activeRunPipeline, isActiveRunLocalAnomaly, mlView, setMlView]);

  useEffect(() => {
    if (!datasetsForArea.length) {
      return;
    }
    if (!datasetsForArea.some((dataset) => dataset.id === datasetId)) {
      setDatasetId(datasetsForArea[0].id);
    }
  }, [datasetId, datasetsForArea]);

  useEffect(() => {
    if (
      track !== "all" &&
      !mlTrackOptions.some((option) => String(option.track) === track)
    ) {
      setTrack("all");
    }
  }, [mlTrackOptions, track]);

  async function handleRun() {
    if (!mapBBox || !selectedDataset) return;
    const params: Record<string, number> = {
      max_distance_m: maxDistance,
      buffer_multiplier: bufferMultiplier,
      min_buffer_m: minBuffer,
      default_height_m: defaultHeight,
    };
    const payload = {
      pipeline,
      area_id: selectedAreaId,
      dataset_id: selectedDataset.id,
      source: "gba",
      track: track === "all" ? null : Number(track),
      bbox: mapBBox,
      params,
    };
    const result = await createMlRun(payload);
    if (result?.run_id) {
      setActiveRunId(result.run_id);
      setMlView("cluster");
    }
  }

  async function handleDelete(runId: string) {
    await deleteMlRun(runId, true);
    if (activeRunId === runId) {
      setActiveRunId(null);
    }
    runsQuery.refetch();
  }

  async function handleRefresh() {
    if (activeRunId && showMlBuildings) {
      try {
        await recolorMlRun(activeRunId);
      } catch (err) {
        console.warn("Failed to recompute building colors", err);
      }
    }
    bumpMlTileVersion();
    activeRunQuery.refetch();
  }

  return (
    <div className="panel panel-left">
      <div>
        <h2>Auswertung / ML</h2>
        <small>Lokale Anomalieanalyse für den aktuellen Kartenausschnitt.</small>
      </div>

      <Section title="Kartenausschnitt">
        <MetricLine label="Aktuelle Bounding Box" value={bboxLabel} />
        {activeRunQuery.data && (
          <>
            <MetricLine label="AOI" value={activeRunQuery.data.area_id ?? "unbekannt"} />
            <MetricLine
              label="Dataset"
              value={activeRunQuery.data.dataset_id ?? "unbekannt"}
            />
            <MetricLine
              label="Zugeordnete Gebäude"
              value={activeRunQuery.data.metrics?.assigned_buildings ?? 0}
            />
            <MetricLine
              label="Zugeordnete Punkte"
              value={activeRunQuery.data.metrics?.assigned_points ?? 0}
            />
          </>
        )}
      </Section>

      <Section title="Neue Auswertung">
        <div className="space-y-1.5">
          <Label htmlFor="pipeline-input">Verfahren</Label>
          <Input id="pipeline-input" value="Lokale Anomalieanalyse v1" readOnly />
        </div>

        <Badge variant="secondary" className="font-normal">
          AOI: {areaLabel}. Gebäudequelle ist für {pipeline} fest auf GBA gesetzt.
        </Badge>

        <div className="space-y-1.5">
          <Label htmlFor="dataset-select">Dataset</Label>
          <Select
            value={selectedDataset?.id ?? ""}
            onValueChange={(value) => setDatasetId(value)}
            disabled={datasetsForArea.length <= 1}
          >
            <SelectTrigger id="dataset-select">
              <SelectValue placeholder="Dataset wählen" />
            </SelectTrigger>
            <SelectContent>
              {datasetsForArea.map((dataset) => (
                <SelectItem key={dataset.id} value={dataset.id}>
                  {dataset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="track-select">InSAR-Track</Label>
          <Select value={track} onValueChange={setTrack}>
            <SelectTrigger id="track-select">
              <SelectValue placeholder="Alle ML-Tracks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle verifizierten Tracks</SelectItem>
              {(selectedDataset?.tracks ?? []).map((option) => (
                <SelectItem
                  key={`${option.datasetId}:${option.track}`}
                  value={String(option.track)}
                  disabled={option.directionDependentMl === false}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Collapsible open={paramsOpen} onOpenChange={setParamsOpen} className="space-y-2">
          <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            Erweiterte Parameter
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="space-y-2 pl-1 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="max-distance">Maximaler Abstand (m)</Label>
                <Input
                  id="max-distance"
                  type="number"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buffer-mult">Buffer-Multiplikator</Label>
                <Input
                  id="buffer-mult"
                  type="number"
                  step={0.1}
                  value={bufferMultiplier}
                  onChange={(e) => setBufferMultiplier(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min-buffer">Minimaler Buffer (m)</Label>
                <Input
                  id="min-buffer"
                  type="number"
                  step={0.5}
                  value={minBuffer}
                  onChange={(e) => setMinBuffer(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-height">Standardhöhe (m)</Label>
                <Input
                  id="default-height"
                  type="number"
                  step={0.5}
                  value={defaultHeight}
                  onChange={(e) => setDefaultHeight(Number(e.target.value))}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button className="w-full" onClick={handleRun} disabled={!mapBBox || !selectedDataset}>
          Auswertung starten
        </Button>
      </Section>

      <Section title="Darstellung">
        <ToggleRow
          label="ML-Punkte anzeigen"
          checked={showMlLayer}
          onChange={setShowMlLayer}
        />
        <ToggleRow
          label="Zugeordnete Gebäude anzeigen"
          checked={showMlBuildings}
          onChange={setShowMlBuildings}
          disabled={!hasAssignedBuildings}
        />
        {activeRunId && assignedBuildings === 0 && (
          <EmptyState
            tone="warning"
            title="Keine Gebäude zugeordnet"
            message="Prüfen Sie, ob GBA-Daten in PostGIS geladen sind und der Kartenausschnitt unterstützte Gebäude schneidet."
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
      </Section>

      {isActiveRunLocalAnomaly && (
        <Section title="Ergebniskennzahlen">
          <MetricLine
            label="Normal / Verdacht / Ausreißer"
            value={`${activeRunQuery.data?.metrics?.normal_points ?? 0} / ${
              activeRunQuery.data?.metrics?.suspect_points ?? 0
            } / ${activeRunQuery.data?.metrics?.outlier_points ?? 0}`}
          />
          <MetricLine
            label="Vollständige Cross-Track-Stützung"
            value={activeRunQuery.data?.metrics?.full_cross_track_points ?? 0}
          />
          <MetricLine
            label="Cross-Track-Verbesserung"
            value={Number(
              activeRunQuery.data?.metrics?.cross_track_improvement ?? 0
            ).toFixed(2)}
          />
          <MetricLine
            label="Gebäude mit Clustern"
            value={activeRunQuery.data?.metrics?.buildings_with_clusters ?? 0}
          />
          <MetricLine
            label="Rauschen / durch Gate ausgeschlossen"
            value={`${activeRunQuery.data?.metrics?.noise_points ?? 0} / ${
              activeRunQuery.data?.metrics?.gate_excluded_points ?? 0
            }`}
          />
        </Section>
      )}

      <Section title="Letzte Auswertungen">
        {runsQuery.isLoading && (
          <Badge variant="secondary" className="font-normal">
            Auswertungen laden...
          </Badge>
        )}
        {runsQuery.data && visibleRuns.length > 0 && (
          <ul className="grid gap-2">
            {visibleRuns.map((run) => {
              const isActive = run.run_id === activeRunId;
              return (
                <li
                  key={run.run_id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary"
                  )}
                >
                  <button
                    type="button"
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
                    onClick={() => {
                      setActiveRunId(run.run_id);
                      setMlView("cluster");
                    }}
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                      Lokale Anomalieanalyse
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {(run.area_id ?? "unbekannt").replace("_", " ")} · {run.status}
                    </span>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(run.run_id)}
                    aria-label="Auswertung löschen"
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {runsQuery.data && visibleRuns.length === 0 && (
          <EmptyState
            title="Noch keine Auswertungen"
            message={`Für ${pipeline} wurden noch keine Läufe gestartet.`}
          />
        )}
      </Section>
    </div>
  );
}
