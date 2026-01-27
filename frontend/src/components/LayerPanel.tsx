import { useAppStore } from "../lib/store";

export default function LayerPanel() {
  const layers = useAppStore((state) => state.layers);
  const filters = useAppStore((state) => state.filters);
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const setLayer = useAppStore((state) => state.setLayer);
  const setFilter = useAppStore((state) => state.setFilter);
  const setFiltersEnabled = useAppStore((state) => state.setFiltersEnabled);

  return (
    <div className="panel panel-left">
      <div>
        <h2>Layers & Filters</h2>
        <small>Toggle sources and constrain signal quality.</small>
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
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "#8e0f2f" }} />
            Strong subsidence (&lt; -5)
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "#e67f1c" }} />
            Moderate subsidence (-5 to -2)
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "#f2c14e" }} />
            Slight subsidence (-2 to -1)
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "#2c9f7a" }} />
            Stable (-1 to 1)
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "#4aa5d5" }} />
            Uplift (1 to 5)
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: "#1c2f4a" }} />
            Strong uplift (&gt; 5)
          </div>
        </div>
      </div>
    </div>
  );
}
