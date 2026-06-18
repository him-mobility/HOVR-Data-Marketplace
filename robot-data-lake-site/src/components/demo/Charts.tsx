"use client";

import {
  ResponsiveContainer,
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LabelList,
  AreaChart, Area,
} from "recharts";
import { EVENT_TYPES } from "@/lib/schema";
import type { Agg } from "./types";

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));

function short(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  if (n >= 10000) return `${Math.round(n / 1000) / 10}만`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}천`;
  return n.toLocaleString("en-US");
}

const TOOLTIP_STYLE = {
  background: "#0d1320",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e1626] p-4">
      <h3 className="mb-2 text-sm font-medium text-slate-300">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Charts({ agg }: { agg: Agg | null }) {
  const byEvent = (agg?.byEvent ?? []).map((d) => ({
    ...d,
    label: EMAP[d.event_type]?.label ?? d.event_type,
    color: EMAP[d.event_type]?.color ?? "#8899aa",
  }));
  const byDay = (agg?.byDay ?? []).map((d) => ({ ...d, name: d.day.slice(5) }));
  const byProject = agg?.byProject ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel title="도로 상황별">
        <BarChart data={byEvent} margin={{ top: 16, right: 8, left: -8, bottom: 4 }}>
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-25} textAnchor="end" interval={0} height={50} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={short} width={40} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={short} />
          <Bar dataKey="c" radius={[6, 6, 0, 0]}>
            {byEvent.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
            <LabelList dataKey="c" position="top" fill="#94a3b8" fontSize={10} formatter={short} />
          </Bar>
        </BarChart>
      </Panel>

      <Panel title="날짜별 수집량">
        <AreaChart data={byDay} margin={{ top: 16, right: 8, left: -8, bottom: 4 }}>
          <defs>
            <linearGradient id="dayFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={6} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={short} width={40} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "rgba(255,255,255,0.1)" }} formatter={short} />
          <Area type="monotone" dataKey="c" stroke="#38BDF8" strokeWidth={2.5} fill="url(#dayFill)" />
        </AreaChart>
      </Panel>

      <Panel title="지역·팀별 수집량">
        <BarChart data={byProject} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={short} hide />
          <YAxis type="category" dataKey="project" tick={{ fill: "#94a3b8", fontSize: 11 }} width={78} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={short} />
          <Bar dataKey="c" fill="#60A5FA" radius={[0, 6, 6, 0]}>
            <LabelList dataKey="c" position="right" fill="#94a3b8" fontSize={10} formatter={short} />
          </Bar>
        </BarChart>
      </Panel>
    </div>
  );
}
