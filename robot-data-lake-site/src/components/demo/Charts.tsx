"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EVENT_TYPES } from "@/lib/schema";
import type { Agg } from "./types";

const EMAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.slug, e]));

function short(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000) / 10}만`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}천`;
  return n.toLocaleString("en-US");
}

// Recharts v3 formatters receive a loose value type; coerce then format.
const shortFmt = (v: unknown): string => {
  const n = typeof v === "number" ? v : Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? short(n) : "";
};

const tooltipStyle = {
  background: "#0d1320",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e1626] p-4">
      <h3 className="mb-2 text-sm font-medium text-slate-300">{title}</h3>
      <div className="h-52">{children}</div>
    </div>
  );
}

export default function Charts({ agg }: { agg: Agg | null }) {
  const byEvent = (agg?.byEvent ?? []).map((d) => ({
    ...d,
    label: EMAP[d.event_type]?.label ?? d.event_type,
    color: EMAP[d.event_type]?.color ?? "#8899aa",
  }));
  const byDay = agg?.byDay ?? [];
  const byProject = agg?.byProject ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel title="도로 상황별">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byEvent} margin={{ top: 18, right: 8, left: -10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              angle={-25}
              textAnchor="end"
              interval={0}
              height={48}
            />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={short} width={36} />
            <Tooltip contentStyle={tooltipStyle} formatter={shortFmt} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="c" radius={[6, 6, 0, 0]}>
              {byEvent.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList dataKey="c" position="top" fill="#cbd5e1" fontSize={10} formatter={shortFmt} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="날짜별 수집량">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={byDay} margin={{ top: 10, right: 8, left: -10, bottom: 8 }}>
            <defs>
              <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(d) => String(d ?? "").slice(5)}
              interval={6}
              height={24}
            />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={short} width={36} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(d) => String(d ?? "").slice(5)}
              formatter={shortFmt}
              cursor={{ stroke: "rgba(255,255,255,0.12)" }}
            />
            <Area
              type="monotone"
              dataKey="c"
              name="수집량"
              stroke="#38BDF8"
              strokeWidth={2.5}
              fill="url(#dayGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="지역·팀별 수집량">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byProject} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={short} />
            <YAxis
              type="category"
              dataKey="project"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              width={78}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={shortFmt} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="c" fill="#60A5FA" radius={[0, 6, 6, 0]}>
              <LabelList dataKey="c" position="right" fill="#cbd5e1" fontSize={10} formatter={shortFmt} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
