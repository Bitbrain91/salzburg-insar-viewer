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
    bearing: 81.4,
    pitch: 38.8,
    label: "Satellitensicht Track 44",
    overlayTitle: "Satellitensicht T44",
    overlayText: "LOS-Look 81.4 deg E",
  },
  satellite_track95: {
    bearing: -78.5,
    pitch: 38.5,
    label: "Satellitensicht Track 95",
    overlayTitle: "Satellitensicht T95",
    overlayText: "LOS-Look 281.5 deg W",
  },
};

export function isSatelliteCameraMode(mode: CameraMode): mode is Exclude<CameraMode, "default"> {
  return mode !== "default";
}
