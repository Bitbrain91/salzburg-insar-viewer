import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import { getPointTimeseries } from "../hooks/useApi";

export default function TimeseriesPanel() {
  const selection = useAppStore((state) => state.selection);
  const [showDisplacement, setShowDisplacement] = useState(true);
  const [showAmplitude, setShowAmplitude] = useState(true);

  const tsQuery = useQuery({
    queryKey: ["timeseries", selection],
    queryFn: () =>
      selection && selection.type === "point"
        ? getPointTimeseries(selection.code, selection.track)
        : Promise.resolve(null),
    enabled: selection?.type === "point",
  });

  const measurements = tsQuery.data?.measurements ?? [];
  const displacementData = measurements.map((m: any) => [m.date, m.displacement ?? null]);
  const amplitudeData = measurements.map((m: any) => [m.date, m.amplitude ?? null]);

  const showLeftAxis = showDisplacement;
  const showRightAxis = showAmplitude;
  const showAnySeries = showDisplacement || showAmplitude;

  const option = {
    grid: { left: showLeftAxis ? 40 : 20, right: showRightAxis ? 50 : 20, top: 30, bottom: 40 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { color: "#5b655f" },
      axisLine: { lineStyle: { color: "#d7d2c6" } },
    },
    yAxis: [
      {
        type: "value",
        name: "Displacement (mm)",
        nameTextStyle: { color: "#5b655f" },
        axisLabel: { color: "#5b655f" },
        splitLine: { lineStyle: { color: "#ebe6de" } },
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
      ...(showDisplacement
        ? [
            {
              name: "Displacement",
              type: "line",
              data: displacementData,
              smooth: true,
              lineStyle: { color: "#0c7c74", width: 2 },
              areaStyle: { color: "rgba(12, 124, 116, 0.15)" },
              symbol: "none",
            },
          ]
        : []),
      ...(showAmplitude
        ? [
            {
              name: "Amplitude",
              type: "line",
              data: amplitudeData,
              smooth: true,
              yAxisIndex: 1,
              lineStyle: { color: "#c26b2c", width: 2 },
              symbol: "none",
            },
          ]
        : []),
    ],
  };

  return (
    <div className="bottom-panel">
      <div className="section-title">Time Series</div>
      {!selection && <div className="pill">Select a point to see timeseries</div>}
      {selection?.type === "point" && tsQuery.isLoading && (
        <div className="pill">Loading timeseries…</div>
      )}
      {selection?.type === "point" && tsQuery.data && (
        <div className="timeseries-controls">
          <div className="timeseries-toggles">
            <label className="toggle-inline">
              <span>Displacement</span>
              <input
                type="checkbox"
                className="toggle"
                checked={showDisplacement}
                onChange={(event) => setShowDisplacement(event.target.checked)}
              />
            </label>
            <label className="toggle-inline">
              <span>Amplitude</span>
              <input
                type="checkbox"
                className="toggle"
                checked={showAmplitude}
                onChange={(event) => setShowAmplitude(event.target.checked)}
              />
            </label>
          </div>
        </div>
      )}
      {selection?.type === "point" && tsQuery.data && showAnySeries && (
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
      {selection?.type === "point" && tsQuery.data && !showAnySeries && (
        <div className="pill">Enable displacement or amplitude to display the chart.</div>
      )}
    </div>
  );
}
