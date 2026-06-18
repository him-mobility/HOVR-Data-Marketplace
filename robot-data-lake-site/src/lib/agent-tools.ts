// server-only, read-only: HOVI agent tools + Anthropic tool schemas.
//
// Customer-exposure hygiene: tool RESULTS are internal trace data that the API
// route forwards to the model only. The customer surface (AgentPanel) never
// renders raw tool output — it extracts "N건" counts and applied-filter chips.
// describe_schema's note must NOT reveal synthetic/internal/PRNG/infra facts.

import { all } from "./db";
import { buildWhere, type Filters } from "./query";
import { PROJECTS, EVENT_TYPES } from "./schema";

// --- filter normalization (events 한글 라벨/슬러그 → 슬러그) -------------------

const SLUG_BY_LABEL = new Map<string, string>(EVENT_TYPES.map((e) => [e.label, e.slug]));
const EVENT_SLUGS = new Set(EVENT_TYPES.map((e) => e.slug));
const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));

function asArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normEvent(v: string): string | null {
  if (EVENT_SLUGS.has(v)) return v;
  const bySlug = SLUG_BY_LABEL.get(v);
  if (bySlug) return bySlug;
  // tolerate trailing label noise like "포트홀(pothole)" → match either side
  const hit = EVENT_TYPES.find((e) => v.includes(e.slug) || v.includes(e.label));
  return hit ? hit.slug : null;
}

export type AgentFilter = Filters;

// Accepts a loose tool input ({events, projects, roads, from, to}) with Korean
// labels or slugs and returns a clean Filters object the dashboard can apply.
export function normalizeFilter(input: unknown): AgentFilter {
  const o = (input ?? {}) as Record<string, unknown>;

  const events = Array.from(
    new Set(asArray(o.events).map(normEvent).filter((s): s is string => !!s))
  );
  const projects = asArray(o.projects).filter((v) => PROJECT_NAMES.has(v));
  const roads = asArray(o.roads).map((v) => v.slice(0, 40));

  const f: AgentFilter = { events, projects, roads };

  const fromN = Number(o.from);
  if (Number.isFinite(fromN) && o.from != null && o.from !== "") f.from = fromN;
  const toN = Number(o.to);
  if (Number.isFinite(toN) && o.to != null && o.to !== "") f.to = toN;

  return f;
}

// --- tools -------------------------------------------------------------------

const RECORD_BASE = `FROM robot_position p
  JOIN event e ON e.position_idx = p.idx
  JOIN observation o ON o.position_idx = p.idx`;

// groupBy whitelist → column mapping. User text never becomes SQL.
const GROUP_COLS: Record<string, string> = {
  event: "e.event_type",
  project: "p.project",
  road: "p.road_name",
  day: "date(p.ts/1000,'unixepoch')",
  hour: "strftime('%H', p.ts/1000, 'unixepoch')",
  weather: "o.weather_condition",
};

export function describe_schema() {
  const events = EVENT_TYPES.map((e) => ({ slug: e.slug, label: e.label, count: e.count }));
  const projects = PROJECTS.map((p) => p.name);
  return {
    tables: ["robot_position", "observation", "event", "media"],
    events,
    projects,
    note:
      "전국 주요 도시(광주·수도권·부산·대구·대전·울산·세종)에서 수집. 4테이블이 position_idx로 연결.",
  };
}

export function search_records(input: unknown) {
  const f = normalizeFilter(input);
  const { sql, params, text } = buildWhere(f);

  const totalRow = all<{ c: number }>(`SELECT COUNT(*) c ${RECORD_BASE} ${sql}`, params);
  const count = totalRow[0]?.c ?? 0;

  const sample = all<Record<string, unknown>>(
    `SELECT p.idx, p.project, p.road_name, p.ts, p.lat, p.lng,
            e.event_type, o.weather_condition, o.object_type, o.object_count
     ${RECORD_BASE} ${sql}
     ORDER BY p.idx DESC LIMIT 5`,
    params
  );

  return { count, sample, resolvedWhere: text, filter: f };
}

export function aggregate(input: unknown) {
  const o = (input ?? {}) as Record<string, unknown>;
  const groupByRaw = String(o.groupBy ?? "event");
  const groupBy = groupByRaw in GROUP_COLS ? groupByRaw : "event";
  const col = GROUP_COLS[groupBy];

  const f = normalizeFilter(input);
  const { sql, params } = buildWhere(f);

  const rows = all<{ k: string; c: number }>(
    `SELECT ${col} k, COUNT(*) c
     ${RECORD_BASE} ${sql}
     GROUP BY ${col} ORDER BY c DESC LIMIT 30`,
    params
  );

  return { groupBy, groups: rows.length, rows, filter: f };
}

const WRITE_RE =
  /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace|truncate|vacuum|reindex|load_extension)\b/i;

export function run_readonly_sql(input: unknown) {
  const o = (input ?? {}) as Record<string, unknown>;
  let q = String(o.sql ?? "").trim();

  // strip comments first so they can't hide write keywords
  q = q.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").trim();
  // single statement only
  q = q.replace(/;+\s*$/g, "").trim();

  if (q.includes(";")) throw new Error("단일 SELECT만 허용됩니다.");
  if (!/^(select|with)\b/i.test(q)) throw new Error("SELECT 전용입니다.");
  if (WRITE_RE.test(q)) throw new Error("읽기 전용 쿼리만 허용됩니다.");

  if (!/\blimit\b/i.test(q)) q = `${q} LIMIT 100`;

  const rows = all<Record<string, unknown>>(q);
  return { rows, count: rows.length };
}

export function focus_dashboard(input: unknown) {
  return { ok: true, filter: normalizeFilter(input) };
}

// --- Anthropic tool schemas --------------------------------------------------

export const TOOL_DEFS = [
  {
    name: "describe_schema",
    description:
      "데이터셋의 4테이블 요약, 이벤트 종류(슬러그/라벨/건수), 수집 프로젝트 목록을 반환합니다. 어떤 데이터가 있는지 먼저 파악할 때 사용하세요.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "search_records",
    description:
      "이벤트·수집처·도로·기간 조건으로 레코드를 검색해 건수와 샘플 5행을 반환합니다. 특정 조건의 데이터가 얼마나 있는지 셀 때 사용하세요. events는 한글 라벨 또는 슬러그를 받습니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        events: { type: "array", items: { type: "string" }, description: "이벤트 라벨/슬러그 목록" },
        projects: { type: "array", items: { type: "string" }, description: "수집 프로젝트명 목록" },
        roads: { type: "array", items: { type: "string" }, description: "도로명 목록" },
        from: { type: "number", description: "시작 시각(ms epoch)" },
        to: { type: "number", description: "종료 시각(ms epoch)" },
      },
    },
  },
  {
    name: "aggregate",
    description:
      "조건을 적용한 뒤 지정한 차원으로 그룹 집계(상위 30)를 반환합니다. 분포·비교·순위를 낼 때 사용하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        groupBy: {
          type: "string",
          enum: ["event", "project", "road", "day", "hour", "weather"],
          description: "그룹 기준 차원",
        },
        events: { type: "array", items: { type: "string" } },
        projects: { type: "array", items: { type: "string" } },
        roads: { type: "array", items: { type: "string" } },
        from: { type: "number" },
        to: { type: "number" },
      },
      required: ["groupBy"],
    },
  },
  {
    name: "run_readonly_sql",
    description:
      "위 도구로 표현하기 어려운 복잡한 질문에만 사용하는 읽기 전용 조회입니다. SELECT 전용이며 결과 행을 반환합니다.",
    input_schema: {
      type: "object" as const,
      properties: { sql: { type: "string", description: "단일 SELECT 문" } },
      required: ["sql"],
    },
  },
  {
    name: "focus_dashboard",
    description:
      "사용자가 특정 조건을 보고/필터링하려 할 때 지도·차트·표를 그 조건으로 동기화합니다. 조건을 적용해 보여줄 때 반드시 호출하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        events: { type: "array", items: { type: "string" } },
        projects: { type: "array", items: { type: "string" } },
        roads: { type: "array", items: { type: "string" } },
        from: { type: "number" },
        to: { type: "number" },
      },
    },
  },
];

// --- dispatch ----------------------------------------------------------------

export type ToolResult = { data: unknown; summary: string };

export function runTool(name: string, input: unknown): ToolResult {
  switch (name) {
    case "describe_schema": {
      const data = describe_schema();
      return { data, summary: `${data.tables.length}테이블·${data.events.length}이벤트` };
    }
    case "search_records": {
      const data = search_records(input);
      return { data, summary: `${data.count.toLocaleString("en-US")}건` };
    }
    case "aggregate": {
      const data = aggregate(input);
      return { data, summary: `${data.groupBy}별 ${data.groups}그룹` };
    }
    case "run_readonly_sql": {
      const data = run_readonly_sql(input);
      return { data, summary: `${data.count.toLocaleString("en-US")}행` };
    }
    case "focus_dashboard": {
      const data = focus_dashboard(input);
      return { data, summary: "대시보드 동기화" };
    }
    default:
      throw new Error(`알 수 없는 도구: ${name}`);
  }
}
