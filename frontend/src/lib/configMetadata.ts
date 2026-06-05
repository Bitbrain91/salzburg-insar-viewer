export type AppConfigResponse = {
  velocity_thresholds?: Record<string, number>;
  areas?: unknown;
  datasets?: unknown;
  tracks?: unknown;
};

export type AreaMetadata = {
  id: string;
  label: string;
  bounds?: [number, number, number, number];
};

export type DatasetMetadata = {
  id: string;
  areaId: string;
  label: string;
  sensor: string;
  tracks: TrackMetadata[];
};

export type TrackMetadata = {
  areaId: string;
  datasetId: string;
  sensor: string;
  track: number;
  label: string;
  los?: string;
  lookBearingDeg?: number;
  geometryStatus?: string;
  directionDependentMl?: boolean;
};

export type NormalizedAppConfig = {
  areas: AreaMetadata[];
  datasets: DatasetMetadata[];
  tracks: TrackMetadata[];
};

export const DEFAULT_AREA_ID = "salzburg";

export function getTrackVisibilityKey(datasetId: string, track: number) {
  return `${datasetId}:${track}`;
}

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readValue(record: RawRecord | null, ...keys: string[]) {
  if (!record) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function readString(record: RawRecord | null, ...keys: string[]) {
  const value = readValue(record, ...keys);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function readNumber(record: RawRecord | null, ...keys: string[]) {
  const value = readValue(record, ...keys);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readBounds(record: RawRecord | null, ...keys: string[]) {
  const value = readValue(record, ...keys);
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const bounds = value.map((item) =>
    typeof item === "number" ? item : typeof item === "string" ? Number(item) : NaN
  );
  if (bounds.some((item) => !Number.isFinite(item))) return undefined;
  const [minLon, minLat, maxLon, maxLat] = bounds;
  if (minLon >= maxLon || minLat >= maxLat) return undefined;
  return bounds as [number, number, number, number];
}

function readBoolean(record: RawRecord | null, ...keys: string[]) {
  const value = readValue(record, ...keys);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

function labelFromId(id: string) {
  return id
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeArea(raw: unknown): AreaMetadata | null {
  const record = asRecord(raw);
  const id = readString(record, "area_id", "areaId", "id");
  if (!id) return null;
  return {
    id,
    label: readString(record, "label", "display_name", "displayName", "name") ?? labelFromId(id),
    bounds: readBounds(record, "bounds", "bbox"),
  };
}

function normalizeTrack(
  raw: unknown,
  dataset?: Omit<DatasetMetadata, "tracks">
): TrackMetadata | null {
  const record =
    typeof raw === "number" || typeof raw === "string" ? { track: raw } : asRecord(raw);
  const track = readNumber(record, "track", "track_id", "trackId", "id");
  if (track === undefined) return null;
  const areaId = readString(record, "area_id", "areaId") ?? dataset?.areaId;
  const datasetId = readString(record, "dataset_id", "datasetId") ?? dataset?.id;
  const sensor = readString(record, "sensor", "platform") ?? dataset?.sensor;
  if (!areaId || !datasetId || !sensor) return null;
  const los = readString(record, "los", "direction");
  const lookBearingDeg = readNumber(record, "look_bearing_deg", "lookBearingDeg");
  const geometryStatus = readString(record, "geometry_status", "geometryStatus");
  const directionDependentMl = readBoolean(
    record,
    "direction_dependent_ml",
    "directionDependentMl"
  );
  return {
    areaId,
    datasetId,
    sensor,
    track,
    label:
      readString(record, "label", "display_name", "displayName", "name") ??
      `Track ${track}`,
    los,
    lookBearingDeg,
    geometryStatus,
    directionDependentMl,
  };
}

function normalizeDataset(raw: unknown): DatasetMetadata | null {
  const record = asRecord(raw);
  if (!record) return null;
  const areaId = readString(record, "area_id", "areaId");
  const sensor = readString(record, "sensor", "platform");
  const id = readString(record, "dataset_id", "datasetId", "id");
  if (!areaId || !sensor || !id) return null;
  const dataset = {
    id,
    areaId,
    sensor,
    label:
      readString(record, "label", "display_name", "displayName", "name") ??
      `${sensor} ${labelFromId(areaId)}`,
  };
  return {
    ...dataset,
    tracks: asArray(readValue(record, "tracks"))
      .map((track) => normalizeTrack(track, dataset))
      .filter((track): track is TrackMetadata => Boolean(track)),
  };
}

function emptyConfig(): NormalizedAppConfig {
  return {
    areas: [],
    datasets: [],
    tracks: [],
  };
}

export function normalizeAppConfig(rawConfig: AppConfigResponse | null | undefined): NormalizedAppConfig {
  const raw = asRecord(rawConfig);
  if (!raw) return emptyConfig();

  const areas = asArray(readValue(raw, "areas"))
    .map(normalizeArea)
    .filter((area): area is AreaMetadata => Boolean(area));

  const datasets = asArray(readValue(raw, "datasets"))
    .map(normalizeDataset)
    .filter((dataset): dataset is DatasetMetadata => Boolean(dataset));

  const topLevelTracks = asArray(readValue(raw, "tracks"))
    .map((track) => normalizeTrack(track))
    .filter((track): track is TrackMetadata => Boolean(track));

  if (datasets.length === 0 && topLevelTracks.length === 0) {
    return emptyConfig();
  }

  const datasetsById = new Map<string, DatasetMetadata>();
  for (const dataset of datasets) {
    datasetsById.set(dataset.id, dataset);
  }
  for (const track of topLevelTracks) {
    const dataset = datasetsById.get(track.datasetId);
    if (!dataset) continue;
    const existingIndex = dataset.tracks.findIndex(
      (candidate) =>
        candidate.datasetId === track.datasetId && candidate.track === track.track
    );
    if (existingIndex >= 0) {
      dataset.tracks[existingIndex] = {
        ...dataset.tracks[existingIndex],
        ...track,
      };
    } else {
      dataset.tracks.push(track);
    }
    datasetsById.set(dataset.id, dataset);
  }

  const areaById = new Map<string, AreaMetadata>();
  for (const area of areas) areaById.set(area.id, area);

  const normalizedDatasets = [...datasetsById.values()];
  return {
    areas: [...areaById.values()],
    datasets: normalizedDatasets,
    tracks: normalizedDatasets.flatMap((dataset) => dataset.tracks),
  };
}

export function findTrackMetadata(
  config: NormalizedAppConfig,
  identity: { areaId?: string; datasetId?: string; track?: number | null }
) {
  if (identity.track === undefined || identity.track === null) return null;
  return (
    config.tracks.find(
      (track) =>
        track.track === identity.track &&
        (!identity.datasetId || track.datasetId === identity.datasetId) &&
        (!identity.areaId || track.areaId === identity.areaId)
    ) ?? null
  );
}
