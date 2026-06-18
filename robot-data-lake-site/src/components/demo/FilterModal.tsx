"use client";

import { EVENT_TYPES, START_MS, END_MS } from "@/lib/schema";
import type { F, Facets, Facet } from "./types";

const DAY = 86400000;

// epoch ms -> value for <input type="datetime-local"> (local time, no seconds).
function toLocalInput(ms?: number): string {
  if (ms === undefined) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(v: string): number | undefined {
  if (!v) return undefined;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

const MIN_INPUT = toLocalInput(START_MS);
const MAX_INPUT = toLocalInput(END_MS);

const PRESETS: { label: string; days: number | null }[] = [
  { label: "전체", days: null },
  { label: "최근 24시간", days: 1 },
  { label: "최근 3일", days: 3 },
  { label: "최근 7일", days: 7 },
  { label: "최근 14일", days: 14 },
];

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({
  label,
  color,
  count,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {color && <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`mono ${count === 0 ? "text-slate-600" : "text-slate-500"}`}>
          {count.toLocaleString("en-US")}
        </span>
      )}
    </button>
  );
}

export default function FilterModal({
  open,
  onClose,
  f,
  setF,
  facets,
}: {
  open: boolean;
  onClose: () => void;
  f: F;
  setF: (next: F) => void;
  facets: Facets | null;
}) {
  if (!open) return null;

  const projectFacets = facets?.projects ?? [];
  const roadFacets = facets?.roads ?? [];
  const eventCount = (slug: string): number =>
    facets?.events.find((e: Facet) => e.v === slug)?.c ?? 0;

  const applyPreset = (days: number | null) => {
    if (days == null) setF({ ...f, from: undefined, to: undefined });
    else setF({ ...f, from: END_MS - days * DAY, to: END_MS });
  };

  const reset = () => setF({ projects: [], events: [], roads: [] });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1320] shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#0d1320] px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-200">필터 설정</h3>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="text-xs text-slate-400 transition-colors hover:text-slate-200">
              전체 초기화
            </button>
            <button
              onClick={onClose}
              className="rounded-md bg-[#2dd4bf] px-4 py-1.5 text-xs font-semibold text-[#06121f] transition-colors hover:bg-[#2dd4bf]/90"
            >
              완료
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {/* 기간 */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">기간</h4>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active =
                  p.days == null
                    ? f.from === undefined && f.to === undefined
                    : f.to === END_MS && f.from === END_MS - p.days * DAY;
                return (
                  <Chip key={p.label} label={p.label} active={active} onClick={() => applyPreset(p.days)} />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-2">
                시작
                <input
                  type="datetime-local"
                  min={MIN_INPUT}
                  max={MAX_INPUT}
                  value={toLocalInput(f.from)}
                  onChange={(e) => setF({ ...f, from: fromLocalInput(e.target.value) })}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2">
                종료
                <input
                  type="datetime-local"
                  min={MIN_INPUT}
                  max={MAX_INPUT}
                  value={toLocalInput(f.to)}
                  onChange={(e) => setF({ ...f, to: fromLocalInput(e.target.value) })}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-slate-200"
                />
              </label>
            </div>
          </section>

          {/* 수집처 */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">수집처</h4>
            <div className="flex flex-wrap gap-2">
              {projectFacets.map((p) => (
                <Chip
                  key={p.v}
                  label={p.v}
                  count={p.c}
                  active={f.projects.includes(p.v)}
                  onClick={() => setF({ ...f, projects: toggle(f.projects, p.v) })}
                />
              ))}
            </div>
          </section>

          {/* 이벤트 */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">이벤트</h4>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((e) => (
                <Chip
                  key={e.slug}
                  label={e.label}
                  color={e.color}
                  count={eventCount(e.slug)}
                  active={f.events.includes(e.slug)}
                  onClick={() => setF({ ...f, events: toggle(f.events, e.slug) })}
                />
              ))}
            </div>
          </section>

          {/* 장소·도로 */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">장소·도로</h4>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {roadFacets.map((r) => (
                <Chip
                  key={r.v}
                  label={r.v}
                  count={r.c}
                  active={f.roads.includes(r.v)}
                  onClick={() => setF({ ...f, roads: toggle(f.roads, r.v) })}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
