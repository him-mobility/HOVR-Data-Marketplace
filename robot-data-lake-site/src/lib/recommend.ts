// server-only: dataset recommendation engine for /search.
//
// Customer-exposure hygiene: this module runs only on the server (it imports the
// DB via ./query → ./db / better-sqlite3). NEVER import it from a client bundle.
// Region labels map to collection projects (REGION_PROJECTS, the schema SSOT) so
// an interested region actually narrows the recommendation, real count, and the
// /demo deeplink. No lat heuristics — region scoping is by project membership.
//
// Customer surfaces must not leak SQL, tool names, table/column names, synthetic
// data facts, PRNG/dev process, or infra. This file returns only customer-safe
// dataset descriptions; raw SQL stays internal.

import { all } from "./db";
import { EVENT_TYPES, REGION_PROJECTS } from "./schema";

// --- constants ---------------------------------------------------------------

export const EVENT_LABEL: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.slug, e.label])
);
export const EVENT_SLUGS = EVENT_TYPES.map((e) => e.slug);
export const WEATHERS = ["맑음", "비", "눈", "안개"] as const;
export const REGIONS = Object.keys(REGION_PROJECTS);

// Aggregation labelling: map each row's project → region label (no lat heuristic).
const REGION_CASE_SQL = `CASE ${Object.entries(REGION_PROJECTS)
  .map(
    ([region, projs]) =>
      `WHEN project IN (${projs.map((p) => `'${p}'`).join(",")}) THEN '${region}'`
  )
  .join(" ")} ELSE '기타' END`;

// --- types -------------------------------------------------------------------

export type RecFilters = {
  events?: string[];
  weather?: string[];
  projects?: string[];
  regions?: string[];
};

export type RecDataset = {
  name: string;
  description: string;
  tags: string[];
  domain: string;
  filters: RecFilters;
  reason: string;
  totalCount: number;
  demoQuery: string;
};

// --- live schema context (no hardcoding) -------------------------------------

export type SchemaContext = {
  total: number;
  events: { value: string; count: number }[];
  weather: { value: string; count: number }[];
  projects: { value: string; count: number }[];
  regions: { value: string; count: number }[];
};

export function buildSchemaContext(): SchemaContext {
  const total =
    all<{ c: number }>(`SELECT COUNT(*) c FROM robot_position`)[0]?.c ?? 0;

  const events = all<{ value: string; count: number }>(
    `SELECT event_type value, COUNT(*) count FROM event GROUP BY event_type ORDER BY count DESC`
  );
  const weather = all<{ value: string; count: number }>(
    `SELECT weather_condition value, COUNT(*) count FROM observation GROUP BY weather_condition ORDER BY count DESC`
  );
  const projects = all<{ value: string; count: number }>(
    `SELECT project value, COUNT(*) count FROM robot_position GROUP BY project ORDER BY count DESC`
  );
  const regions = all<{ value: string; count: number }>(
    `SELECT ${REGION_CASE_SQL} value, COUNT(*) count FROM robot_position GROUP BY value ORDER BY count DESC`
  );

  return { total, events, weather, projects, regions };
}

export function schemaContextToText(ctx: SchemaContext): string {
  const fmt = (rows: { value: string; count: number }[]) =>
    rows.map((r) => `${r.value}(${r.count.toLocaleString("en-US")})`).join(", ");
  const eventLine = ctx.events
    .map((r) => `${r.value}=${EVENT_LABEL[r.value] ?? r.value}(${r.count.toLocaleString("en-US")})`)
    .join(", ");
  return [
    `총 ${ctx.total.toLocaleString("en-US")}건.`,
    `이벤트(슬러그=라벨(건수)): ${eventLine}.`,
    `날씨: ${fmt(ctx.weather)}.`,
    `지역(라벨(건수)): ${fmt(ctx.regions)}.`,
    `수집처(project(건수)): ${fmt(ctx.projects)}.`,
  ].join("\n");
}

// --- real count (region → project mapping, no lat heuristic) ------------------

export function computeRealCount(f: RecFilters): number {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.events?.length) {
    where.push(`e.event_type IN (${f.events.map(() => "?").join(",")})`);
    params.push(...f.events);
  }
  if (f.weather?.length) {
    where.push(`o.weather_condition IN (${f.weather.map(() => "?").join(",")})`);
    params.push(...f.weather);
  }
  if (f.projects?.length) {
    where.push(`p.project IN (${f.projects.map(() => "?").join(",")})`);
    params.push(...f.projects);
  }
  if (f.regions?.length) {
    const projs = f.regions.flatMap((r) => REGION_PROJECTS[r] ?? []);
    if (projs.length) {
      where.push(`p.project IN (${projs.map(() => "?").join(",")})`);
      params.push(...projs);
    }
  }

  const base = `robot_position p
    JOIN event e ON e.position_idx = p.idx
    JOIN observation o ON o.position_idx = p.idx`;
  const sql = `SELECT COUNT(*) c FROM ${base}${
    where.length ? ` WHERE ${where.join(" AND ")}` : ""
  }`;
  return all<{ c: number }>(sql, params)[0]?.c ?? 0;
}

// --- finalize ----------------------------------------------------------------

const SLUG_SET = new Set(EVENT_SLUGS);
const WEATHER_SET = new Set(WEATHERS as readonly string[]);
const REGION_SET = new Set(REGIONS);

export function finalizeDataset(
  d: Omit<RecDataset, "totalCount" | "demoQuery"> & {
    totalCount?: number;
    demoQuery?: string;
  }
): RecDataset {
  const f0 = d.filters ?? {};
  const events = (f0.events ?? []).filter((e) => SLUG_SET.has(e));
  const weather = (f0.weather ?? []).filter((w) => WEATHER_SET.has(w));
  const projects = [...(f0.projects ?? [])]; // 그대로 통과
  const regions = (f0.regions ?? []).filter((r) => REGION_SET.has(r));

  const filters: RecFilters = { events, weather, projects, regions };

  // /demo 딥링크 qs에는 events·projects만 설정.
  const qs = new URLSearchParams();
  if (events.length) qs.set("events", events.join(","));
  if (projects.length) qs.set("projects", projects.join(","));

  return {
    name: d.name,
    description: d.description,
    tags: d.tags ?? [],
    domain: d.domain ?? "both",
    reason: d.reason ?? "",
    filters,
    totalCount: computeRealCount(filters),
    demoQuery: qs.toString(),
  };
}

// --- rule-based fallback (region reflected) ----------------------------------

type KeywordRule = {
  match: RegExp;
  name: string;
  desc: string;
  tags: string[];
  events: string[];
  weather: string[];
  reason: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    match: /보험|사고|손해|claim|리스크|위험/i,
    name: "사고·우천 리스크 데이터셋",
    desc: "사고 발생 지점과 우천 시 사고 패턴을 함께 담아 리스크 분석에 적합합니다.",
    tags: ["#사고", "#우천", "#리스크"],
    events: ["accident"],
    weather: ["비"],
    reason: "사고 이벤트와 우천 관측을 결합해 위험 구간·악천후 사고율을 파악할 수 있습니다.",
  },
  {
    match: /주차|단속|불법|정차|견인/i,
    name: "불법주정차·정차차량 데이터셋",
    desc: "불법주정차와 정차차량 이벤트를 시간·지점별로 제공합니다.",
    tags: ["#불법주정차", "#정차차량", "#단속"],
    events: ["illegal_parking", "stopped_vehicle"],
    weather: [],
    reason: "단속·주차 관리에 필요한 위반 다발 구간과 시간대를 짚어줍니다.",
  },
  {
    match: /공사|포트홀|도로|유지보수|보수|시설|파손/i,
    name: "포트홀·공사 도로 데이터셋",
    desc: "포트홀과 공사 구간 이벤트로 도로 유지보수 우선순위를 잡을 수 있습니다.",
    tags: ["#포트홀", "#공사", "#도로유지보수"],
    events: ["pothole", "construction"],
    weather: [],
    reason: "노면 파손과 공사 구간을 함께 보여 보수 우선순위 산정에 적합합니다.",
  },
  {
    match: /침수|재난|홍수|호우|방재|배수/i,
    name: "침수·우천 재난 데이터셋",
    desc: "침수 이벤트와 우천 관측을 결합해 상습 침수 구간을 식별합니다.",
    tags: ["#침수", "#우천", "#재난"],
    events: ["flood"],
    weather: ["비"],
    reason: "강우와 침수 발생을 함께 분석해 방재·배수 계획에 활용할 수 있습니다.",
  },
  {
    match: /상권|인파|유동|마케팅|혼잡|밀집|상업/i,
    name: "인파밀집·상권 데이터셋",
    desc: "인파밀집 이벤트로 시간대별 유동·혼잡 패턴을 제공합니다.",
    tags: ["#인파밀집", "#상권", "#유동인구"],
    events: ["crowd"],
    weather: [],
    reason: "혼잡·인파 발생 지점과 시간대를 통해 상권·마케팅 입지 분석에 적합합니다.",
  },
];

export function ruleBasedRecommend(
  input: { occupation: string; purposes: string[]; details?: string },
  opts?: { projects?: string[]; region?: string }
): RecDataset[] {
  const { occupation, purposes, details } = input;
  const haystack = [occupation, ...purposes, details ?? ""].join(" ");
  const matched = KEYWORD_RULES.filter((r) => r.match.test(haystack));
  const picked = (matched.length ? matched : KEYWORD_RULES.slice(0, 2)).slice(0, 3);

  const region = opts?.region;
  const projects = opts?.projects?.length ? opts.projects : undefined;

  return picked.map((r) =>
    finalizeDataset({
      name: region ? `${r.name} · ${region}` : r.name,
      description: region ? `${r.desc} (관심 지역: ${region})` : r.desc,
      tags: region ? [...r.tags, `#${region}`] : r.tags,
      domain: "both",
      filters: { events: r.events, weather: r.weather, projects },
      reason: r.reason,
    })
  );
}
