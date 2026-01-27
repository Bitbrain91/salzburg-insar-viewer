import ReactECharts from "echarts-for-react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import { getPointTimeseries } from "../hooks/useApi";

export default function TimeseriesPanel() {
  const selection = useAppStore((state) => state.selection);

  const tsQuery = useQuery({
    queryKey: ["timeseries", selection],
    queryFn: () =>
      selection && selection.type === "point"
        ? getPointTimeseries(selection.code, selection.track)
        : Promise.resolve(null),
    enabled: selection?.type === "point",
  });

  const seriesData = tsQuery.data?.measurements?.map((m: any) => [m.date, m.displacement]) ?? [];

  const option = {
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { color: "#5b655f" },
      axisLine: { lineStyle: { color: "#d7d2c6" } },
    },
    yAxis: {
      type: "value",
      name: "Displacement (mm)",
      nameTextStyle: { color: "#5b655f" },
      axisLabel: { color: "#5b655f" },
      splitLine: { lineStyle: { color: "#ebe6de" } },
    },
    series: [
      {
        type: "line",
        data: seriesData,
        smooth: true,
        lineStyle: { color: "#0c7c74", width: 2 },
        areaStyle: { color: "rgba(12, 124, 116, 0.15)" },
        symbol: "none",
      },
    ],
  };

  return (
    <div className="bottom-panel">
      <div className="section-title">Displacement Time Series</div>
      {!selection && <div className="pill">Select a point to see timeseries</div>}
      {selection?.type === "point" && tsQuery.isLoading && (
        <div className="pill">Loading timeseries…</div>
      )}
      {selection?.type === "point" && tsQuery.data && (
        <ReactECharts option={option} style={{ height: 180 }} />
      )}
    </div>
  );
}
