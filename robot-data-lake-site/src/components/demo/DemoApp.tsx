"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import HimWordmark from "@/components/brand/HimWordmark";
import { EVENT_TYPES, PROJECTS } from "@/lib/schema";
import type { F, Facets, Agg } from "./types";
import Charts from "./Charts";
import Ledger from "./Ledger";
import Drawer from "./Drawer";
import FilterModal from "./FilterModal";
import AgentPanel from "./AgentPanel";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
      지도 로딩…
    </div>
  ),
});

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));
const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));
const EVENT_SLUGS = new Set(EVENT_TYPES.map((e) => e.slug));

// Build a query string from the active filters.
function qs(f: F): string {
  const sp = new URLSearchParams();
  if (f.projects.length) sp.set("projects", f.projects.join(","));
  if (f.events.length) sp.set("events", f.events.join(","));
  if (f.roads.length) sp.set("roads", f.roads.join(","));
  if (f.from !== undefined) sp.set("from", String(f.from));
  if (f.to !== undefined) sp.set("to", String(f.to));
  return sp.toString();
}

const uniq = (arr: string[]) => Array.from(new Set(arr));

export default function DemoApp() {
  const [f, setF] = useState<F>({ projects: [], events: [], roads: [] });
  const [points, setPoints] = useState<number[][]>([]);
  const [geoTotal, setGeoTotal] = useState(0);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [agg, setAgg] = useState<Agg | null>(null);
  const [view, setView] = useState<{ n: number; total: number }>({ n: 0, total: 0 });
  const [picked, setPicked] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [show, setShow] = useState<{ map: boolean; charts: boolean; ledger: boolean }>({
    map: true,
    charts: false,
    ledger: false,
  });

  const query = useMemo(() => qs(f), [f]);

  // Apply ?events=&projects=&roads= deep-link once on mount.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const sp = new URLSearchParams(window.location.search);
    const parse = (key: string, allow?: Set<string>) =>
      (sp.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && (!allow || allow.has(s)));
    const projects = parse("projects", PROJECT_NAMES);
    const events = parse("events", EVENT_SLUGS);
    const roads = parse("roads").map((r) => r.slice(0, 40));
    if (projects.length || events.length || roads.length) {
      setF((prev) => ({ ...prev, projects, events, roads }));
    }
  }, []);

  // On query change: fetch geo + facets + aggregate in parallel.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/geo?${query}`).then((r) => r.json()),
      fetch(`/api/facets?${query}`).then((r) => r.json()),
      fetch(`/api/aggregate?${query}`).then((r) => r.json()),
    ])
      .then(([geo, fac, ag]) => {
        if (cancelled) return;
        setPoints(geo.points ?? []);
        setGeoTotal(geo.total ?? 0);
        setFacets(fac);
        setAgg(ag);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [query]);

  // CONTRACT: merge a normalized filter patch into f (triggers refetch).
  // HOVI (next stage) drives the dashboard exclusively through this.
  const applyPatch = useCallback((patch: any) => {
    if (!patch || typeof patch !== "object") return;
    setF((prev) => {
      const next: F = { ...prev };
      if (Array.isArray(patch.projects)) {
        next.projects = uniq(patch.projects.filter((v: unknown): v is string => typeof v === "string" && PROJECT_NAMES.has(v)));
      }
      if (Array.isArray(patch.events)) {
        next.events = uniq(patch.events.filter((v: unknown): v is string => typeof v === "string" && EVENT_SLUGS.has(v)));
      }
      if (Array.isArray(patch.roads)) {
        next.roads = uniq(patch.roads.filter((v: unknown): v is string => typeof v === "string").map((v: string) => v.slice(0, 40)));
      }
      if ("from" in patch) next.from = Number.isFinite(patch.from) ? patch.from : undefined;
      if ("to" in patch) next.to = Number.isFinite(patch.to) ? patch.to : undefined;
      return next;
    });
  }, []);

  // Inline removable filter tokens.
  type Token = { key: string; label: string; remove: () => void };
  const tokens: Token[] = [];
  for (const p of f.projects)
    tokens.push({ key: `p:${p}`, label: p, remove: () => setF((s) => ({ ...s, projects: s.projects.filter((x) => x !== p) })) });
  for (const e of f.events)
    tokens.push({ key: `e:${e}`, label: EMAP[e]?.label ?? e, remove: () => setF((s) => ({ ...s, events: s.events.filter((x) => x !== e) })) });
  for (const r of f.roads)
    tokens.push({ key: `r:${r}`, label: r, remove: () => setF((s) => ({ ...s, roads: s.roads.filter((x) => x !== r) })) });
  if (f.from !== undefined || f.to !== undefined)
    tokens.push({ key: "ts", label: "기간", remove: () => setF((s) => ({ ...s, from: undefined, to: undefined })) });

  const tokenCount = tokens.length;
  const hotspot = agg?.hotspots?.[0];

  const enabled = [
    show.map && ("map" as const),
    show.charts && ("charts" as const),
    show.ledger && ("ledger" as const),
  ].filter(Boolean) as ("map" | "charts" | "ledger")[];

  const toggleBtn = (key: "map" | "charts" | "ledger", label: string) => (
    <button
      onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        show[key]
          ? "border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-[#080c14] text-slate-200">
      {/* Control bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <Link href="/" className="text-slate-400 transition-colors hover:text-slate-200" aria-label="홈">
          <HimWordmark height={18} className="text-slate-200" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">HOVR</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f59e0b] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f59e0b]" />
          </span>
        </div>

        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
        >
          필터
          {tokenCount > 0 && (
            <span className="mono inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2dd4bf] px-1 text-[10px] font-bold text-[#06121f]">
              {tokenCount}
            </span>
          )}
        </button>

        {/* Inline removable tokens */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {tokens.map((t) => (
            <button
              key={t.key}
              onClick={t.remove}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
            >
              {t.label}
              <span className="text-slate-500">✕</span>
            </button>
          ))}
        </div>

        {/* Panel toggles */}
        <div className="flex items-center gap-2">
          {toggleBtn("map", "지도")}
          {toggleBtn("charts", "차트")}
          {toggleBtn("ledger", "데이터 표")}
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: enabled panels split evenly */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          {enabled.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              표시할 패널을 선택하세요.
            </div>
          )}
          {enabled.map((panel) => (
            <div key={panel} className="min-h-0 flex-1">
              {panel === "map" && (
                <div className="relative h-full overflow-hidden rounded-xl border border-white/10">
                  <MapView points={points} onPick={setPicked} onViewport={(n, total) => setView({ n, total })} />
                  {/* top-left viewport overlay */}
                  <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-[#0d1320]/85 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
                    이 영역 <span className="mono text-slate-100">{view.n.toLocaleString("en-US")}</span> / 전체{" "}
                    <span className="mono text-slate-100">{geoTotal.toLocaleString("en-US")}</span>
                  </div>
                  {/* bottom-left hotspot overlay */}
                  {hotspot && (
                    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-[#f59e0b]/15 px-3 py-1.5 text-xs text-[#f59e0b] backdrop-blur">
                      최다 발생 · {hotspot.road_name} · {hotspot.c.toLocaleString("en-US")}건
                    </div>
                  )}
                </div>
              )}
              {panel === "charts" && (
                <div className="h-full overflow-auto">
                  <Charts agg={agg} />
                </div>
              )}
              {panel === "ledger" && <Ledger query={query} onPick={setPicked} />}
            </div>
          ))}
        </div>

        {/* Right: fixed-width HOVI agent panel (stage 05) */}
        <div className="border-t border-white/10 lg:w-[380px] lg:border-l lg:border-t-0">
          <AgentPanel onApplyFilter={applyPatch} />
        </div>
      </div>

      <FilterModal open={modal} onClose={() => setModal(false)} f={f} setF={setF} facets={facets} />
      <Drawer idx={picked} onClose={() => setPicked(null)} />
    </div>
  );
}
