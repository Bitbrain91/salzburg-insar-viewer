export type BasemapId = "light" | "satellite";

const lightStyle =
  import.meta.env.VITE_BASEMAP_LIGHT_STYLE ||
  import.meta.env.VITE_BASEMAP_STYLE ||
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const defaultSatelliteMaxZoom = 19;
const satelliteMaxZoomValue = Number(import.meta.env.VITE_BASEMAP_SATELLITE_MAXZOOM);
const satelliteMaxZoom =
  Number.isFinite(satelliteMaxZoomValue) && satelliteMaxZoomValue > 0
    ? Math.floor(satelliteMaxZoomValue)
    : defaultSatelliteMaxZoom;

const satelliteTiles =
  import.meta.env.VITE_BASEMAP_SATELLITE_URL ||
  "https://maps.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg";

const satelliteAttribution = "basemap.at";

export const basemaps = {
  light: {
    id: "light" as BasemapId,
    label: "Light",
    style: lightStyle,
  },
  satellite: {
    id: "satellite" as BasemapId,
    label: "Satellite",
    style: {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [satelliteTiles],
          tileSize: 256,
          maxzoom: satelliteMaxZoom,
          attribution: satelliteAttribution,
        },
      },
      layers: [
        {
          id: "satellite",
          type: "raster",
          source: "satellite",
        },
      ],
    },
  },
} as const;
