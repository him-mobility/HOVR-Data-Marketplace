"use client";

import { useEffect, useState } from "react";
import { EVENT_TYPES } from "@/lib/schema";

const PAGE = 25;
const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));

type Row = {
  idx: number; robot_id: string; project: string; ts: number; lat: number; lng: number;
  road_name: string; event_type: string;
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

  async function load(off: number, replace: boolean) {
    const res = await fetch(`/api/records?${query}&limit=${PAGE}&offset=${off}`);
    const data = await res.json();
    setTotal(data.total ?? 0);
    setRows((prev) => (replace ? data.rows : [...prev, ...data.rows]));
  }

  // query change resets to page 0
  useEffect(() => {
    setOffset(0);
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function more() {
    const next = offset + PAGE;
    setOffset(next);
    load(next, false);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#0e1626]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-300">수집 데이터 목록</h3>
        <span className="text-xs text-slate-500">{rows.length.toLocaleString("en-US")}/{total.toLocaleString("en-US")}건</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#0e1626] text-slate-500">
            <tr>
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
                  className="cursor-pointer border-t border-white/5 text-slate-300 hover:bg-white/5"
                >
                  <td className="px-3 py-2 font-mono text-slate-400">#{r.idx}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{fmtTime(r.ts)}</td>
                  <td className="px-3 py-2 font-mono text-slate-400">{r.robot_id}</td>
                  <td className="px-3 py-2">{r.road_name}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: ev?.color ?? "#8899aa" }} />
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
            onClick={more}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-slate-300 transition-colors hover:bg-white/10"
          >
            더보기 (+{Math.min(PAGE, total - rows.length).toLocaleString("en-US")})
          </button>
        </div>
      )}
    </div>
  );
}
