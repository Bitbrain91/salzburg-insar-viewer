type LonLat = {
  lon: number;
  lat: number;
};

const EARTH_BASE_URL = "https://earth.google.com/web/@";
const EARTH_RANGE_Y = 35;
const EARTH_HEADING = 20;
const EARTH_TILT = 10;
const EARTH_ROLL = 0;
const MIN_CAMERA_DISTANCE_M = 85;
const MAX_CAMERA_DISTANCE_M = 220;
const DEFAULT_DISTANCE_MULTIPLIER = 1.8;

export type GoogleEarthCameraOptions = {
  headingDeg?: number | null;
  tiltDeg?: number | null;
  minDistanceM?: number;
  maxDistanceM?: number;
  distanceMultiplier?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function formatDistance(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatAngle(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

function normalizeHeading(value: number) {
  return ((value % 360) + 360) % 360;
}

function collectCoordinatePairs(value: unknown, coordinates: LonLat[]) {
  if (!Array.isArray(value)) return;

  if (isFiniteNumber(value[0]) && isFiniteNumber(value[1])) {
    const lon = value[0];
    const lat = value[1];
    if (lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
      coordinates.push({ lon, lat });
    }
    return;
  }

  for (const child of value) {
    collectCoordinatePairs(child, coordinates);
  }
}

function collectGeometryCoordinates(geometry: Record<string, unknown>, coordinates: LonLat[]) {
  if (geometry.type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
    for (const child of geometry.geometries) {
      if (child && typeof child === "object" && !Array.isArray(child)) {
        collectGeometryCoordinates(child as Record<string, unknown>, coordinates);
      }
    }
    return;
  }

  collectCoordinatePairs(geometry.coordinates, coordinates);
}

function haversineMeters(a: LonLat, b: LonLat) {
  const earthRadiusM = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function resolveGeometryView(coordinates: LonLat[]) {
  if (!coordinates.length) return null;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const coordinate of coordinates) {
    minLon = Math.min(minLon, coordinate.lon);
    minLat = Math.min(minLat, coordinate.lat);
    maxLon = Math.max(maxLon, coordinate.lon);
    maxLat = Math.max(maxLat, coordinate.lat);
  }

  if (![minLon, minLat, maxLon, maxLat].every(Number.isFinite)) {
    return null;
  }

  const center = {
    lon: (minLon + maxLon) / 2,
    lat: (minLat + maxLat) / 2,
  };
  const diagonalM = haversineMeters(
    { lon: minLon, lat: minLat },
    { lon: maxLon, lat: maxLat }
  );

  return { center, diagonalM };
}

export function buildGoogleEarthUrlForGeometry(
  geometry: Record<string, unknown> | null | undefined,
  altitudeM?: number | null,
  camera: GoogleEarthCameraOptions = {}
) {
  if (!geometry) return null;

  const coordinates: LonLat[] = [];
  collectGeometryCoordinates(geometry, coordinates);
  const view = resolveGeometryView(coordinates);
  if (!view) return null;

  const minDistanceM = camera.minDistanceM ?? MIN_CAMERA_DISTANCE_M;
  const maxDistanceM = camera.maxDistanceM ?? MAX_CAMERA_DISTANCE_M;
  const distanceMultiplier = camera.distanceMultiplier ?? DEFAULT_DISTANCE_MULTIPLIER;
  const distanceM = clamp(
    Math.max(minDistanceM, view.diagonalM * distanceMultiplier),
    minDistanceM,
    maxDistanceM
  );
  const heading = isFiniteNumber(camera.headingDeg)
    ? normalizeHeading(camera.headingDeg)
    : EARTH_HEADING;
  const tilt = isFiniteNumber(camera.tiltDeg) ? clamp(camera.tiltDeg, 0, 85) : EARTH_TILT;
  const altitudeSegment = isFiniteNumber(altitudeM)
    ? `${formatDistance(altitudeM)}a,${formatDistance(distanceM)}d`
    : `${formatDistance(distanceM)}d`;

  return `${EARTH_BASE_URL}${formatCoordinate(view.center.lat)},${formatCoordinate(
    view.center.lon
  )},${altitudeSegment},${EARTH_RANGE_Y}y,${formatAngle(heading)}h,${formatAngle(tilt)}t,${EARTH_ROLL}r`;
}
