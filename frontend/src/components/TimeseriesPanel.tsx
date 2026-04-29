import { useState } from "react";
import ReactECharts from "echarts-for-react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../lib/store";
import { getPointTimeseries } from "../hooks/useApi";

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

export default function TimeseriesPanel() {
  const selection = useAppStore((state) => state.selection);
  const pointSelection = selection?.type === "point" ? selection : null;
  const [showDisplacement, setShowDisplacement] = useState(true);
  const [showAmplitude, setShowAmplitude] = useState(true);

  const tsQuery = useQuery({
    queryKey: ["timeseries", pointSelection?.code, pointSelection?.track],
    queryFn: () =>
      pointSelection
        ? (getPointTimeseries(pointSelection.code, pointSelection.track) as Promise<TimeseriesResponse>)
        : Promise.resolve(null),
    enabled: Boolean(pointSelection),
  });

  const measurements = tsQuery.data?.measurements ?? [];
  const displacementData: Array<[string, number | null]> = measurements.map((measurement) => [
    measurement.date,
    measurement.displacement ?? null,
  ]);
  const amplitudeData: Array<[string, number | null]> = measurements.map((measurement) => [
    measurement.date,
    measurement.amplitude ?? null,
  ]);
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
      top: 34,
      bottom: 40,
      containLabel: true,
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "time",
      axisLabel: { color: "#5b655f" },
      axisLine: { lineStyle: { color: "#d7d2c6" } },
    },
    yAxis: [
      {
        type: "value",
        name: "Verschiebung (mm)",
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
      ...(showLeftAxis
        ? [
            {
              name: "Verschiebung",
              type: "line",
              data: displacementData,
              smooth: true,
              lineStyle: { color: "#0c7c74", width: 2 },
              areaStyle: { color: "rgba(12, 124, 116, 0.15)" },
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
              lineStyle: { color: "#c26b2c", width: 2 },
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
        <div>
          <div className="section-title">Zeitreihe</div>
          <small>
            Punkt {pointSelection.code}
            {pointSelection.track ? ` / Track ${pointSelection.track}` : ""}
          </small>
        </div>
      </div>

      {tsQuery.isLoading && (
        <div className="pill">Zeitreihe wird geladen...</div>
      )}
      {tsQuery.isError && (
        <div className="pill warning">Zeitreihe konnte nicht geladen werden.</div>
      )}
      {tsQuery.data && !hasMeasurements && (
        <div className="pill">Keine Zeitreihendaten fuer diesen Punkt.</div>
      )}
      {tsQuery.data && hasMeasurements && (
        <div className="timeseries-controls">
          <div className="timeseries-toggles">
            <label className={`toggle-inline ${hasDisplacementData ? "" : "is-disabled"}`}>
              <span>Verschiebung</span>
              <input
                type="checkbox"
                className="toggle"
                checked={showDisplacement && hasDisplacementData}
                disabled={!hasDisplacementData}
                onChange={(event) => setShowDisplacement(event.target.checked)}
              />
            </label>
            <label className={`toggle-inline ${hasAmplitudeData ? "" : "is-disabled"}`}>
              <span>Amplitude</span>
              <input
                type="checkbox"
                className="toggle"
                checked={showAmplitude && hasAmplitudeData}
                disabled={!hasAmplitudeData}
                onChange={(event) => setShowAmplitude(event.target.checked)}
              />
            </label>
          </div>
        </div>
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
        <div className="pill">Keine aktive Datenreihe fuer die Anzeige ausgewaehlt.</div>
      )}
    </div>
  );
}
