export type CameraMode = "default" | "satellite_track44" | "satellite_track95";

export const DEFAULT_MAP_BEARING = -10;
export const DEFAULT_MAP_PITCH = 45;

export const satelliteCameraPresets: Record<
  Exclude<CameraMode, "default">,
  {
    bearing: number;
    pitch: number;
    label: string;
    overlayTitle: string;
    overlayText: string;
  }
> = {
  satellite_track44: {
    bearing: 90,
    pitch: 38.8,
    label: "Satellitensicht Track 44",
    overlayTitle: "Satellitensicht T44",
    overlayText: "Blick nach Osten",
  },
  satellite_track95: {
    bearing: -90,
    pitch: 38.5,
    label: "Satellitensicht Track 95",
    overlayTitle: "Satellitensicht T95",
    overlayText: "Blick nach Westen",
  },
};

export function isSatelliteCameraMode(mode: CameraMode): mode is Exclude<CameraMode, "default"> {
  return mode !== "default";
}
