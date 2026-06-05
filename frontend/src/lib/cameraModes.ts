import type { TrackMetadata } from "./configMetadata";

export type CameraMode = "default" | `track:${string}:${number}`;

export type CameraPreset = {
  bearing: number;
  pitch: number;
  label: string;
  overlayTitle: string;
  overlayText: string;
};

export const DEFAULT_MAP_BEARING = -10;
export const DEFAULT_MAP_PITCH = 45;
export const TRACK_CAMERA_PITCH = 38.8;

export function cameraModeForTrack(datasetId: string, track: number): CameraMode {
  return `track:${datasetId}:${track}`;
}

export function parseTrackCameraMode(mode: CameraMode) {
  if (mode === "default") return null;
  const match = /^track:(.+):(\d+)$/.exec(mode);
  if (!match) return null;
  return { datasetId: match[1], track: Number(match[2]) };
}

export function isTrackCameraMode(mode: CameraMode) {
  return parseTrackCameraMode(mode) !== null;
}

function normalizeMapBearing(bearing: number) {
  return ((((bearing + 180) % 360) + 360) % 360) - 180;
}

export function cameraPresetForTrack(track: TrackMetadata): CameraPreset | null {
  if (track.lookBearingDeg === undefined) return null;
  const bearing = normalizeMapBearing(track.lookBearingDeg);
  const losLabel = track.los ? ` ${track.los}` : "";
  return {
    bearing,
    pitch: TRACK_CAMERA_PITCH,
    label: `${track.sensor} Track ${track.track}${losLabel}`,
    overlayTitle: `${track.sensor} T${track.track}`,
    overlayText: `LOS-Blick ${track.lookBearingDeg.toFixed(1)} deg`,
  };
}

export function cameraPresetForMode(
  mode: CameraMode,
  tracks: TrackMetadata[]
): CameraPreset | null {
  const parsed = parseTrackCameraMode(mode);
  if (!parsed) return null;
  const track = tracks.find(
    (candidate) =>
      candidate.datasetId === parsed.datasetId && candidate.track === parsed.track
  );
  return track ? cameraPresetForTrack(track) : null;
}
