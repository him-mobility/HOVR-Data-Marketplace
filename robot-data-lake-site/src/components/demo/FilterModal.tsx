"use client";

import { EVENT_TYPES, START_MS, END_MS } from "@/lib/schema";
import type { F, Facets } from "./types";

const PRESETS: { label: string; days: number | null }[] = [
  { label: "전체", days: null },
  { label: "최근 24시간", days: 1 },
  { label: "3일", days: 3 },
  { label: "7일", days: 7 },
  { label: "14일", days: 14 },
];

// epoch ms -> value usable by <input type="datetime-local"> (local time, no tz suffix)
function toLocalInput(ms: number): string {
  const d = new Date(ms - d0(ms));
  return d.toISOString().slice(0, 16);
}
function d0(ms: number): number {
  return new Date(ms).getTimezoneOffset() * 60000;
}
function fromLocalInput(v: string): number | undefined {
  if (!v) return undefined;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({
  label, color, count, active, onClick,
}: {
  label: string; color?: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors " +
        (active
          ? "border-[#2dd4bf] bg-[#2dd4bf]/15 text-[#2dd4bf]"
          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10")
      }
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      <span>{label}</span>
      {count != null && (
        <span className={count === 0 ? "text-slate-600" : "text-slate-500"}>
          {count.toLocaleString("en-US")}
        </span>
      )}
    </button>
  );
}

export default function FilterModal({
  open, onClose, f, setF, facets,
}: {
  open: boolean; onClose: () => void; f: F; setF: (f: F) => void; facets: Facets | null;
}) {
  if (!open) return null;

  const eventCount = (slug: string) => facets?.events.find((e) => e.v === slug)?.c;

  function applyPreset(days: number | null) {
    if (days == null) {
      const { from, to, ...rest } = f;
      void from; void to;
      setF({ ...rest });
    } else {
      setF({ ...f, from: END_MS - days * 86400000, to: END_MS });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1320] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-200">필터 설정</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setF({ projects: [], events: [], roads: [] })}
              className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
            >
              전체 초기화
            </button>
            <button
              onClick={onClose}
              className="rounded-md bg-[#2dd4bf] px-4 py-1.5 text-xs font-semibold text-[#06121f] hover:bg-[#2dd4bf]/90"
            >
              완료
            </button>
          </div>
        </div>

        <div className="space-y-6 overflow-y-auto p-5">
          {/* 기간 */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">기간</h4>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip key={p.label} label={p.label} active={false} onClick={() => applyPreset(p.days)} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-2">
                시작
                <input
                  type="datetime-local"
                  min={toLocalInput(START_MS)}
                  max={toLocalInput(END_MS)}
                  value={f.from != null ? toLocalInput(f.from) : ""}
                  onChange={(e) => setF({ ...f, from: fromLocalInput(e.target.value) })}
                  className="rounded-md border border-white/10 bg-[#0b1220] px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2">
                종료
                <input
                  type="datetime-local"
                  min={toLocalInput(START_MS)}
                  max={toLocalInput(END_MS)}
                  value={f.to != null ? toLocalInput(f.to) : ""}
                  onChange={(e) => setF({ ...f, to: fromLocalInput(e.target.value) })}
                  className="rounded-md border border-white/10 bg-[#0b1220] px-2 py-1 text-slate-200"
                />
              </label>
            </div>
          </section>

          {/* 수집처 */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">수집처</h4>
            <div className="flex flex-wrap gap-2">
              {(facets?.projects ?? []).map((p) => (
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
              {(facets?.roads ?? []).map((r) => (
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
