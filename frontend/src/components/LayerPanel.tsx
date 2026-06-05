import { basemaps, type BasemapId } from "../lib/basemaps";
import {
  cameraModeForTrack,
  cameraPresetForTrack,
  type CameraMode,
} from "../lib/cameraModes";
import { useAppConfig } from "../hooks/useApi";
import {
  getTrackVisibilityKey,
  normalizeAppConfig,
} from "../lib/configMetadata";
import {
  HEIGHT_PALETTE,
  getHeightCycleLength,
  formatHeightLegendValue,
  formatHeightSensitivity,
  getHeightLegendAnchors,
  getTrackOutlineColor,
  heightSensitivityToSlider,
  sliderToHeightSensitivity,
} from "../lib/pointStyling";
import { useAppStore } from "../lib/store";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
} from "./ui";

const velocityLegendItems = [
  { color: "#8e0f2f", label: "Starke Senkung (< -5)" },
  { color: "#e67f1c", label: "Moderate Senkung (-5 bis -2)" },
  { color: "#f2c14e", label: "Leichte Senkung (-2 bis -1)" },
  { color: "#2c9f7a", label: "Stabil (-1 bis 1)" },
  { color: "#4aa5d5", label: "Hebung (1 bis 5)" },
  { color: "#1c2f4a", label: "Starke Hebung (> 5)" },
];

type ToggleSpec = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

function ToggleRow({ label, checked, onChange }: ToggleSpec) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="min-w-0 text-sm leading-snug text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Section({
  title,
  children,
  description,
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
          <p className="-mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export default function LayerPanel() {
  const layers = useAppStore((state) => state.layers);
  const selectedAreaId = useAppStore((state) => state.selectedAreaId);
  const filters = useAppStore((state) => state.filters);
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const basemapId = useAppStore((state) => state.basemapId);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const pointColorMode = useAppStore((state) => state.pointColorMode);
  const heightSensitivityM = useAppStore((state) => state.heightSensitivityM);
  const showTrackOutlines = useAppStore((state) => state.showTrackOutlines);
  const setLayer = useAppStore((state) => state.setLayer);
  const setSelectedAreaId = useAppStore((state) => state.setSelectedAreaId);
  const setInsarTrackVisibility = useAppStore((state) => state.setInsarTrackVisibility);
  const setFilter = useAppStore((state) => state.setFilter);
  const setFiltersEnabled = useAppStore((state) => state.setFiltersEnabled);
  const setBasemapId = useAppStore((state) => state.setBasemapId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setPointColorMode = useAppStore((state) => state.setPointColorMode);
  const setHeightSensitivityM = useAppStore((state) => state.setHeightSensitivityM);
  const setShowTrackOutlines = useAppStore((state) => state.setShowTrackOutlines);
  const configQuery = useAppConfig();
  const appConfig = normalizeAppConfig(configQuery.data);
  const selectedArea =
    appConfig.areas.find((area) => area.id === selectedAreaId) ?? appConfig.areas[0];
  const selectedAreaDatasets = appConfig.datasets.filter(
    (dataset) => selectedArea && dataset.areaId === selectedArea.id
  );
  const selectedTracks = selectedAreaDatasets.flatMap((dataset) =>
    dataset.tracks.map((track) => ({ dataset, track }))
  );
  const cameraOptions = selectedTracks
    .map(({ dataset, track }) => ({
      mode: cameraModeForTrack(dataset.id, track.track),
      preset: cameraPresetForTrack(track),
    }))
    .filter(
      (option): option is { mode: CameraMode; preset: NonNullable<ReturnType<typeof cameraPresetForTrack>> } =>
        Boolean(option.preset)
    );

  const heightLegendAnchors = getHeightLegendAnchors(heightSensitivityM);
  const heightCycleLength = getHeightCycleLength(heightSensitivityM);
  const heightLegendItems = HEIGHT_PALETTE.map((color, index) => ({
    color,
    label: `${formatHeightLegendValue(heightLegendAnchors[index])} bis ${formatHeightLegendValue(
      heightLegendAnchors[index] + heightSensitivityM
    )} m`,
  }));
  const heightSliderValue = heightSensitivityToSlider(heightSensitivityM);
  const legendItems = pointColorMode === "height" ? heightLegendItems : velocityLegendItems;

  return (
    <div className="panel panel-left">
      <div>
        <h2>Karte</h2>
        <small>Kartengrundlage, Datenebenen, Filter und Legende.</small>
      </div>

      <Section title="Kartengrundlage">
        <div className="space-y-1.5">
          <Label htmlFor="area-select">AOI</Label>
          <Select
            value={selectedArea?.id ?? ""}
            onValueChange={setSelectedAreaId}
            disabled={!selectedArea}
          >
            <SelectTrigger id="area-select">
              <SelectValue placeholder="AOI wählen" />
            </SelectTrigger>
            <SelectContent>
              {appConfig.areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="basemap-select">Basiskarte</Label>
          <Select
            value={basemapId}
            onValueChange={(value) => setBasemapId(value as BasemapId)}
          >
            <SelectTrigger id="basemap-select">
              <SelectValue placeholder="Basiskarte wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={basemaps.light.id}>Fachkarte hell</SelectItem>
              <SelectItem value={basemaps.satellite.id}>Luftbild</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="InSAR-Tracks">
        {selectedAreaDatasets.map((dataset) => (
          <div key={dataset.id} className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              {dataset.sensor} · {dataset.label}
            </div>
            {dataset.tracks.map((track) => {
              const visibilityKey = getTrackVisibilityKey(dataset.id, track.track);
              const checked = layers.insarTracks[visibilityKey] ?? true;
              const bearing =
                track.lookBearingDeg === undefined
                  ? ""
                  : `, Blick ${track.lookBearingDeg.toFixed(1).replace(".", ",")} Grad`;
              return (
                <ToggleRow
                  key={visibilityKey}
                  label={`${track.label}${bearing}`}
                  checked={checked}
                  onChange={(next) =>
                    setInsarTrackVisibility(dataset.id, track.track, next)
                  }
                />
              );
            })}
          </div>
        ))}
      </Section>

      <Section title="Gebäude und Kontext">
        <ToggleRow
          label="Global Building Atlas (3D)"
          checked={layers.gba}
          onChange={(checked) => setLayer("gba", checked)}
        />
        <ToggleRow
          label="OSM-Gebäudegrundrisse"
          checked={layers.osm}
          onChange={(checked) => setLayer("osm", checked)}
        />
        <ToggleRow
          label="SRTM-Relief"
          checked={layers.reliefHillshade}
          onChange={(checked) => setLayer("reliefHillshade", checked)}
        />
        <ToggleRow
          label="SRTM-Hangneigung"
          checked={layers.reliefSlope}
          onChange={(checked) => setLayer("reliefSlope", checked)}
        />
      </Section>

      <Section
        title="Kamera"
        description="LOS-Blickrichtungen werden exakt geführt; die Kamera ist grob nach Ost oder West ausgerichtet. Kandidatenflächen liegen sensorseitig, also entgegen der Blickrichtung."
      >
        <div className="space-y-1.5">
          <Label htmlFor="camera-select">Perspektive</Label>
          <Select
            value={cameraMode}
            onValueChange={(value) => setCameraMode(value as CameraMode)}
          >
            <SelectTrigger id="camera-select">
              <SelectValue placeholder="Perspektive wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standardansicht</SelectItem>
              {cameraOptions.map((option) => (
                <SelectItem key={option.mode} value={option.mode}>
                  {option.preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Punktdarstellung">
        <div className="space-y-1.5">
          <Label htmlFor="point-color-select">Einfärbung</Label>
          <Select
            value={pointColorMode}
            onValueChange={(value) =>
              setPointColorMode(value as "velocity" | "height")
            }
          >
            <SelectTrigger id="point-color-select">
              <SelectValue placeholder="Einfärbung wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="velocity">Geschwindigkeit</SelectItem>
              <SelectItem value="height">InSAR-Höhe</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleRow
          label="Track-Ränder anzeigen"
          checked={showTrackOutlines}
          onChange={setShowTrackOutlines}
        />

        {pointColorMode === "height" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Empfindlichkeit (m)</Label>
              <span className="font-mono text-xs text-foreground">
                {formatHeightSensitivity(heightSensitivityM)}
              </span>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.01}
              value={[heightSliderValue]}
              onValueChange={([v]) =>
                setHeightSensitivityM(sliderToHeightSensitivity(v))
              }
            />
            <p className="text-xs leading-snug text-muted-foreground">
              Kleinere Werte erzeugen feinere Höhenklassen und kürzere Farbzyklen.
              Grundlage ist das vorhandene InSAR-Attribut height.
            </p>
          </div>
        )}
      </Section>

      <Section title="Filter">
        <ToggleRow
          label="Grenzwerte verwenden"
          checked={filtersEnabled}
          onChange={setFiltersEnabled}
        />
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <Label>Geschwindigkeit min. (mm/Jahr)</Label>
            <span className="font-mono text-xs text-foreground">
              {filters.velocityMin.toFixed(1)}
            </span>
          </div>
          <Slider
            min={-20}
            max={0}
            step={0.5}
            value={[filters.velocityMin]}
            disabled={!filtersEnabled}
            onValueChange={([v]) => setFilter("velocityMin", v)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Geschwindigkeit max. (mm/Jahr)</Label>
            <span className="font-mono text-xs text-foreground">
              {filters.velocityMax.toFixed(1)}
            </span>
          </div>
          <Slider
            min={0}
            max={20}
            step={0.5}
            value={[filters.velocityMax]}
            disabled={!filtersEnabled}
            onValueChange={([v]) => setFilter("velocityMax", v)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Kohärenz min.</Label>
            <span className="font-mono text-xs text-foreground">
              {filters.coherenceMin.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0.1}
            max={1}
            step={0.05}
            value={[filters.coherenceMin]}
            disabled={!filtersEnabled}
            onValueChange={([v]) => setFilter("coherenceMin", v)}
          />
        </div>
      </Section>

      <Section title="Legende">
        <div className="legend">
          {legendItems.map((item) => (
            <div className="legend-item" key={item.label}>
              <span className="legend-swatch" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
        {pointColorMode === "height" && (
          <p className="text-xs leading-snug text-muted-foreground">
            Die Höhenklassen starten bei 450 m und wiederholen sich alle{" "}
            {formatHeightLegendValue(heightCycleLength)} m.
          </p>
        )}
        {showTrackOutlines && (
          <div className="legend mt-3">
            {selectedTracks.map(({ dataset, track }, index) => (
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
        )}
      </Section>
    </div>
  );
}
