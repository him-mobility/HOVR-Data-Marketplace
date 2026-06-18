"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import HimWordmark from "@/components/brand/HimWordmark";
import { EVENT_TYPES } from "@/lib/schema";
import type { F, Facets, Agg } from "./types";
import Charts from "./Charts";
import Ledger from "./Ledger";
import Drawer from "./Drawer";
import FilterModal from "./FilterModal";
import AgentPanel from "./AgentPanel";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">지도 로딩…</div>
  ),
});

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));

function qs(f: F): string {
  const sp = new URLSearchParams();
  if (f.projects.length) sp.set("projects", f.projects.join(","));
  if (f.events.length) sp.set("events", f.events.join(","));
  if (f.roads.length) sp.set("roads", f.roads.join(","));
  if (f.from != null) sp.set("from", String(f.from));
  if (f.to != null) sp.set("to", String(f.to));
  return sp.toString();
}

type Toggle = { map: boolean; charts: boolean; ledger: boolean };

export default function DemoApp() {
  const [f, setF] = useState<F>({ projects: [], events: [], roads: [] });
  const [points, setPoints] = useState<number[][]>([]);
  const [geoTotal, setGeoTotal] = useState(0);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [agg, setAgg] = useState<Agg | null>(null);
  const [view, setView] = useState<{ n: number; total: number }>({ n: 0, total: 0 });
  const [picked, setPicked] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [show, setShow] = useState<Toggle>({ map: true, charts: false, ledger: false });

  const query = useMemo(() => qs(f), [f]);

  // one-time deep link: ?events=&projects=&roads=
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const split = (k: string) =>
      (sp.get(k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const projects = split("projects");
    const events = split("events");
    const roads = split("roads");
    if (projects.length || events.length || roads.length) {
      setF((prev) => ({ ...prev, projects, events, roads }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch on query change
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/geo?${query}`).then((r) => r.json()),
      fetch(`/api/facets?${query}`).then((r) => r.json()),
      fetch(`/api/aggregate?${query}`).then((r) => r.json()),
    ]).then(([geo, fc, ag]) => {
      if (!alive) return;
      setPoints(geo.points ?? []);
      setGeoTotal(geo.total ?? 0);
      setFacets(fc);
      setAgg(ag);
    });
    return () => {
      alive = false;
    };
  }, [query]);

  const tokenCount = f.projects.length + f.events.length + f.roads.length + (f.from != null || f.to != null ? 1 : 0);
  const hotspot = agg?.hotspots?.[0];

  function removeToken(kind: "projects" | "events" | "roads", v: string) {
    setF({ ...f, [kind]: f[kind].filter((x) => x !== v) });
  }

  // HOVI → dashboard sync: replace the filter with the agent's resolved filter
  // so map/charts/table all reflect the question's related data.
  function applyPatch(patch?: Partial<F>) {
    if (!patch) return;
    setF((prev) => ({
      ...prev,
      projects: patch.projects ?? [],
      events: patch.events ?? [],
      roads: patch.roads ?? [],
      from: patch.from,
      to: patch.to,
    }));
  }

  function PanelToggle({ k, label }: { k: keyof Toggle; label: string }) {
    const active = show[k];
    return (
      <button
        onClick={() => setShow({ ...show, [k]: !active })}
        className={
          "rounded-md border px-3 py-1.5 text-xs transition-colors " +
          (active
            ? "border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]"
            : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10")
        }
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#080c14] text-slate-200">
      {/* control bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">← 홈</Link>
        <div className="flex items-center gap-2">
          <HimWordmark height={18} className="text-slate-200" />
          <span className="text-sm font-semibold text-slate-100">HOVR</span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#f59e0b]" aria-label="live" />
        </div>

        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          필터
          {tokenCount > 0 && (
            <span className="rounded-full bg-[#2dd4bf] px-1.5 py-0.5 text-[10px] font-semibold text-[#06121f]">
              {tokenCount}
            </span>
          )}
        </button>

        {/* inline removable tokens */}
        <div className="flex flex-wrap items-center gap-1.5">
          {f.projects.map((v) => (
            <Token key={`p-${v}`} label={v} onRemove={() => removeToken("projects", v)} />
          ))}
          {f.events.map((v) => (
            <Token key={`e-${v}`} label={EMAP[v]?.label ?? v} color={EMAP[v]?.color} onRemove={() => removeToken("events", v)} />
          ))}
          {f.roads.map((v) => (
            <Token key={`r-${v}`} label={v} onRemove={() => removeToken("roads", v)} />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <PanelToggle k="map" label="지도" />
          <PanelToggle k="charts" label="차트" />
          <PanelToggle k="ledger" label="데이터 표" />
        </div>
      </div>

      {/* body: left panels + right agent rail */}
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {show.map && (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#0e1626]">
              <MapView points={points} onPick={setPicked} onViewport={(n, total) => setView({ n, total })} />
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-[#080c14]/85 px-3 py-1.5 text-xs text-slate-300">
                이 영역 {view.n.toLocaleString("en-US")} / 전체 {geoTotal.toLocaleString("en-US")}
              </div>
              {hotspot && (
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-[#f59e0b]/40 bg-[#080c14]/85 px-3 py-1.5 text-xs text-[#f59e0b]">
                  최다 발생 · {hotspot.road_name} · {hotspot.c.toLocaleString("en-US")}건
                </div>
              )}
            </div>
          )}
          {show.charts && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Charts agg={agg} />
            </div>
          )}
          {show.ledger && (
            <div className="min-h-0 flex-1">
              <Ledger query={query} onPick={setPicked} />
            </div>
          )}
        </div>

        <div className="hidden lg:block lg:w-[380px] lg:shrink-0">
          <AgentPanel onApplyFilter={applyPatch} />
        </div>
      </div>

      <FilterModal open={modal} onClose={() => setModal(false)} f={f} setF={setF} facets={facets} />
      <Drawer idx={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

function Token({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
      <button onClick={onRemove} aria-label="제거" className="text-slate-500 hover:text-slate-200">✕</button>
    </span>
  );
}
