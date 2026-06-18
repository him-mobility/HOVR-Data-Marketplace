"use client";

import { useEffect, useState } from "react";
import { EVENT_TYPES } from "@/lib/schema";

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));
const PAGE = 25;

type Row = {
  idx: number;
  robot_id: string;
  project: string;
  ts: number;
  lat: number;
  lng: number;
  road_name: string;
  event_type: string;
  weather_condition: string;
  confidence: number;
  object_type: string;
  object_count: number;
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Ledger({ query, onPick }: { query: string; onPick: (idx: number) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch a page; replace on offset 0, append otherwise.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/records?${query}&limit=${PAGE}&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setTotal(d.total ?? 0);
        setRows((prev) => (offset === 0 ? d.rows : [...prev, ...d.rows]));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, offset]);

  // Reset to first page whenever the query changes.
  useEffect(() => {
    setOffset(0);
  }, [query]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#0b1220]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-300">수집 데이터 목록</h3>
        <span className="mono text-xs text-slate-500">
          {rows.length}/{total}건
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#0b1220] text-slate-500">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-medium">번호</th>
              <th className="px-3 py-2 font-medium">시각</th>
              <th className="px-3 py-2 font-medium">로봇</th>
              <th className="px-3 py-2 font-medium">도로</th>
              <th className="px-3 py-2 font-medium">상황</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ev = EMAP[r.event_type];
              return (
                <tr
                  key={r.idx}
                  onClick={() => onPick(r.idx)}
                  className="cursor-pointer border-b border-white/5 text-slate-300 hover:bg-white/5"
                >
                  <td className="mono px-3 py-2 text-slate-400">#{r.idx}</td>
                  <td className="mono px-3 py-2 text-slate-400">{fmtTime(r.ts)}</td>
                  <td className="mono px-3 py-2 text-slate-400">{r.robot_id}</td>
                  <td className="px-3 py-2">{r.road_name}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: ev?.color ?? "#8899aa" }}
                      />
                      {ev?.label ?? r.event_type}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length < total && (
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => setOffset(rows.length)}
            disabled={loading}
            className="w-full rounded-md border border-white/10 bg-white/5 py-2 text-xs text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            더보기 (+{Math.min(PAGE, total - rows.length)})
          </button>
        </div>
      )}
    </div>
  );
}
