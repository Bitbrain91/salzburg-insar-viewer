import { useEffect, useMemo, useState } from "react";
import { useAppConfig } from "../../hooks/useApi";
import { useCreateMlRun } from "../../hooks/useMlQueries";
import { normalizeAppConfig } from "../../lib/configMetadata";
import { useAppStore } from "../../lib/store";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui";
import { CollapsibleSection } from "../ui";

const PIPELINE_NAME = "anomaly_local_v1";
const PIPELINE_BUILDING_SOURCE = { value: "bev", label: "BEV" } as const;

type NewRunFormProps = {
  /** Nach erfolgreichem Start (Run aktiviert): Formular schliessen etc. */
  onStarted?: (runId: string) => void;
};

/**
 * Formular "Neue Auswertung" (aus PipelinePanel extrahiert). Analysiert den
 * aktuellen Kartenausschnitt; Parameter-Defaults entsprechen den
 * Pipeline-Defaults (max_distance_m 15, vorher wich die UI mit 30 ab).
 */
export function NewRunForm({ onStarted }: NewRunFormProps) {
  const mapBBox = useAppStore((state) => state.mapBBox);
  const selectedAreaId = useAppStore((state) => state.selectedAreaId);
  const setActiveRunIdClearingFocus = useAppStore(
    (state) => state.setActiveRunIdClearingFocus
  );
  const setMlView = useAppStore((state) => state.setMlView);

  const configQuery = useAppConfig();
  const appConfig = useMemo(
    () => normalizeAppConfig(configQuery.data),
    [configQuery.data]
  );
  const areaLabel =
    appConfig.areas.find((area) => area.id === selectedAreaId)?.label ?? selectedAreaId;
  const datasetsForArea = useMemo(
    () => appConfig.datasets.filter((dataset) => dataset.areaId === selectedAreaId),
    [appConfig.datasets, selectedAreaId]
  );

  const [label, setLabel] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [track, setTrack] = useState<string>("all");
  const [maxDistance, setMaxDistance] = useState(15);
  const [bufferMultiplier, setBufferMultiplier] = useState(1.0);
  const [minBuffer, setMinBuffer] = useState(3.0);
  const [defaultHeight, setDefaultHeight] = useState(12.0);

  const createRun = useCreateMlRun();

  const selectedDataset =
    datasetsForArea.find((dataset) => dataset.id === datasetId) ?? datasetsForArea[0];
  const mlTrackOptions = (selectedDataset?.tracks ?? []).filter(
    (option) => option.directionDependentMl !== false
  );

  useEffect(() => {
    if (!datasetsForArea.length) return;
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
    const payload = {
      pipeline: PIPELINE_NAME,
      area_id: selectedAreaId,
      dataset_id: selectedDataset.id,
      source: PIPELINE_BUILDING_SOURCE.value,
      track: track === "all" ? null : Number(track),
      bbox: mapBBox,
      params: {
        max_distance_m: maxDistance,
        buffer_multiplier: bufferMultiplier,
        min_buffer_m: minBuffer,
        default_height_m: defaultHeight,
      },
      label: label.trim() === "" ? null : label.trim(),
    };
    const result = await createRun.mutateAsync(payload);
    if (result?.run_id) {
      setActiveRunIdClearingFocus(result.run_id);
      setMlView("cluster");
      setLabel("");
      onStarted?.(result.run_id);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-snug text-muted-foreground">
        Analysiert den aktuellen Kartenausschnitt mit der lokalen
        Anomalieanalyse (v1). Gebäudequelle ist fest{" "}
        {PIPELINE_BUILDING_SOURCE.label}.
      </p>
      <Badge variant="secondary" className="font-normal">
        Gebiet: {areaLabel}
      </Badge>

      <div className="space-y-1.5">
        <Label htmlFor="run-label-input">Name (optional)</Label>
        <Input
          id="run-label-input"
          value={label}
          maxLength={120}
          placeholder="z. B. Mirabell Ost, Test höherer Buffer"
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

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

      <CollapsibleSection title="Erweiterte Parameter" defaultOpen={false}>
        <div className="space-y-2 pt-1">
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
      </CollapsibleSection>

      <Button
        className="w-full"
        onClick={handleRun}
        disabled={!mapBBox || !selectedDataset || createRun.isPending}
      >
        {createRun.isPending ? "Wird gestartet…" : "Auswertung starten"}
      </Button>
    </div>
  );
}
