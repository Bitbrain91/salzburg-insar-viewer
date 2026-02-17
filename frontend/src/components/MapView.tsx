import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { basemaps } from "../lib/basemaps";
import type { BasemapId } from "../lib/basemaps";
import { useAppStore } from "../lib/store";

const tilesBase =
  import.meta.env.VITE_TILES_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "");
const apiBase =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? "http://127.0.0.1:8000" : "");

const velocityExpression: any[] = [
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

function hslToHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) {
    r = c;
    g = x;
  } else if (hp >= 1 && hp < 2) {
    r = x;
    g = c;
  } else if (hp >= 2 && hp < 3) {
    g = c;
    b = x;
  } else if (hp >= 3 && hp < 4) {
    g = x;
    b = c;
  } else if (hp >= 4 && hp < 5) {
    r = x;
    b = c;
  } else if (hp >= 5 && hp < 6) {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const mlPaletteSize = 60;
const mlPalette = Array.from({ length: mlPaletteSize }, (_, i) => {
  const hue = (i * 360) / mlPaletteSize;
  return hslToHex(hue, 0.7, 0.5);
});

const mlClusterColorExpression: any[] = [
  "match",
  ["get", "cluster_color_index"],
  ...mlPalette.flatMap((color, idx) => [idx, color]),
  "#9aa0a6",
];

const mlBuildingColorExpression: any[] = [
  "match",
  ["get", "building_color_index"],
  ...mlPalette.flatMap((color, idx) => [idx, color]),
  "#9aa0a6",
];

const mlBuildingHeightExpression: any[] = [
  "max",
  ["coalesce", ["get", "height_m"], 12],
  4,
];

const assignmentExpression: any[] = [
  "match",
  ["get", "method"],
  "buffer",
  "#1b9e77",
  "nearest",
  "#d95f02",
  "unassigned",
  "#999999",
  "dbscan",
  "#7570b3",
  "#9aa0a6",
];

const distanceExpression: any[] = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "distance_m"], 0],
  0,
  "#1b9e77",
  10,
  "#66a61e",
  20,
  "#e6ab02",
  30,
  "#d95f02",
  50,
  "#a6761d",
];

const coherenceExpression: any[] = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "coherence"], 0],
  0.2,
  "#c6372a",
  0.6,
  "#f2c14e",
  1.0,
  "#1b9e77",
];

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const basemapRef = useRef<BasemapId | null>(null);
  const [tooltip, setTooltip] = useState<
    { x: number; y: number; html: string } | null
  >(null);
  const [styleVersion, setStyleVersion] = useState(0);

  const layers = useAppStore((state) => state.layers);
  const filters = useAppStore((state) => state.filters);
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const selection = useAppStore((state) => state.selection);
  const basemapId = useAppStore((state) => state.basemapId);
  const setSelection = useAppStore((state) => state.setSelection);
  const activeRunId = useAppStore((state) => state.activeRunId);
  const showMlLayer = useAppStore((state) => state.showMlLayer);
  const showMlBuildings = useAppStore((state) => state.showMlBuildings);
  const mlView = useAppStore((state) => state.mlView);
  const mlTileVersion = useAppStore((state) => state.mlTileVersion);
  const setMapBBox = useAppStore((state) => state.setMapBBox);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: basemaps[basemapId].style,
      center: [13.05, 47.8],
      zoom: 12,
      pitch: 45,
      bearing: -10,
      hash: true,
    });

    basemapRef.current = basemapId;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }));

    const updateBBox = () => {
      const bounds = map.getBounds();
      setMapBBox([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    };

    map.on("style.load", () => {
      addCoreSourcesAndLayers(map);
      const state = useAppStore.getState();
      applyLayerVisibility(map, state.layers);
      applyFilters(map, state.filters, state.filtersEnabled);
      applySelection(map, state.selection);
      updateBBox();
      setStyleVersion((value) => value + 1);
    });

    map.on("mousemove", (event) => handleHover(event, map));
    map.on("click", (event) => handleClick(event, map));
    map.on("moveend", updateBBox);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      basemapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (basemapRef.current === basemapId) return;
    basemapRef.current = basemapId;
    mapRef.current.setStyle(basemaps[basemapId].style);
  }, [basemapId]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyLayerVisibility(mapRef.current, layers);
  }, [layers]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyFilters(mapRef.current, filters, filtersEnabled);
  }, [filters, filtersEnabled]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    removeMlLayersAndSources(map);
    if (!activeRunId) return;

    const colorExpression = getMlColorExpression(mlView);

    map.addSource("ml_points", {
      type: "vector",
      tiles: [
        `${apiBase}/api/ml/runs/${activeRunId}/tiles/{z}/{x}/{y}.pbf?v=${mlTileVersion}`,
      ],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });

    map.addSource("ml_buildings", {
      type: "vector",
      tiles: [
        `${apiBase}/api/ml/runs/${activeRunId}/buildings/{z}/{x}/{y}.pbf?v=${mlTileVersion}`,
      ],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });

    map.addLayer({
      id: "ml_buildings_flat",
      type: "fill",
      source: "ml_buildings",
      "source-layer": "ml_buildings",
      paint: {
        "fill-color": mlBuildingColorExpression,
        "fill-opacity": 0.35,
      },
      layout: {
        visibility: showMlBuildings ? "visible" : "none",
      },
    });

    map.addLayer({
      id: "ml_buildings_fill",
      type: "fill-extrusion",
      source: "ml_buildings",
      "source-layer": "ml_buildings",
      paint: {
        "fill-extrusion-color": mlBuildingColorExpression,
        "fill-extrusion-height": mlBuildingHeightExpression,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.6,
      },
      layout: {
        visibility: showMlBuildings ? "visible" : "none",
      },
    });

    map.addLayer({
      id: "ml_buildings_outline",
      type: "line",
      source: "ml_buildings",
      "source-layer": "ml_buildings",
      paint: {
        "line-color": mlBuildingColorExpression,
        "line-opacity": 0.95,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          1.6,
          14,
          2.6,
          18,
          3.4,
        ],
      },
      layout: {
        visibility: showMlBuildings ? "visible" : "none",
      },
    });

    map.addLayer({
      id: "ml_points",
      type: "circle",
      source: "ml_points",
      "source-layer": "ml_points",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          8,
          2,
          12,
          3,
          14,
          5,
          16,
          7,
          20,
          9,
          22,
          10,
        ],
        "circle-color": colorExpression,
        "circle-opacity": 0.85,
        "circle-stroke-width": 0.5,
        "circle-stroke-color": "#ffffff",
      },
      layout: {
        visibility: showMlLayer ? "visible" : "none",
      },
    });
  }, [activeRunId, mlTileVersion, styleVersion]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current.getLayer("ml_points")) {
      mapRef.current.setLayoutProperty(
        "ml_points",
        "visibility",
        showMlLayer ? "visible" : "none"
      );
    }
    if (mapRef.current.getLayer("ml_buildings_fill")) {
      mapRef.current.setLayoutProperty(
        "ml_buildings_fill",
        "visibility",
        showMlBuildings ? "visible" : "none"
      );
    }
    if (mapRef.current.getLayer("ml_buildings_flat")) {
      mapRef.current.setLayoutProperty(
        "ml_buildings_flat",
        "visibility",
        showMlBuildings ? "visible" : "none"
      );
    }
    if (mapRef.current.getLayer("ml_buildings_outline")) {
      mapRef.current.setLayoutProperty(
        "ml_buildings_outline",
        "visibility",
        showMlBuildings ? "visible" : "none"
      );
    }
  }, [showMlLayer, showMlBuildings]);

  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getLayer("ml_points")) return;
    const map = mapRef.current;
    const colorExpression = getMlColorExpression(mlView);
    map.setPaintProperty("ml_points", "circle-color", colorExpression as any);
  }, [mlView, activeRunId]);

  useEffect(() => {
    if (!mapRef.current) return;
    applySelection(mapRef.current, selection);
  }, [selection]);

  function getMlColorExpression(view: typeof mlView) {
    if (view === "building") return mlBuildingColorExpression;
    if (view === "assignment") return assignmentExpression;
    if (view === "distance") return distanceExpression;
    if (view === "velocity") return velocityExpression;
    if (view === "coherence") return coherenceExpression;
    return mlClusterColorExpression;
  }

  function addSourceIfMissing(map: MapLibreMap, id: string, source: any) {
    if (!map.getSource(id)) {
      map.addSource(id, source);
    }
  }

  function addLayerIfMissing(map: MapLibreMap, layer: any) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }

  function addCoreSourcesAndLayers(map: MapLibreMap) {
    addSourceIfMissing(map, "insar_t44", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/insar_t44/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });
    addSourceIfMissing(map, "insar_t95", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/insar_t95/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 16,
    });
    addSourceIfMissing(map, "gba", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/gba/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 15,
    });
    addSourceIfMissing(map, "osm", {
      type: "vector",
      tiles: [`${tilesBase}/mbtiles/osm/{z}/{x}/{y}.pbf`],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 15,
    });

    addLayerIfMissing(map, {
      id: "insar_t44",
      type: "circle",
      source: "insar_t44",
      "source-layer": "insar_t44",
      paint: {
        "circle-radius": [
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
        ],
        "circle-color": velocityExpression,
        "circle-opacity": 0.8,
      },
    });

    addLayerIfMissing(map, {
      id: "insar_t95",
      type: "circle",
      source: "insar_t95",
      "source-layer": "insar_t95",
      paint: {
        "circle-radius": [
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
        ],
        "circle-color": velocityExpression,
        "circle-opacity": 0.8,
      },
    });

    addLayerIfMissing(map, {
      id: "gba",
      type: "fill-extrusion",
      source: "gba",
      "source-layer": "gba",
      paint: {
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-color": "#4aa5d5",
        "fill-extrusion-opacity": 0.6,
      },
    });

    addLayerIfMissing(map, {
      id: "osm",
      type: "fill",
      source: "osm",
      "source-layer": "osm",
      paint: {
        "fill-color": "#c9c6bf",
        "fill-opacity": 0.5,
      },
    });

    addLayerIfMissing(map, {
      id: "insar_selected_t44",
      type: "circle",
      source: "insar_t44",
      "source-layer": "insar_t44",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#e27d3f",
      },
      filter: ["==", ["get", "code"], ""],
    });

    addLayerIfMissing(map, {
      id: "insar_selected_t95",
      type: "circle",
      source: "insar_t95",
      "source-layer": "insar_t95",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#e27d3f",
      },
      filter: ["==", ["get", "code"], ""],
    });

    addLayerIfMissing(map, {
      id: "gba_highlight",
      type: "line",
      source: "gba",
      "source-layer": "gba",
      paint: {
        "line-color": "#e27d3f",
        "line-width": 2,
      },
      filter: ["==", ["get", "gba_id"], ""],
    });

    addLayerIfMissing(map, {
      id: "osm_highlight",
      type: "line",
      source: "osm",
      "source-layer": "osm",
      paint: {
        "line-color": "#e27d3f",
        "line-width": 2,
      },
      filter: ["==", ["get", "osm_id"], ""],
    });
  }

  function removeMlLayersAndSources(map: MapLibreMap) {
    if (map.getLayer("ml_points")) map.removeLayer("ml_points");
    if (map.getLayer("ml_buildings_outline")) map.removeLayer("ml_buildings_outline");
    if (map.getLayer("ml_buildings_fill")) map.removeLayer("ml_buildings_fill");
    if (map.getLayer("ml_buildings_flat")) map.removeLayer("ml_buildings_flat");
    if (map.getSource("ml_points")) map.removeSource("ml_points");
    if (map.getSource("ml_buildings")) map.removeSource("ml_buildings");
  }

  function applySelection(map: MapLibreMap, currentSelection: typeof selection) {
    if (!currentSelection) {
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter("insar_selected_t44", ["==", ["get", "code"], ""]);
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter("insar_selected_t95", ["==", ["get", "code"], ""]);
      }
      if (map.getLayer("gba_highlight")) {
        map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
      }
      if (map.getLayer("osm_highlight")) {
        map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
      }
      return;
    }

    if (currentSelection.type === "point") {
      const show44 =
        currentSelection.track === 44 || currentSelection.track === undefined;
      const show95 =
        currentSelection.track === 95 || currentSelection.track === undefined;
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter(
          "insar_selected_t44",
          show44
            ? ["==", ["get", "code"], currentSelection.code]
            : ["==", ["get", "code"], ""]
        );
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter(
          "insar_selected_t95",
          show95
            ? ["==", ["get", "code"], currentSelection.code]
            : ["==", ["get", "code"], ""]
        );
      }
      if (map.getLayer("gba_highlight")) {
        map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
      }
      if (map.getLayer("osm_highlight")) {
        map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
      }
    } else {
      if (currentSelection.source === "gba") {
        if (map.getLayer("gba_highlight")) {
          map.setFilter("gba_highlight", [
            "==",
            ["get", "gba_id"],
            currentSelection.id,
          ]);
        }
        if (map.getLayer("osm_highlight")) {
          map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
        }
      } else {
        if (map.getLayer("osm_highlight")) {
          map.setFilter("osm_highlight", [
            "==",
            ["get", "osm_id"],
            currentSelection.id,
          ]);
        }
        if (map.getLayer("gba_highlight")) {
          map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
        }
      }
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter("insar_selected_t44", ["==", ["get", "code"], ""]);
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter("insar_selected_t95", ["==", ["get", "code"], ""]);
      }
    }
  }

  function applyLayerVisibility(map: MapLibreMap, vis: typeof layers) {
    if (map.getLayer("insar_t44")) {
      map.setLayoutProperty("insar_t44", "visibility", vis.insar44 ? "visible" : "none");
    }
    if (map.getLayer("insar_t95")) {
      map.setLayoutProperty("insar_t95", "visibility", vis.insar95 ? "visible" : "none");
    }
    if (map.getLayer("gba")) {
      map.setLayoutProperty("gba", "visibility", vis.gba ? "visible" : "none");
    }
    if (map.getLayer("osm")) {
      map.setLayoutProperty("osm", "visibility", vis.osm ? "visible" : "none");
    }
  }

  function applyFilters(
    map: MapLibreMap,
    filterState: typeof filters,
    enabled: boolean
  ) {
    if (!enabled) {
      if (map.getLayer("insar_t44")) {
        map.setFilter("insar_t44", null);
      }
      if (map.getLayer("insar_t95")) {
        map.setFilter("insar_t95", null);
      }
      return;
    }
    const filterExpr = [
      "all",
      [">=", ["get", "velocity"], filterState.velocityMin],
      ["<=", ["get", "velocity"], filterState.velocityMax],
      [">=", ["get", "coherence"], filterState.coherenceMin],
    ] as any;
    if (map.getLayer("insar_t44")) {
      map.setFilter("insar_t44", filterExpr);
    }
    if (map.getLayer("insar_t95")) {
      map.setFilter("insar_t95", filterExpr);
    }
  }

  function handleHover(event: MapMouseEvent, map: MapLibreMap) {
    const queryLayers = ["insar_t44", "insar_t95", "gba", "osm"];
    if (map.getLayer("ml_points")) {
      queryLayers.push("ml_points");
    }
    if (map.getLayer("ml_buildings_outline")) {
      queryLayers.push("ml_buildings_outline");
    }
    const features = map.queryRenderedFeatures(event.point, {
      layers: queryLayers,
    });
    if (!features.length) {
      map.getCanvas().style.cursor = "";
      setTooltip(null);
      return;
    }
    map.getCanvas().style.cursor = "pointer";
    const feature = features[0];
    if (!feature || !feature.properties) {
      setTooltip(null);
      return;
    }

    const props = feature.properties as any;
    let html = "";

    if (feature.layer.id === "ml_buildings_outline") {
      html = `
        <strong>Assigned Building</strong><br/>
        Source: ${props.building_source || "—"}<br/>
        ID: ${props.building_id || "—"}
      `;
    } else if (feature.layer.id.startsWith("ml_buildings")) {
      html = `
        <strong>ML Building</strong><br/>
        Source: ${props.building_source || "—"}<br/>
        ID: ${props.building_id || "—"}<br/>
        Height: ${props.height_m ? Number(props.height_m).toFixed(1) + " m" : "—"}
      `;
    } else if (feature.layer.id === "ml_points") {
      html = `
        <strong>ML Result</strong><br/>
        Cluster: ${props.cluster_id || "—"}<br/>
        Building: ${props.building_id || "—"}<br/>
        Method: ${props.method || "—"}<br/>
        Distance: ${props.distance_m ? Number(props.distance_m).toFixed(1) + " m" : "—"}
      `;
    } else if (feature.layer.id.startsWith("insar")) {
      html = `
        <strong>InSAR Point</strong><br/>
        Code: ${props.code || "—"}<br/>
        Velocity: ${Number(props.velocity).toFixed(2)} mm/yr<br/>
        Coherence: ${Number(props.coherence).toFixed(2)}
      `;
    } else if (feature.layer.id === "gba") {
      html = `
        <strong>GBA Building</strong><br/>
        Height: ${Number(props.height || 0).toFixed(1)} m
      `;
    } else if (feature.layer.id === "osm") {
      html = `
        <strong>OSM Building</strong><br/>
        ${props.name || "Unnamed"}<br/>
        Type: ${props.building_type || "—"}
      `;
    }

    setTooltip({ x: event.point.x + 12, y: event.point.y + 12, html });
  }

  function handleClick(event: MapMouseEvent, map: MapLibreMap) {
    const queryLayers = ["insar_t44", "insar_t95", "gba", "osm"];
    if (map.getLayer("ml_points")) {
      queryLayers.unshift("ml_points");
    }
    if (map.getLayer("ml_buildings_flat")) {
      queryLayers.unshift("ml_buildings_flat");
    }
    if (map.getLayer("ml_buildings_fill")) {
      queryLayers.unshift("ml_buildings_fill");
    }
    if (map.getLayer("ml_buildings_outline")) {
      queryLayers.unshift("ml_buildings_outline");
    }
    const features = map.queryRenderedFeatures(event.point, {
      layers: queryLayers,
    });
    if (!features.length) {
      setSelection(null);
      return;
    }

    const feature = features[0];
    const props = feature.properties as any;

    if (feature.layer.id.startsWith("ml_buildings")) {
      if (props.building_id && props.building_source) {
        setSelection({
          type: "building",
          source: props.building_source,
          id: String(props.building_id),
        });
      }
    } else if (feature.layer.id === "ml_points") {
      if (props.code) {
        setSelection({ type: "point", code: props.code, track: props.track });
      }
    } else if (feature.layer.id.startsWith("insar")) {
      const track = feature.layer.id === "insar_t44" ? 44 : 95;
      if (props.code) {
        setSelection({ type: "point", code: props.code, track });
      }
    } else if (feature.layer.id === "gba") {
      if (props.gba_id) {
        setSelection({ type: "building", source: "gba", id: String(props.gba_id) });
      }
    } else if (feature.layer.id === "osm") {
      if (props.osm_id) {
        setSelection({ type: "building", source: "osm", id: String(props.osm_id) });
      }
    }
  }

  return (
    <div className="map" ref={mapContainer}>
      {tooltip && (
        <div
          className="tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
