// server-only: shared filter parsing + WHERE building for the demo data APIs.
import { PROJECTS, EVENT_TYPES } from "./schema";

export type Filters = {
  projects?: string[];
  events?: string[];
  roads?: string[];
  from?: number;
  to?: number;
};

const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));
const EVENT_SLUGS = new Set(EVENT_TYPES.map((e) => e.slug));

function splitList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 50);
}

export function parseFilters(sp: URLSearchParams): Filters {
  const projects = splitList(sp.get("projects")).filter((v) => PROJECT_NAMES.has(v));
  const events = splitList(sp.get("events")).filter((v) => EVENT_SLUGS.has(v));
  const roads = splitList(sp.get("roads")).map((v) => v.slice(0, 40));

  const f: Filters = { projects, events, roads };

  const fromN = Number(sp.get("from"));
  if (Number.isFinite(fromN) && sp.get("from")) f.from = fromN;
  const toN = Number(sp.get("to"));
  if (Number.isFinite(toN) && sp.get("to")) f.to = toN;

  return f;
}

function esc(v: string): string {
  return v.replace(/'/g, "''");
}

export function buildWhere(f: Filters): { sql: string; params: unknown[]; text: string } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const textParts: string[] = [];

  if (f.projects && f.projects.length) {
    clauses.push(`p.project IN (${f.projects.map(() => "?").join(",")})`);
    params.push(...f.projects);
    textParts.push(`수집처 ${f.projects.map((v) => `'${esc(v)}'`).join(", ")}`);
  }
  if (f.roads && f.roads.length) {
    clauses.push(`p.road_name IN (${f.roads.map(() => "?").join(",")})`);
    params.push(...f.roads);
    textParts.push(`도로 ${f.roads.map((v) => `'${esc(v)}'`).join(", ")}`);
  }
  if (f.events && f.events.length) {
    clauses.push(`e.event_type IN (${f.events.map(() => "?").join(",")})`);
    params.push(...f.events);
    textParts.push(`이벤트 ${f.events.map((v) => `'${esc(v)}'`).join(", ")}`);
  }
  if (typeof f.from === "number") {
    clauses.push(`p.ts >= ?`);
    params.push(f.from);
    textParts.push(`시작 ${new Date(f.from).toISOString()}`);
  }
  if (typeof f.to === "number") {
    clauses.push(`p.ts <= ?`);
    params.push(f.to);
    textParts.push(`종료 ${new Date(f.to).toISOString()}`);
  }

  const sql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const text = textParts.length ? textParts.join(" · ") : "(전체)";
  return { sql, params, text };
}
