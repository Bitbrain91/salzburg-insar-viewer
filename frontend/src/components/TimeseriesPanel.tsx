import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import { getPointTimeseries } from "../hooks/useApi";
import { Badge, EmptyState, Switch } from "./ui";
import { cn } from "@/lib/utils";

type TimeseriesMeasurement = {
  date: string;
  displacement?: number | null;
  amplitude?: number | null;
};

type TimeseriesResponse = {
  code: string;
  track?: number | null;
  measurements?: TimeseriesMeasurement[];
};

function SeriesToggle({
  label,
  swatch,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  swatch: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-xs leading-none text-foreground select-none",
        disabled ? "opacity-55 cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <span
        aria-hidden
        className="block h-2 w-2 rounded-full"
        style={{ background: swatch }}
      />
      <span>{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="ml-1"
      />
    </label>
  );
}

export default function TimeseriesPanel() {
  const selection = useAppStore((state) => state.selection);
  const pointSelection = selection?.type === "point" ? selection : null;
  const [showDisplacement, setShowDisplacement] = useState(true);
  const [showAmplitude, setShowAmplitude] = useState(true);

  const tsQuery = useQuery({
    queryKey: ["timeseries", pointSelection?.code, pointSelection?.track],
    queryFn: () =>
      pointSelection
        ? (getPointTimeseries(
            pointSelection.code,
            pointSelection.track
          ) as Promise<TimeseriesResponse>)
        : Promise.resolve(null),
    enabled: Boolean(pointSelection),
  });

  const measurements = tsQuery.data?.measurements ?? [];
  const displacementData: Array<[string, number | null]> = measurements.map(
    (measurement) => [measurement.date, measurement.displacement ?? null]
  );
  const amplitudeData: Array<[string, number | null]> = measurements.map(
    (measurement) => [measurement.date, measurement.amplitude ?? null]
  );
  const hasMeasurements = measurements.length > 0;
  const hasDisplacementData = displacementData.some(([, value]) => value !== null);
  const hasAmplitudeData = amplitudeData.some(([, value]) => value !== null);

  const showLeftAxis = showDisplacement && hasDisplacementData;
  const showRightAxis = showAmplitude && hasAmplitudeData;
  const showAnySeries = showLeftAxis || showRightAxis;

  const option = {
    grid: {
      left: showLeftAxis ? 52 : 20,
      right: showRightAxis ? 56 : 20,
      top: 24,
      bottom: 36,
      containLabel: true,
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { color: "#5c6761" },
      axisLine: { lineStyle: { color: "#d3d9d2" } },
    },
    yAxis: [
      {
        type: "value",
        name: "Verschiebung (mm)",
        nameTextStyle: { color: "#5c6761" },
        axisLabel: { color: "#5c6761" },
        splitLine: { lineStyle: { color: "#e7eae5" } },
        show: showLeftAxis,
      },
      {
        type: "value",
        name: "Amplitude",
        position: "right",
        nameTextStyle: { color: "#8a5a2f" },
        axisLabel: { color: "#8a5a2f" },
        splitLine: { show: false },
        show: showRightAxis,
      },
    ],
    series: [
      ...(showLeftAxis
        ? [
            {
              name: "Verschiebung",
              type: "line",
              data: displacementData,
              smooth: true,
              lineStyle: { color: "#0c766e", width: 2 },
              areaStyle: { color: "rgba(12, 118, 110, 0.15)" },
              symbol: "none",
            },
          ]
        : []),
      ...(showRightAxis
        ? [
            {
              name: "Amplitude",
              type: "line",
              data: amplitudeData,
              smooth: true,
              yAxisIndex: 1,
              lineStyle: { color: "#c4632d", width: 2 },
              symbol: "none",
            },
          ]
        : []),
    ],
  };

  if (!pointSelection) {
    return null;
  }

  return (
    <div className="bottom-panel">
      <div className="timeseries-header">
        <div className="min-w-0">
          <div className="section-title !mb-1">Zeitreihe</div>
          <small className="block">
            Punkt {pointSelection.code}
            {pointSelection.track ? ` / Track ${pointSelection.track}` : ""}
          </small>
        </div>
        {tsQuery.data && hasMeasurements && (
          <div className="timeseries-toggles">
            <SeriesToggle
              label="Verschiebung"
              swatch="#0c766e"
              checked={showDisplacement && hasDisplacementData}
              disabled={!hasDisplacementData}
              onChange={setShowDisplacement}
            />
            <SeriesToggle
              label="Amplitude"
              swatch="#c4632d"
              checked={showAmplitude && hasAmplitudeData}
              disabled={!hasAmplitudeData}
              onChange={setShowAmplitude}
            />
          </div>
        )}
      </div>

      {tsQuery.isLoading && (
        <Badge variant="secondary" className="font-normal">
          Zeitreihe wird geladen...
        </Badge>
      )}
      {tsQuery.isError && (
        <EmptyState
          tone="warning"
          title="Zeitreihe konnte nicht geladen werden."
        />
      )}
      {tsQuery.data && !hasMeasurements && (
        <EmptyState title="Keine Zeitreihendaten für diesen Punkt." />
      )}
      {tsQuery.data && hasMeasurements && showAnySeries && (
        <div className="timeseries-chart">
          <ReactECharts
            key={`${showDisplacement}-${showAmplitude}`}
            option={option}
            style={{ height: "100%", width: "100%" }}
            notMerge
            replaceMerge={["series", "yAxis"]}
          />
        </div>
      )}
      {tsQuery.data && hasMeasurements && !showAnySeries && (
        <EmptyState title="Keine aktive Datenreihe für die Anzeige ausgewählt." />
      )}
    </div>
  );
}
