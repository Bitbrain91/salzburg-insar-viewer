import LayerPanel from "./components/LayerPanel";
import InspectorPanel from "./components/InspectorPanel";
import MapView from "./components/MapView";
import TimeseriesPanel from "./components/TimeseriesPanel";

export default function App() {
  return (
    <div className="app">
      <LayerPanel />

      <div className="map-shell">
        <MapView />
        <div className="map-overlay">
          <span className="badge">Salzburg InSAR Viewer</span>
          <span>Multi-source displacement analytics</span>
        </div>
      </div>

      <InspectorPanel />
      <TimeseriesPanel />
    </div>
  );
}
