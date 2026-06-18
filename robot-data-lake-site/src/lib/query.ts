// Shared query builder for the read-only data API.
// Server-side: turns user-supplied filter params into a parameterized WHERE
// clause. NEVER interpolate raw user values into SQL — always bind via params.
import { PROJECTS, EVENT_TYPES } from "./schema";

export type Filters = {
  projects?: string[];
  events?: string[];
  roads?: string[];
  from?: number; // epoch ms
  to?: number; // epoch ms
};

const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));
const EVENT_SLUGS = new Set(EVENT_TYPES.map((e) => e.slug));

const MAX_ITEMS = 50;
const ROAD_MAX_LEN = 40;

function splitList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, MAX_ITEMS);
}

function finite(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

// Parse + sanitize query params into a Filters object. Allow-lists projects and
// events against the known sets; clamps roads to 40 chars; keeps only finite
// from/to. Everything else is dropped silently.
export function parseFilters(sp: URLSearchParams): Filters {
  const projects = splitList(sp.get("projects")).filter((v) => PROJECT_NAMES.has(v));
  const events = splitList(sp.get("events")).filter((v) => EVENT_SLUGS.has(v));
  const roads = splitList(sp.get("roads")).map((v) => v.slice(0, ROAD_MAX_LEN));
  const from = finite(sp.get("from"));
  const to = finite(sp.get("to"));

  const f: Filters = {};
  if (projects.length) f.projects = projects;
  if (events.length) f.events = events;
  if (roads.length) f.roads = roads;
  if (from !== undefined) f.from = from;
  if (to !== undefined) f.to = to;
  return f;
}

export type BuiltWhere = { sql: string; params: unknown[]; text: string };

function inClause(col: string, vals: string[], params: unknown[]): string {
  for (const v of vals) params.push(v);
  return `${col} IN (${vals.map(() => "?").join(",")})`;
}

const esc = (s: string) => s.replace(/'/g, "''");

function fmtTs(ms: number): string {
  // Human-readable date for the text summary (display only, never SQL).
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Build a parameterized WHERE clause. Aliases: p=position, e=event, o=observation.
// Order: project IN, road_name IN, event_type IN, then ts >=, ts <=.
// Returns sql="" + text="(전체)" when no filters are active.
export function buildWhere(f: Filters): BuiltWhere {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const textParts: string[] = [];

  if (f.projects?.length) {
    clauses.push(inClause("p.project", f.projects, params));
    textParts.push(`수집처 ${f.projects.map((v) => `'${esc(v)}'`).join(", ")}`);
  }
  if (f.roads?.length) {
    clauses.push(inClause("p.road_name", f.roads, params));
    textParts.push(`도로 ${f.roads.map((v) => `'${esc(v)}'`).join(", ")}`);
  }
  if (f.events?.length) {
    clauses.push(inClause("e.event_type", f.events, params));
    textParts.push(`상황 ${f.events.map((v) => `'${esc(v)}'`).join(", ")}`);
  }
  if (f.from !== undefined) {
    clauses.push("p.ts >= ?");
    params.push(f.from);
    textParts.push(`${fmtTs(f.from)} 이후`);
  }
  if (f.to !== undefined) {
    clauses.push("p.ts <= ?");
    params.push(f.to);
    textParts.push(`${fmtTs(f.to)} 이전`);
  }

  const sql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const text = textParts.length ? textParts.join(" · ") : "(전체)";
  return { sql, params, text };
}
