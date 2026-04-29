import { basemaps, type BasemapId } from "../lib/basemaps";
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

const velocityLegendItems = [
  { color: "#8e0f2f", label: "Starke Senkung (< -5)" },
  { color: "#e67f1c", label: "Moderate Senkung (-5 bis -2)" },
  { color: "#f2c14e", label: "Leichte Senkung (-2 bis -1)" },
  { color: "#2c9f7a", label: "Stabil (-1 bis 1)" },
  { color: "#4aa5d5", label: "Hebung (1 bis 5)" },
  { color: "#1c2f4a", label: "Starke Hebung (> 5)" },
];

const trackLegendItems = [
  { color: TRACK_44_OUTLINE_COLOR, label: "Track 44 Umriss" },
  { color: TRACK_95_OUTLINE_COLOR, label: "Track 95 Umriss" },
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

      <div>
        <div className="section-title">Kartengrundlage</div>
        <div className="form-row">
          <label className="label">Basiskarte</label>
          <select
            className="select"
            value={basemapId}
            onChange={(e) => setBasemapId(e.target.value as BasemapId)}
          >
            <option value={basemaps.light.id}>Fachkarte hell</option>
            <option value={basemaps.satellite.id}>Luftbild</option>
          </select>
        </div>
      </div>

      <div>
        <div className="section-title">InSAR-Tracks</div>
        <div className="toggle-row">
          <span>Track 44 aufsteigend, Blick 81,4 Grad Ost</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.insar44}
            onChange={(e) => setLayer("insar44", e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>Track 95 absteigend, Blick 281,5 Grad West</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.insar95}
            onChange={(e) => setLayer("insar95", e.target.checked)}
          />
        </div>
      </div>

      <div>
        <div className="section-title">Gebäude und Kontext</div>
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
          <span>OSM-Gebäudegrundrisse</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.osm}
            onChange={(e) => setLayer("osm", e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>SRTM-Relief</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.reliefHillshade}
            onChange={(e) => setLayer("reliefHillshade", e.target.checked)}
          />
        </div>
        <div className="toggle-row">
          <span>SRTM-Hangneigung</span>
          <input
            type="checkbox"
            className="toggle"
            checked={layers.reliefSlope}
            onChange={(e) => setLayer("reliefSlope", e.target.checked)}
          />
        </div>
      </div>

      <div>
        <div className="section-title">Kamera</div>
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
            <option value="default">Standardansicht</option>
            <option value="satellite_track44">{satelliteCameraPresets.satellite_track44.label}</option>
            <option value="satellite_track95">{satelliteCameraPresets.satellite_track95.label}</option>
          </select>
        </div>
        <small>
          LOS-Blickrichtungen werden exakt geführt; die Kamera ist grob nach Ost oder West
          ausgerichtet. Kandidatenflächen liegen sensorseitig, also entgegen der
          Blickrichtung.
        </small>
      </div>

      <div>
        <div className="section-title">Punktdarstellung</div>
        <div className="form-row">
          <label className="label">Einfärbung</label>
          <select
            className="select"
            value={pointColorMode}
            onChange={(e) => setPointColorMode(e.target.value as "velocity" | "height")}
          >
            <option value="velocity">Geschwindigkeit</option>
            <option value="height">InSAR-Höhe</option>
          </select>
        </div>
        <div className="toggle-row">
          <span>Track-Ränder anzeigen</span>
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
              Kleinere Werte erzeugen feinere Höhenklassen und kürzere Farbzyklen.
              Grundlage ist das vorhandene InSAR-Attribut height.
            </small>
          </>
        )}
      </div>

      <div>
        <div className="section-title">Filter</div>
        <div className="toggle-row">
          <span>Grenzwerte verwenden</span>
          <input
            type="checkbox"
            className="toggle"
            checked={filtersEnabled}
            onChange={(e) => setFiltersEnabled(e.target.checked)}
          />
        </div>
        <div className="metric">
          <span className="label">Geschwindigkeit min. (mm/Jahr)</span>
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
          <span className="label">Geschwindigkeit max. (mm/Jahr)</span>
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
          <span className="label">Kohärenz min.</span>
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
        <div className="section-title">Legende</div>
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
            Die Höhenklassen starten bei 450 m und wiederholen sich alle{" "}
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
    </div>
  );
}
