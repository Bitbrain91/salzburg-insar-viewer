import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import { useAppStore } from "../lib/store";

const tilesBase =
  import.meta.env.VITE_TILES_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");
const baseStyle =
  import.meta.env.VITE_BASEMAP_STYLE ||
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

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

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [tooltip, setTooltip] = useState<
    { x: number; y: number; html: string } | null
  >(null);

  const layers = useAppStore((state) => state.layers);
  const filters = useAppStore((state) => state.filters);
  const filtersEnabled = useAppStore((state) => state.filtersEnabled);
  const selection = useAppStore((state) => state.selection);
  const setSelection = useAppStore((state) => state.setSelection);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: baseStyle,
      center: [13.05, 47.8],
      zoom: 12,
      pitch: 45,
      bearing: -10,
      hash: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }));

    map.on("load", () => {
      map.addSource("insar_t44", {
        type: "vector",
        tiles: [`${tilesBase}/mbtiles/insar_t44/{z}/{x}/{y}.pbf`],
        tileSize: 512,
        minzoom: 0,
        maxzoom: 16,
      });
      map.addSource("insar_t95", {
        type: "vector",
        tiles: [`${tilesBase}/mbtiles/insar_t95/{z}/{x}/{y}.pbf`],
        tileSize: 512,
        minzoom: 0,
        maxzoom: 16,
      });
      map.addSource("gba", {
        type: "vector",
        tiles: [`${tilesBase}/mbtiles/gba/{z}/{x}/{y}.pbf`],
        tileSize: 512,
        minzoom: 0,
        maxzoom: 15,
      });
      map.addSource("osm", {
        type: "vector",
        tiles: [`${tilesBase}/mbtiles/osm/{z}/{x}/{y}.pbf`],
        tileSize: 512,
        minzoom: 0,
        maxzoom: 15,
      });

      map.addLayer({
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

      map.addLayer({
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

      map.addLayer({
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

      map.addLayer({
        id: "osm",
        type: "fill",
        source: "osm",
        "source-layer": "osm",
        paint: {
          "fill-color": "#c9c6bf",
          "fill-opacity": 0.5,
        },
      });

      map.addLayer({
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

      map.addLayer({
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

      map.addLayer({
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

      map.addLayer({
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

      applyLayerVisibility(map, layers);
      applyFilters(map, filters, filtersEnabled);
    });

    map.on("mousemove", (event) => handleHover(event, map));
    map.on("click", (event) => handleClick(event, map));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

    if (!selection) {
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

    if (selection.type === "point") {
      const show44 = selection.track === 44 || selection.track === undefined;
      const show95 = selection.track === 95 || selection.track === undefined;
      if (map.getLayer("insar_selected_t44")) {
        map.setFilter(
          "insar_selected_t44",
          show44 ? ["==", ["get", "code"], selection.code] : ["==", ["get", "code"], ""]
        );
      }
      if (map.getLayer("insar_selected_t95")) {
        map.setFilter(
          "insar_selected_t95",
          show95 ? ["==", ["get", "code"], selection.code] : ["==", ["get", "code"], ""]
        );
      }
      if (map.getLayer("gba_highlight")) {
        map.setFilter("gba_highlight", ["==", ["get", "gba_id"], ""]);
      }
      if (map.getLayer("osm_highlight")) {
        map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
      }
    } else {
      if (selection.source === "gba") {
        if (map.getLayer("gba_highlight")) {
          map.setFilter("gba_highlight", ["==", ["get", "gba_id"], selection.id]);
        }
        if (map.getLayer("osm_highlight")) {
          map.setFilter("osm_highlight", ["==", ["get", "osm_id"], ""]);
        }
      } else {
        if (map.getLayer("osm_highlight")) {
          map.setFilter("osm_highlight", ["==", ["get", "osm_id"], selection.id]);
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
  }, [selection]);

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
    const features = map.queryRenderedFeatures(event.point, {
      layers: ["insar_t44", "insar_t95", "gba", "osm"],
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

    if (feature.layer.id.startsWith("insar")) {
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
    const features = map.queryRenderedFeatures(event.point, {
      layers: ["insar_t44", "insar_t95", "gba", "osm"],
    });
    if (!features.length) {
      setSelection(null);
      return;
    }

    const feature = features[0];
    const props = feature.properties as any;

    if (feature.layer.id.startsWith("insar")) {
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
