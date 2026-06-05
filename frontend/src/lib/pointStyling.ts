export type PointColorMode = "velocity" | "height";

type MapExpression = any[];

export const HEIGHT_BASELINE_M = 450;
export const HEIGHT_NEUTRAL_COLOR = "#9aa0a6";
export const TRACK_OUTLINE_PALETTE = [
  "#0c7c74",
  "#ad3f86",
  "#5662a8",
  "#d87034",
  "#345995",
  "#7f4f24",
  "#b56576",
  "#1b9e77",
];
export const TRACK_OUTLINE_SEPARATOR_COLOR = "rgba(251, 250, 247, 0.96)";
export const HEIGHT_PALETTE = [
  "#1d3557",
  "#355f8d",
  "#3a86ff",
  "#4cc9f0",
  "#80ed99",
  "#ffd166",
  "#f4a261",
  "#e76f51",
  "#b56576",
];

const DEFAULT_HEIGHT_SENSITIVITY_M = 10;
const MIN_HEIGHT_SENSITIVITY_M = 1;
const MAX_HEIGHT_SENSITIVITY_M = 100;

export const velocityExpression: MapExpression = [
  "step",
  ["get", "velocity"],
  "#8e0f2f",
  -5,
  "#c6372a",
  -2,
  "#e67f1c",
  -1,
  "#f2c14e",
  1,
  "#2c9f7a",
  2,
  "#4aa5d5",
  5,
  "#345995",
  10,
  "#1c2f4a",
];

export const basePointRadiusExpression: MapExpression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  1.5,
  12,
  2.5,
  14,
  4,
  16,
  6,
];

export const basePointInnerStrokeWidthExpression: MapExpression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  0.55,
  12,
  0.75,
  14,
  0.95,
  16,
  1.2,
];

export const trackOutlineRingRadiusExpression: MapExpression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  2.8,
  12,
  4.1,
  14,
  6.2,
  16,
  9,
];

export const trackOutlineRingStrokeWidthExpression: MapExpression = [
  "interpolate",
  ["linear"],
  ["zoom"],
  8,
  1.3,
  12,
  1.6,
  14,
  2,
  16,
  2.6,
];

function roundHeightSensitivity(value: number): number {
  if (value < 10) {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value);
}

export function clampHeightSensitivity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_HEIGHT_SENSITIVITY_M;
  }
  const clamped = Math.min(MAX_HEIGHT_SENSITIVITY_M, Math.max(MIN_HEIGHT_SENSITIVITY_M, value));
  return roundHeightSensitivity(clamped);
}

export function heightSensitivityToSlider(value: number): number {
  return Math.log10(clampHeightSensitivity(value));
}

export function sliderToHeightSensitivity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_HEIGHT_SENSITIVITY_M;
  }
  const clamped = Math.min(2, Math.max(0, value));
  return clampHeightSensitivity(Math.pow(10, clamped));
}

export function formatHeightSensitivity(value: number): string {
  const sensitivity = clampHeightSensitivity(value);
  return sensitivity >= 10 ? sensitivity.toFixed(0) : sensitivity.toFixed(1);
}

export function formatHeightLegendValue(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

export function getTrackOutlineColor(index: number) {
  return TRACK_OUTLINE_PALETTE[index % TRACK_OUTLINE_PALETTE.length];
}

export function getHeightLegendAnchors(value: number): number[] {
  const sensitivity = clampHeightSensitivity(value);
  return Array.from({ length: HEIGHT_PALETTE.length }, (_, index) =>
    HEIGHT_BASELINE_M + index * sensitivity
  );
}

export function getHeightCycleLength(value: number): number {
  return clampHeightSensitivity(value) * HEIGHT_PALETTE.length;
}

export function getBasePointColorExpression(
  mode: PointColorMode,
  value: number
): MapExpression {
  if (mode === "velocity") {
    return velocityExpression;
  }

  const sensitivity = clampHeightSensitivity(value);
  const cycleLength = sensitivity * HEIGHT_PALETTE.length;
  const repeatedHeightExpression: MapExpression = [
    "step",
    [
      "%",
      [
        "max",
        0,
        ["-", ["coalesce", ["get", "height"], HEIGHT_BASELINE_M], HEIGHT_BASELINE_M],
      ],
      cycleLength,
    ],
    HEIGHT_PALETTE[0],
    sensitivity,
    HEIGHT_PALETTE[1],
    sensitivity * 2,
    HEIGHT_PALETTE[2],
    sensitivity * 3,
    HEIGHT_PALETTE[3],
    sensitivity * 4,
    HEIGHT_PALETTE[4],
    sensitivity * 5,
    HEIGHT_PALETTE[5],
    sensitivity * 6,
    HEIGHT_PALETTE[6],
    sensitivity * 7,
    HEIGHT_PALETTE[7],
    sensitivity * 8,
    HEIGHT_PALETTE[8],
  ];

  return [
    "case",
    ["==", ["get", "height"], null],
    HEIGHT_NEUTRAL_COLOR,
    repeatedHeightExpression,
  ];
}
