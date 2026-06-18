"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { EVENT_TYPES } from "@/lib/schema";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// match expression: eventIdx -> EVENT_TYPES[i].color (hex), fallback #8899aa.
// MapLibre rejects oklch in paint, so EVENT_TYPES colors must be hex/rgb.
const EVENT_COLOR_MATCH: any = [
  "match",
  ["get", "e"],
  ...EVENT_TYPES.flatMap((e, i) => [i, e.color]),
  "#8899aa",
];

type Props = {
  points: number[][];
  onPick: (idx: number) => void;
  onViewport: (inView: number, total: number) => void;
};

function toGeoJSON(points: number[][]): any {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p[0], p[1]] },
      properties: { e: p[2], idx: p[3] },
    })),
  };
}

export default function MapView({ points, onPick, onViewport }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pointsRef = useRef<number[][]>(points);
  const onPickRef = useRef(onPick);
  const onViewportRef = useRef(onViewport);

  // keep callbacks/points fresh without re-initializing the map
  onPickRef.current = onPick;
  onViewportRef.current = onViewport;
  pointsRef.current = points;

  // Initialize the map ONCE.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [127.0, 36.35],
      zoom: 6.4,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    function recount() {
      const m = mapRef.current;
      if (!m) return;
      const b = m.getBounds();
      let n = 0;
      for (const p of pointsRef.current) {
        if (p[0] >= b.getWest() && p[0] <= b.getEast() && p[1] >= b.getSouth() && p[1] <= b.getNorth()) {
          n++;
        }
      }
      onViewportRef.current(n, pointsRef.current.length);
    }

    map.on("load", () => {
      map.addSource("pts", {
        type: "geojson",
        data: toGeoJSON(pointsRef.current),
        cluster: true,
        clusterRadius: 54,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "pts",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            0,
            "#2dd4bf",
            800,
            "#5eb6c9",
            3000,
            "#f0a830",
            9000,
            "#f97316",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "point_count"],
            0,
            13,
            800,
            19,
            3000,
            27,
            9000,
            36,
          ],
          "circle-opacity": 0.82,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,0.25)",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pts",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#06121f" },
      });

      map.addLayer({
        id: "pts-un",
        type: "circle",
        source: "pts",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": EVENT_COLOR_MATCH,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.2, 13, 4, 16, 7],
          "circle-opacity": 0.9,
        },
      });

      recount();
    });

    map.on("moveend", recount);

    // Click an unclustered point -> open its record.
    map.on("click", "pts-un", (e) => {
      const feat = e.features?.[0];
      if (feat) onPickRef.current(Number(feat.properties?.idx));
    });

    // Click a cluster -> zoom in to expand it.
    map.on("click", "clusters", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const clusterId = feat.properties?.cluster_id;
      const src = map.getSource("pts") as maplibregl.GeoJSONSource;
      src.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = feat.geometry as any;
        map.easeTo({ center: geom.coordinates, zoom });
      });
    });

    for (const id of ["pts-un", "clusters"]) {
      map.on("mouseenter", id, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", id, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On points change: setData + recount (do NOT re-init the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("pts") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData(toGeoJSON(points));
      const b = map.getBounds();
      let n = 0;
      for (const p of points) {
        if (p[0] >= b.getWest() && p[0] <= b.getEast() && p[1] >= b.getSouth() && p[1] <= b.getNorth()) {
          n++;
        }
      }
      onViewportRef.current(n, points.length);
    };
    if (map.isStyleLoaded() && map.getSource("pts")) {
      apply();
    } else {
      map.once("load", apply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" role="img" aria-label="전국 데이터 지도" />;
}
