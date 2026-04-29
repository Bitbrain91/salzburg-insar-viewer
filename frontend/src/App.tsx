import { useState } from "react";
import LayerPanel from "./components/LayerPanel";
import InspectorPanel from "./components/InspectorPanel";
import MapView from "./components/MapView";
import PipelinePanel from "./components/PipelinePanel";
import TimeseriesPanel from "./components/TimeseriesPanel";
import { useAppStore } from "./lib/store";

type LeftPanelTab = "map" | "analysis";

export default function App() {
  const selection = useAppStore((state) => state.selection);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>("map");
  const hasPointSelection = selection?.type === "point";

  return (
    <div className={`app ${hasPointSelection ? "app-has-timeseries" : ""}`}>
      <div className="left-shell">
        <div className="shell-tabs" role="tablist" aria-label="Linke Seitenleiste">
          <button
            type="button"
            id="left-tab-map"
            className={`shell-tab ${activeLeftTab === "map" ? "active" : ""}`}
            role="tab"
            aria-selected={activeLeftTab === "map"}
            aria-controls="left-panel-map"
            onClick={() => setActiveLeftTab("map")}
          >
            Karte
          </button>
          <button
            type="button"
            id="left-tab-analysis"
            className={`shell-tab ${activeLeftTab === "analysis" ? "active" : ""}`}
            role="tab"
            aria-selected={activeLeftTab === "analysis"}
            aria-controls="left-panel-analysis"
            onClick={() => setActiveLeftTab("analysis")}
          >
            Auswertung
          </button>
        </div>

        <div
          className={`panel-host ${
            activeLeftTab === "map" ? "panel-host-map" : "panel-host-analysis"
          }`}
          id={activeLeftTab === "map" ? "left-panel-map" : "left-panel-analysis"}
          role="tabpanel"
          aria-labelledby={activeLeftTab === "map" ? "left-tab-map" : "left-tab-analysis"}
        >
          {activeLeftTab === "map" ? (
            <LayerPanel />
          ) : (
            <PipelinePanel />
          )}
        </div>
      </div>

      <div className="map-shell">
        <MapView />
        <div className="map-overlay">
          <span className="badge">Salzburg InSAR Viewer</span>
          <span>Multi-source displacement analytics</span>
        </div>
      </div>

      <InspectorPanel />
      {hasPointSelection && <TimeseriesPanel />}
    </div>
  );
}
