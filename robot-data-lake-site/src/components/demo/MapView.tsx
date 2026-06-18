"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { EVENT_TYPES } from "@/lib/schema";

const STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// eventIdx -> color match expression (hex only; oklch rejected by MapLibre).
const EVENT_MATCH: unknown[] = ["match", ["get", "e"]];
EVENT_TYPES.forEach((e, i) => {
  EVENT_MATCH.push(i, e.color);
});
EVENT_MATCH.push("#8899aa"); // fallback

type Pt = number[]; // [lng, lat, eventIdx, idx]

function toGeoJSON(points: Pt[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p[0], p[1]] },
      properties: { e: p[2], idx: p[3] },
    })),
  };
}

export default function MapView({
  points, onPick, onViewport,
}: {
  points: Pt[];
  onPick: (idx: number) => void;
  onViewport: (inView: number, total: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pointsRef = useRef<Pt[]>(points);
  pointsRef.current = points;
  const onViewportRef = useRef(onViewport);
  onViewportRef.current = onViewport;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // count points inside current viewport bounds
  function recount() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    let n = 0;
    for (const p of pointsRef.current) {
      if (b.contains([p[0], p[1]])) n++;
    }
    onViewportRef.current(n, pointsRef.current.length);
  }

  // init once
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

    map.on("load", () => {
      map.addSource("pts", {
        type: "geojson",
        data: toGeoJSON(pointsRef.current) as never,
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
            "interpolate", ["linear"], ["get", "point_count"],
            0, "#2dd4bf", 800, "#5eb6c9", 3000, "#f0a830", 9000, "#f97316",
          ],
          "circle-radius": [
            "interpolate", ["linear"], ["get", "point_count"],
            0, 13, 800, 19, 3000, 27, 9000, 36,
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
          "circle-color": EVENT_MATCH as never,
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, 2.2, 13, 4, 16, 7,
          ],
          "circle-opacity": 0.9,
        },
      });

      recount();
    });

    map.on("moveend", recount);

    // unclustered click -> open drawer
    map.on("click", "pts-un", (ev) => {
      const feat = ev.features?.[0];
      if (!feat) return;
      onPickRef.current(Number(feat.properties?.idx));
    });
    // cluster click -> zoom in
    map.on("click", "clusters", (ev) => {
      const feat = ev.features?.[0];
      if (!feat) return;
      const clusterId = feat.properties?.cluster_id;
      const src = map.getSource("pts") as maplibregl.GeoJSONSource;
      src.getClusterExpansionZoom(clusterId).then((zoom) => {
        const geom = feat.geometry as { type: string; coordinates: [number, number] };
        map.easeTo({ center: geom.coordinates, zoom });
      });
    });

    for (const layer of ["pts-un", "clusters"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // points change -> update source data + recount (no re-init)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("pts") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(toGeoJSON(points) as never);
    recount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" role="img" aria-label="전국 데이터 지도" />;
}
