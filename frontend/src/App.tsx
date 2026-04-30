import { useState } from "react";
import LayerPanel from "./components/LayerPanel";
import InspectorPanel from "./components/InspectorPanel";
import MapView from "./components/MapView";
import PipelinePanel from "./components/PipelinePanel";
import TimeseriesPanel from "./components/TimeseriesPanel";
import {
  ShadTabs as Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui";
import { useAppStore } from "./lib/store";

type LeftPanelTab = "map" | "analysis";

export default function App() {
  const selection = useAppStore((state) => state.selection);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>("map");
  const hasPointSelection = selection?.type === "point";

  return (
    <div className={`app ${hasPointSelection ? "app-has-timeseries" : ""}`}>
      <Tabs
        value={activeLeftTab}
        onValueChange={(value) => setActiveLeftTab(value as LeftPanelTab)}
        className="left-shell"
      >
        <TabsList aria-label="Linke Seitenleiste" className="h-10">
          <TabsTrigger value="map">Karte</TabsTrigger>
          <TabsTrigger value="analysis">Auswertung</TabsTrigger>
        </TabsList>
        <div className="panel-host">
          <TabsContent
            value="map"
            className="!mt-0 h-full w-full min-h-0 min-w-0 flex data-[state=inactive]:hidden"
            forceMount
          >
            <LayerPanel />
          </TabsContent>
          <TabsContent
            value="analysis"
            className="!mt-0 h-full w-full min-h-0 min-w-0 flex data-[state=inactive]:hidden"
            forceMount
          >
            <PipelinePanel />
          </TabsContent>
        </div>
      </Tabs>

      <div className="map-shell">
        <MapView />
        <div className="map-overlay">
          <span className="badge">Salzburg InSAR Viewer</span>
          <span className="text-muted-foreground">
            Multi-Source-Bewegungsanalytik
          </span>
        </div>
      </div>

      <InspectorPanel />
      {hasPointSelection && <TimeseriesPanel />}
    </div>
  );
}
