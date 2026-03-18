import { basemaps } from "../lib/basemaps";
import { satelliteCameraPresets } from "../lib/cameraModes";
import {
  HEIGHT_PALETTE,
  TRACK_44_OUTLINE_COLOR,
  TRACK_95_OUTLINE_COLOR,
  getHeightCycleLength,
  formatHeightLegendValue,
  formatHeightSensitivity,
  getHeightLegendAnchors,
  heightSensitivityToSlider,
  sliderToHeightSensitivity,
} from "../lib/pointStyling";
import { useAppStore } from "../lib/store";
import PipelinePanel from "./PipelinePanel";

const velocityLegendItems = [
  { color: "#8e0f2f", label: "Strong subsidence (< -5)" },
  { color: "#e67f1c", label: "Moderate subsidence (-5 to -2)" },
  { color: "#f2c14e", label: "Slight subsidence (-2 to -1)" },
  { color: "#2c9f7a", label: "Stable (-1 to 1)" },
  { color: "#4aa5d5", label: "Uplift (1 to 5)" },
  { color: "#1c2f4a", label: "Strong uplift (> 5)" },
];

const trackLegendItems = [
  { color: TRACK_44_OUTLINE_COLOR, label: "Track 44 Rand" },
  { color: TRACK_95_OUTLINE_COLOR, label: "Track 95 Rand" },
];

export default function LayerPanel() {
  const layers = useAppStore((state) => state.layers);
  const filters = useAppStore((state) => state.filters);
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const basemapId = useAppStore((state) => state.basemapId);
  const cameraMode = useAppStore((state) => state.cameraMode);
  const pointColorMode = useAppStore((state) => state.pointColorMode);
  const heightSensitivityM = useAppStore((state) => state.heightSensitivityM);
  const showTrackOutlines = useAppStore((state) => state.showTrackOutlines);
  const setLayer = useAppStore((state) => state.setLayer);
  const setFilter = useAppStore((state) => state.setFilter);
  const setFiltersEnabled = useAppStore((state) => state.setFiltersEnabled);
  const setBasemapId = useAppStore((state) => state.setBasemapId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setPointColorMode = useAppStore((state) => state.setPointColorMode);
  const setHeightSensitivityM = useAppStore((state) => state.setHeightSensitivityM);
  const setShowTrackOutlines = useAppStore((state) => state.setShowTrackOutlines);

  const heightLegendAnchors = getHeightLegendAnchors(heightSensitivityM);
  const heightCycleLength = getHeightCycleLength(heightSensitivityM);
  const heightLegendItems = HEIGHT_PALETTE.map((color, index) => ({
    color,
    label: `${formatHeightLegendValue(heightLegendAnchors[index])}-${formatHeightLegendValue(
      heightLegendAnchors[index] + heightSensitivityM
    )} m`,
  }));
  const heightSliderValue = heightSensitivityToSlider(heightSensitivityM);
  const legendItems = pointColorMode === "height" ? heightLegendItems : velocityLegendItems;

  return (
    <div className="panel panel-left">
      <div>
        <h2>Layers & Filters</h2>
        <small>Toggle sources and constrain signal quality.</small>
      </div>

      <div>
        <div className="section-title">Basemap</div>
        <div className="toggle-row">
          <span>{basemaps.light.label}</span>
          <input
            type="checkbox"
            className="toggle"
            checked={basemapId === basemaps.light.id}
            onChange={() => setBasemapId(basemaps.light.id)}
          />
        </div>
        <div className="toggle-row">
          <span>Satellite (Luftbild)</span>
          <input
            type="checkbox"
            className="toggle"
            checked={basemapId === basemaps.satellite.id}
            onChange={() => setBasemapId(basemaps.satellite.id)}
          />
        </div>
      </div>

      <div>
        <div className="section-title">InSAR Tracks</div>
        <div className="toggle-row">
          <span>Track 44 (Ascending)</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.insar44}
            onChange={(e) => setLayer("insar44", e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>Track 95 (Descending)</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.insar95}
            onChange={(e) => setLayer("insar95", e.target.checked)}
          />
        </div>
      </div>

      <div>
        <div className="section-title">Kameraansicht</div>
        <div className="form-row">
          <label className="label">Perspektive</label>
          <select
            className="select"
            value={cameraMode}
            onChange={(e) =>
              setCameraMode(
                e.target.value as "default" | "satellite_track44" | "satellite_track95"
              )
            }
          >
            <option value="default">Standard</option>
            <option value="satellite_track44">{satelliteCameraPresets.satellite_track44.label}</option>
            <option value="satellite_track95">{satelliteCameraPresets.satellite_track95.label}</option>
          </select>
        </div>
        <small>
          LOS-basiert: Track 44 blickt nach Osten, Track 95 nach Westen. Der Modus fixiert
          Blickrichtung und Winkel, Pan und Zoom bleiben aktiv.
        </small>
      </div>

      <div>
        <div className="section-title">Buildings</div>
        <div className="toggle-row">
          <span>Global Building Atlas (3D)</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.gba}
            onChange={(e) => setLayer("gba", e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>OSM Footprints</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.osm}
            onChange={(e) => setLayer("osm", e.target.checked)}
          />
        </div>
      </div>

      <div>
        <div className="section-title">Terrain (SRTM)</div>
        <div className="toggle-row">
          <span>Relief</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.reliefHillshade}
            onChange={(e) => setLayer("reliefHillshade", e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>Hangneigung</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.reliefSlope}
            onChange={(e) => setLayer("reliefSlope", e.target.checked)}
          />
        </div>
      </div>

      <div>
        <div className="section-title">Punktdarstellung</div>
        <div className="form-row">
          <label className="label">Farblogik</label>
          <select
            className="select"
            value={pointColorMode}
            onChange={(e) => setPointColorMode(e.target.value as "velocity" | "height")}
          >
            <option value="velocity">Geschwindigkeit</option>
            <option value="height">InSAR-Hoehe</option>
          </select>
        </div>
        <div className="toggle-row">
          <span>Track-Raender</span>
          <input
            type="checkbox"
            className="toggle"
            checked={showTrackOutlines}
            onChange={(e) => setShowTrackOutlines(e.target.checked)}
          />
        </div>

        {pointColorMode === "height" && (
          <>
            <div className="metric">
              <span className="label">Empfindlichkeit (m)</span>
              <span className="value">{formatHeightSensitivity(heightSensitivityM)}</span>
            </div>
            <input
              type="range"
              className="slider"
              min={0}
              max={2}
              step={0.01}
              value={heightSliderValue}
              onChange={(e) =>
                setHeightSensitivityM(sliderToHeightSensitivity(Number(e.target.value)))
              }
            />
            <small>
              Die Hoehenfaerbung arbeitet in festen Hoehenklassen. Kleinere Werte erzeugen
              feinere Klassen und kuerzere Farbzyklen. Grundlage ist nur das vorhandene
              InSAR-Attribut `height`.
            </small>
          </>
        )}
      </div>

      <div>
        <div className="section-title">Filters</div>
        <div className="toggle-row">
          <span>Filters enabled</span>
          <input
            type="checkbox"
            className="toggle"
            checked={filtersEnabled}
            onChange={(e) => setFiltersEnabled(e.target.checked)}
          />
        </div>
        <div className="metric">
          <span className="label">Velocity min (mm/yr)</span>
          <span className="value">{filters.velocityMin.toFixed(1)}</span>
        </div>
        <input
          type="range"
          className="slider"
          min={-20}
          max={0}
          step={0.5}
          value={filters.velocityMin}
          disabled={!filtersEnabled}
          onChange={(e) => setFilter("velocityMin", Number(e.target.value))}
        />

        <div className="metric">
          <span className="label">Velocity max (mm/yr)</span>
          <span className="value">{filters.velocityMax.toFixed(1)}</span>
        </div>
        <input
          type="range"
          className="slider"
          min={0}
          max={20}
          step={0.5}
          value={filters.velocityMax}
          disabled={!filtersEnabled}
          onChange={(e) => setFilter("velocityMax", Number(e.target.value))}
        />

        <div className="metric">
          <span className="label">Coherence min</span>
          <span className="value">{filters.coherenceMin.toFixed(2)}</span>
        </div>
        <input
          type="range"
          className="slider"
          min={0.1}
          max={1}
          step={0.05}
          value={filters.coherenceMin}
          disabled={!filtersEnabled}
          onChange={(e) => setFilter("coherenceMin", Number(e.target.value))}
        />
      </div>

      <div>
        <div className="section-title">Legend</div>
        <div className="legend">
          {legendItems.map((item) => (
            <div className="legend-item" key={item.label}>
              <span className="legend-swatch" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
        {pointColorMode === "height" && (
          <small>
            Die Hoehenklassen starten bei 450 m und wiederholen sich alle{" "}
            {formatHeightLegendValue(heightCycleLength)} m.
          </small>
        )}
        {showTrackOutlines && (
          <div className="legend" style={{ marginTop: 12 }}>
            {trackLegendItems.map((item) => (
              <div className="legend-item" key={item.label}>
                <span
                  className="legend-swatch"
                  style={{
                    background: "#fbfaf7",
                    border: `2px solid ${item.color}`,
                    boxShadow: "0 0 0 1px rgba(251, 250, 247, 0.95)",
                  }}
                />
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <PipelinePanel />
    </div>
  );
}
