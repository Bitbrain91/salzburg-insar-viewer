import { useRef, useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Toaster } from "sonner";
import InspectorPanel from "../InspectorPanel";
import LayerPanel from "../LayerPanel";
import MapView from "../MapView";
import PipelinePanel from "../PipelinePanel";
import SearchBox from "../SearchBox";
import TimeseriesPanel from "../TimeseriesPanel";
import {
  ShadTabs as Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui";
import { useAppStore } from "../../lib/store";
import { ActiveRunChip } from "./ActiveRunChip";
import { MapLegend } from "./MapLegend";
import { TimeseriesCollapsedBar, TimeseriesDock } from "./TimeseriesDock";
import { useMediaQuery } from "./useMediaQuery";

/**
 * App-Skelett: drei per Drag verstellbare Spalten (react-resizable-panels,
 * Persistenz via autoSaveId), Zeitreihe als Dock innerhalb der Kartenspalte
 * (kein Layout-Shift der Seitenspalten), unter 1200px gestapelte Ansicht.
 */
export function AppShell() {
  const selection = useAppStore((state) => state.selection);
  const timeseriesCollapsed = useAppStore((state) => state.timeseriesCollapsed);
  const activeLeftTab = useAppStore((state) => state.activeLeftTab);
  const setActiveLeftTab = useAppStore((state) => state.setActiveLeftTab);
  const hasPointSelection = selection?.type === "point";
  const isStacked = useMediaQuery("(max-width: 1200px)");

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const leftContent = (
    <Tabs
      value={activeLeftTab}
      onValueChange={(value) => setActiveLeftTab(value as "map" | "analysis")}
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
  );

  const mapContent = (
    <div className="map-shell">
      <MapView />
      <div className="map-overlay">
        <SearchBox />
      </div>
      <ActiveRunChip />
      <MapLegend />
    </div>
  );

  if (isStacked) {
    return (
      <div className="shell-stacked flex min-h-dvh w-full flex-col gap-3 overflow-y-auto p-3">
        {leftContent}
        <div className="relative h-[58vh] min-h-[480px] shrink-0">
          <div className="shell-panel-fill">{mapContent}</div>
        </div>
        {hasPointSelection && (
          <div className="h-[280px] shrink-0">
            <div className="shell-panel-fill">
              <TimeseriesPanel />
            </div>
          </div>
        )}
        <InspectorPanel />
        <Toaster richColors position="bottom-right" />
      </div>
    );
  }

  return (
    <div className="h-dvh w-full p-3">
      <PanelGroup direction="horizontal" autoSaveId="insar-shell" className="h-full">
        <Panel
          ref={leftPanelRef}
          collapsible
          collapsedSize={0}
          defaultSize={22}
          minSize={14}
          className="min-w-0"
          onCollapse={() => setLeftCollapsed(true)}
          onExpand={() => setLeftCollapsed(false)}
        >
          <div className="shell-panel-fill">{leftContent}</div>
        </Panel>
        <ShellResizeHandle
          collapsed={leftCollapsed}
          side="left"
          onToggle={() => {
            const panel = leftPanelRef.current;
            if (!panel) return;
            if (panel.isCollapsed()) panel.expand();
            else panel.collapse();
          }}
        />
        <Panel minSize={32} className="min-w-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <PanelGroup direction="vertical" autoSaveId="insar-mapcol">
                <Panel minSize={40} className="min-h-0">
                  <div className="shell-panel-fill">{mapContent}</div>
                </Panel>
                {hasPointSelection && !timeseriesCollapsed && (
                  <>
                    <PanelResizeHandle className="group flex h-2 items-center justify-center">
                      <div className="h-[3px] w-14 rounded-full bg-border transition-colors group-hover:bg-primary group-data-[resize-handle-active]:bg-primary" />
                    </PanelResizeHandle>
                    <Panel defaultSize={30} minSize={15} maxSize={50} className="min-h-0">
                      <div className="shell-panel-fill">
                        <TimeseriesDock />
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </div>
            {hasPointSelection && timeseriesCollapsed && <TimeseriesCollapsedBar />}
          </div>
        </Panel>
        <ShellResizeHandle
          collapsed={rightCollapsed}
          side="right"
          onToggle={() => {
            const panel = rightPanelRef.current;
            if (!panel) return;
            if (panel.isCollapsed()) panel.expand();
            else panel.collapse();
          }}
        />
        <Panel
          ref={rightPanelRef}
          collapsible
          collapsedSize={0}
          defaultSize={26}
          minSize={18}
          className="min-w-0"
          onCollapse={() => setRightCollapsed(true)}
          onExpand={() => setRightCollapsed(false)}
        >
          <div className="shell-panel-fill">
            <InspectorPanel />
          </div>
        </Panel>
      </PanelGroup>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}

function ShellResizeHandle({
  side,
  collapsed,
  onToggle,
}: {
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
}) {
  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  const Icon = collapsed ? ExpandIcon : CollapseIcon;
  const label =
    side === "left"
      ? collapsed
        ? "Linke Spalte ausklappen"
        : "Linke Spalte einklappen"
      : collapsed
        ? "Inspektor ausklappen"
        : "Inspektor einklappen";
  return (
    <PanelResizeHandle className="group relative flex w-2.5 items-stretch justify-center">
      <div className="w-[3px] rounded-full bg-transparent transition-colors group-hover:bg-primary/60 group-data-[resize-handle-active]:bg-primary" />
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }}
        className="absolute top-1/2 z-[4] inline-grid h-9 w-5 -translate-y-1/2 place-items-center rounded-md border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    </PanelResizeHandle>
  );
}
