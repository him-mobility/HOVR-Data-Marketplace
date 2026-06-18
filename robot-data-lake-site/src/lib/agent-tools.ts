// Server-only. Read-only tool implementations for the HOVI agent.
// Customer hygiene: the strings exposed by these tools (especially the
// describe_schema note) must NOT mention synthetic data, internal table/column
// names beyond the customer-facing 4-table framing, PRNG/dev/infra, etc.
// The real defense against writes is the read-only connection in db.ts;
// the SQL guard here is a second line.
// (Imports node-backed db.ts, so this module is server-only by construction.)
import { all, get } from "./db";
import { buildWhere, type Filters } from "./query";
import {
  EVENT_TYPES,
  PROJECTS,
  REGION_PROJECTS,
} from "./schema";

// ── Lookups ──────────────────────────────────────────────────────────────────
const EVENT_SLUGS = new Set(EVENT_TYPES.map((e) => e.slug));
const PROJECT_NAMES = new Set(PROJECTS.map((p) => p.name));

// Korean label / slug → canonical slug (e.g. "불법주정차" or "illegal_parking").
const LABEL_TO_SLUG: Record<string, string> = {};
for (const e of EVENT_TYPES) {
  LABEL_TO_SLUG[e.slug] = e.slug;
  LABEL_TO_SLUG[e.label] = e.slug;
}
// A few common synonyms customers might type.
const EVENT_SYNONYMS: Record<string, string> = {
  주정차: "illegal_parking",
  불법주차: "illegal_parking",
  포트홀: "pothole",
  도로파임: "pothole",
  정차: "stopped_vehicle",
  정차차량: "stopped_vehicle",
  공사: "construction",
  공사현장: "construction",
  인파: "crowd",
  인파밀집: "crowd",
  밀집: "crowd",
  침수: "flood",
  홍수: "flood",
  사고: "accident",
  교통사고: "accident",
};

// Region label → project[] (e.g. "부산" → ["busan"], "광주" → 4 projects).
// Region labels accumulated from the SSOT map plus a couple of aliases.
const REGION_TO_PROJECTS: Record<string, readonly string[]> = {
  ...REGION_PROJECTS,
  수도권: REGION_PROJECTS["수도권"],
  서울: REGION_PROJECTS["수도권"],
  경기: REGION_PROJECTS["수도권"],
  인천: REGION_PROJECTS["수도권"],
};

// ── normalizeFilter ───────────────────────────────────────────────────────────
// Turns a loose tool input into a clean Filters object. Accepts:
//  - events: slugs OR Korean labels OR common synonyms
//  - projects: project names OR Korean region labels (광주/부산/수도권/…)
//  - roads: free strings (clamped)
//  - from/to: epoch ms (finite numbers only)
type RawFilter = {
  events?: unknown;
  projects?: unknown;
  roads?: unknown;
  from?: unknown;
  to?: unknown;
};

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function finite(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

const uniq = (arr: string[]) => Array.from(new Set(arr));

export function normalizeFilter(input: RawFilter | null | undefined): Filters {
  const f: Filters = {};
  if (!input || typeof input !== "object") return f;

  // events: map label/synonym → slug, drop anything unknown.
  const events = uniq(
    asStringArray(input.events)
      .map((raw) => {
        const t = raw.trim();
        return LABEL_TO_SLUG[t] ?? EVENT_SYNONYMS[t] ?? (EVENT_SLUGS.has(t) ? t : "");
      })
      .filter((s) => s && EVENT_SLUGS.has(s))
  );
  if (events.length) f.events = events;

  // projects: accept project names directly, expand region labels.
  const projects: string[] = [];
  for (const raw of asStringArray(input.projects)) {
    const t = raw.trim();
    if (PROJECT_NAMES.has(t)) {
      projects.push(t);
    } else if (REGION_TO_PROJECTS[t]) {
      for (const p of REGION_TO_PROJECTS[t]) projects.push(p);
    }
  }
  const cleanProjects = uniq(projects).filter((p) => PROJECT_NAMES.has(p));
  if (cleanProjects.length) f.projects = cleanProjects;

  // roads: free text, clamp length, cap count.
  const roads = uniq(asStringArray(input.roads).map((r) => r.slice(0, 40))).slice(0, 50);
  if (roads.length) f.roads = roads;

  const from = finite(input.from);
  const to = finite(input.to);
  if (from !== undefined) f.from = from;
  if (to !== undefined) f.to = to;

  return f;
}

// Number formatter for summaries ("29,841건").
const nf = (n: number) => n.toLocaleString("en-US");

// ── Tool 1: describe_schema ────────────────────────────────────────────────────
// Customer-safe overview. NOTE deliberately avoids synthetic/internal wording.
const SCHEMA_NOTE =
  "전국 주요 도시(광주·수도권·부산·대구·대전·울산·세종)에서 수집. 4테이블이 position_idx로 연결.";

export function describe_schema() {
  const events = EVENT_TYPES.map((e) => ({ slug: e.slug, label: e.label, count: e.count }));
  const projects = PROJECTS.map((p) => p.name);
  const data = {
    tables: [
      { name: "robot_position", desc: "위치·도로·이동 정보 (기준 테이블)" },
      { name: "observation", desc: "도로·교통·날씨 등 현장 관측" },
      { name: "event", desc: "도로 이벤트 7종" },
      { name: "media", desc: "현장 사진·영상" },
    ],
    events,
    projects,
    note: SCHEMA_NOTE,
  };
  return { data, summary: "4테이블 요약" };
}

// Shared join base for record-level queries.
const RECORD_BASE = (whereSql: string) =>
  `FROM robot_position p JOIN event e ON e.position_idx=p.idx JOIN observation o ON o.position_idx=p.idx ${whereSql}`;

// ── Tool 2: search_records ──────────────────────────────────────────────────────
export function search_records(input: RawFilter) {
  const f = normalizeFilter(input);
  const where = buildWhere(f);
  const base = RECORD_BASE(where.sql);

  const countRow = get<{ c: number }>(`SELECT COUNT(*) c ${base}`, where.params);
  const count = countRow?.c ?? 0;

  const sample = all<Record<string, unknown>>(
    `SELECT p.idx, p.project, p.road_name, p.ts, p.lat, p.lng,
            e.event_type, o.weather_condition, o.traffic_density, o.object_type, o.object_count
       ${base}
      ORDER BY p.idx DESC
      LIMIT 5`,
    where.params
  );

  return {
    data: { count, sample, resolvedWhere: where.text, filter: f },
    summary: `${nf(count)}건`,
  };
}

// ── Tool 3: aggregate ────────────────────────────────────────────────────────────
// groupBy is a strict whitelist mapped to a column expression. User-supplied SQL
// is never accepted.
const GROUP_BY: Record<string, { col: string; alias: string }> = {
  event: { col: "e.event_type", alias: "event" },
  project: { col: "p.project", alias: "project" },
  road: { col: "p.road_name", alias: "road" },
  day: { col: "date(p.ts/1000,'unixepoch')", alias: "day" },
  hour: { col: "strftime('%H', p.ts/1000, 'unixepoch')", alias: "hour" },
  weather: { col: "o.weather_condition", alias: "weather" },
};

export function aggregate(input: RawFilter & { groupBy?: unknown }) {
  const key = typeof input?.groupBy === "string" ? input.groupBy.trim() : "";
  const g = GROUP_BY[key];
  if (!g) {
    return {
      data: { error: "지원하지 않는 집계 기준입니다.", allowed: Object.keys(GROUP_BY) },
      summary: "집계 불가",
    };
  }
  const f = normalizeFilter(input);
  const where = buildWhere(f);
  const base = RECORD_BASE(where.sql);

  const rows = all<{ k: string | null; c: number }>(
    `SELECT ${g.col} k, COUNT(*) c ${base} GROUP BY ${g.col} ORDER BY c DESC LIMIT 30`,
    where.params
  );
  const groups = rows.map((r) => ({ [g.alias]: r.k, count: r.c }));

  return {
    data: { groupBy: g.alias, groups, resolvedWhere: where.text },
    summary: `${g.alias}별 ${groups.length}그룹`,
  };
}

// ── Tool 4: run_readonly_sql ───────────────────────────────────────────────────
// Fallback for queries the structured tools can't express. The connection is
// read-only (db.ts: readonly + query_only), so this guard is defense-in-depth.
const WRITE_DDL =
  /\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace|truncate|vacuum|reindex|load_extension)\b/i;

function stripComments(sql: string): string {
  // Remove block comments, then line comments.
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();
}

export function run_readonly_sql(input: { sql?: unknown }) {
  const raw = typeof input?.sql === "string" ? input.sql : "";
  let sql = stripComments(raw).trim();

  if (!sql) {
    return { data: { error: "쿼리가 비어 있습니다." }, summary: "거부됨" };
  }
  // Only a single SELECT/WITH statement.
  if (!/^(select|with)\b/i.test(sql)) {
    return { data: { error: "조회 전용 쿼리만 허용됩니다." }, summary: "거부됨" };
  }
  if (sql.includes(";")) {
    return { data: { error: "단일 조회만 허용됩니다." }, summary: "거부됨" };
  }
  if (WRITE_DDL.test(sql)) {
    return { data: { error: "조회 전용 쿼리만 허용됩니다." }, summary: "거부됨" };
  }
  // Append LIMIT 100 if the query has no LIMIT clause.
  if (!/\blimit\b/i.test(sql)) {
    sql = `${sql} LIMIT 100`;
  }

  try {
    const rows = all<Record<string, unknown>>(sql, []);
    return { data: { rows, count: rows.length }, summary: `${nf(rows.length)}행` };
  } catch {
    // Never leak the SQL error / internals to the model.
    return { data: { error: "쿼리를 실행할 수 없습니다." }, summary: "오류" };
  }
}

// ── Tool 5: focus_dashboard ─────────────────────────────────────────────────────
// Emits a dashboard-sync signal. The route captures filter and returns it to the
// client as applyFilter.
export function focus_dashboard(input: RawFilter) {
  const filter = normalizeFilter(input);
  return { data: { ok: true, filter }, summary: "대시보드 동기화" };
}

// ── Anthropic tool definitions ──────────────────────────────────────────────────
const EVENT_ENUM = EVENT_TYPES.map((e) => e.slug);
const PROJECT_ENUM = PROJECTS.map((p) => p.name);

export const TOOL_DEFS = [
  {
    name: "describe_schema",
    description:
      "데이터셋 구성을 확인합니다. 4종 데이터(위치·관측·이벤트·미디어) 요약과 이벤트 종류(슬러그·라벨·건수), 수집처 목록을 반환합니다. 어떤 조건이 가능한지 먼저 파악할 때 사용하세요.",
    input_schema: { type: "object", properties: {} as Record<string, unknown> },
  },
  {
    name: "search_records",
    description:
      "조건에 맞는 데이터의 건수와 표본 몇 건을 조회합니다. events는 이벤트 슬러그나 한글 명칭, projects는 수집처 이름이나 지역명(부산·광주·수도권 등)을 받습니다.",
    input_schema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: { type: "string" },
          description: `이벤트 종류. 슬러그(${EVENT_ENUM.join(", ")}) 또는 한글 명칭.`,
        },
        projects: {
          type: "array",
          items: { type: "string" },
          description: `수집처(${PROJECT_ENUM.join(", ")}) 또는 지역명(부산·광주·수도권 등).`,
        },
        roads: { type: "array", items: { type: "string" }, description: "도로명." },
        from: { type: "number", description: "시작 시각(epoch ms)." },
        to: { type: "number", description: "종료 시각(epoch ms)." },
      },
    },
  },
  {
    name: "aggregate",
    description:
      "조건에 맞는 데이터를 기준별로 그룹 집계합니다(상위 30). groupBy는 event·project·road·day·hour·weather 중 하나여야 합니다.",
    input_schema: {
      type: "object",
      properties: {
        groupBy: {
          type: "string",
          enum: ["event", "project", "road", "day", "hour", "weather"],
          description: "집계 기준.",
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
      "구조화된 도구로 표현하기 어려운 조회를 SELECT 전용 쿼리로 직접 수행합니다. 조회 외 명령은 거부됩니다.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "단일 SELECT 또는 WITH 쿼리." },
      },
      required: ["sql"],
    },
  },
  {
    name: "focus_dashboard",
    description:
      "사용자가 특정 조건을 보고 싶어 할 때 지도·차트·표를 그 조건으로 맞춥니다. 조건은 search_records와 같은 형식.",
    input_schema: {
      type: "object",
      properties: {
        events: { type: "array", items: { type: "string" } },
        projects: { type: "array", items: { type: "string" } },
        roads: { type: "array", items: { type: "string" } },
        from: { type: "number" },
        to: { type: "number" },
      },
    },
  },
] as const;

// ── Dispatcher ──────────────────────────────────────────────────────────────────
export type ToolResult = { data: unknown; summary: string };

export function runTool(name: string, input: Record<string, unknown>): ToolResult {
  switch (name) {
    case "describe_schema":
      return describe_schema();
    case "search_records":
      return search_records(input);
    case "aggregate":
      return aggregate(input);
    case "run_readonly_sql":
      return run_readonly_sql(input);
    case "focus_dashboard":
      return focus_dashboard(input);
    default:
      return { data: { error: "알 수 없는 도구입니다." }, summary: "오류" };
  }
}
