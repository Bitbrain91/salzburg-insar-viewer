export type BasemapId = "light" | "satellite";

const lightStyle =
  import.meta.env.VITE_BASEMAP_LIGHT_STYLE ||
  import.meta.env.VITE_BASEMAP_STYLE ||
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const satelliteTiles =
  import.meta.env.VITE_BASEMAP_SATELLITE_URL ||
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const satelliteAttribution =
  "Esri, Maxar, Earthstar Geographics, and the GIS User Community";

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
