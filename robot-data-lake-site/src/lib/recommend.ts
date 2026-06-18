// Server-only. Recommendation engine for /search.
// Region selection is limited to data we actually hold (REGION_PROJECTS SSOT):
// region labels map to collection-site projects, and recommendations / counts /
// deep-links are constrained to those projects.
//
// CUSTOMER HYGIENE: this module runs server-side only and never surfaces SQL,
// tool names, table/column names, the synthetic nature of the data, PRNG, dev
// process, or infra to the customer. The LLM system prompt (route.ts) and the
// customer-facing fields here (name/description/tags/reason) stay clean.
import { all } from "./db";
import { EVENT_TYPES, REGION_PROJECTS } from "./schema";

// ── Constants derived from the schema SSOT ──
export const EVENT_LABEL: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.slug, e.label])
);
export const EVENT_SLUGS: string[] = EVENT_TYPES.map((e) => e.slug);
export const WEATHERS = ["맑음", "비", "눈", "안개"] as const;
export const REGIONS: string[] = Object.keys(REGION_PROJECTS);

// Region labelling for live aggregates — project-based, NO lat heuristics.
const REGION_CASE_SQL = `CASE ${Object.entries(REGION_PROJECTS)
  .map(([region, projs]) => `WHEN project IN (${projs.map((p) => `'${p}'`).join(",")}) THEN '${region}'`)
  .join(" ")} ELSE '기타' END`;

// ── Types ──
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

export type SchemaContext = {
  total: number;
  events: { value: string; label: string; count: number }[];
  weather: { value: string; count: number }[];
  projects: { value: string; count: number }[];
  regions: { value: string; count: number }[];
};

// ── Live aggregates (no hardcoded numbers) ──
export function buildSchemaContext(): SchemaContext {
  const total =
    all<{ c: number }>(`SELECT COUNT(*) c FROM robot_position`)[0]?.c ?? 0;

  const events = all<{ value: string; count: number }>(
    `SELECT event_type value, COUNT(*) count FROM event GROUP BY value ORDER BY count DESC`
  ).map((r) => ({ value: r.value, label: EVENT_LABEL[r.value] ?? r.value, count: r.count }));

  const weather = all<{ value: string; count: number }>(
    `SELECT weather_condition value, COUNT(*) count FROM observation GROUP BY value ORDER BY count DESC`
  );

  const projects = all<{ value: string; count: number }>(
    `SELECT project value, COUNT(*) count FROM robot_position GROUP BY value ORDER BY count DESC`
  );

  const regions = all<{ value: string; count: number }>(
    `SELECT ${REGION_CASE_SQL} value, COUNT(*) count FROM robot_position GROUP BY value ORDER BY count DESC`
  );

  return { total, events, weather, projects, regions };
}

export function schemaContextToText(ctx: SchemaContext): string {
  const ev = ctx.events.map((e) => `${e.value}(${e.label}) ${e.count.toLocaleString("en-US")}건`).join(", ");
  const we = ctx.weather.map((w) => `${w.value} ${w.count.toLocaleString("en-US")}건`).join(", ");
  const pr = ctx.projects.map((p) => `${p.value} ${p.count.toLocaleString("en-US")}건`).join(", ");
  const rg = ctx.regions.map((r) => `${r.value} ${r.count.toLocaleString("en-US")}건`).join(", ");
  return [
    `전체 보유 데이터: 약 ${ctx.total.toLocaleString("en-US")}건`,
    `이벤트(슬러그/이름/건수): ${ev}`,
    `날씨(weather): ${we}`,
    `수집처(projects): ${pr}`,
    `지역(regions): ${rg}`,
  ].join("\n");
}

// ── Real count for a filter set ──
// events/weather/projects → IN. regions are limited via the project mapping
// (NO lat heuristics): each region label expands to its project list.
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

  const sql = `SELECT COUNT(*) c
    FROM robot_position p
    JOIN event e ON e.position_idx = p.idx
    JOIN observation o ON o.position_idx = p.idx
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;

  return all<{ c: number }>(sql, params)[0]?.c ?? 0;
}

// ── Finalize a candidate dataset: validate filter values, compute count, build deep-link ──
export function finalizeDataset(d: Omit<RecDataset, "totalCount" | "demoQuery">): RecDataset {
  const events = (d.filters.events ?? []).filter((s) => EVENT_SLUGS.includes(s));
  const weather = (d.filters.weather ?? []).filter((w) => (WEATHERS as readonly string[]).includes(w));
  const projects = d.filters.projects ?? []; // pass projects through as-is
  const regions = (d.filters.regions ?? []).filter((r) => REGIONS.includes(r));

  const filters: RecFilters = {};
  if (events.length) filters.events = events;
  if (weather.length) filters.weather = weather;
  if (projects.length) filters.projects = projects;
  if (regions.length) filters.regions = regions;

  // /demo deep-link: only events + projects (the keys /demo understands).
  const qs = new URLSearchParams();
  if (events.length) qs.set("events", events.join(","));
  if (projects.length) qs.set("projects", projects.join(","));

  return {
    name: d.name,
    description: d.description,
    tags: d.tags,
    domain: d.domain,
    filters,
    reason: d.reason,
    totalCount: computeRealCount(filters),
    demoQuery: qs.toString(),
  };
}

// ── Rule-based fallback (no API key) — reflects region/projects ──
type KeywordRule = {
  match: RegExp;
  name: string;
  desc: string;
  tags: string[];
  events: string[];
  weather?: string[];
  reason: string;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    match: /보험|사고|insurance|accident|claim/i,
    name: "사고·우천 위험 데이터셋",
    desc: "사고 발생 지점과 우천 상황을 연결해, 위험 구간과 기상 영향을 함께 살펴볼 수 있는 데이터.",
    tags: ["#사고", "#우천", "#위험구간"],
    events: ["accident"],
    weather: ["비"],
    reason: "보험·사고 분석에는 사고 발생 지점과 악천후 상황의 결합이 핵심입니다.",
  },
  {
    match: /주차|단속|parking|enforce/i,
    name: "불법주정차·정차차량 데이터셋",
    desc: "불법주정차와 정차차량 이벤트를 모아, 상습 구간과 단속 우선순위를 파악할 수 있는 데이터.",
    tags: ["#불법주정차", "#정차차량", "#단속"],
    events: ["illegal_parking", "stopped_vehicle"],
    reason: "주차·단속 업무에는 불법주정차와 정차차량 분포가 가장 직접적인 근거가 됩니다.",
  },
  {
    match: /공사|포트홀|도로|유지보수|construction|pothole|road|maintenance/i,
    name: "포트홀·공사 도로상태 데이터셋",
    desc: "포트홀과 공사 이벤트를 함께 제공해, 도로 보수 우선순위와 위험 구간을 가늠할 수 있는 데이터.",
    tags: ["#포트홀", "#공사", "#도로유지보수"],
    events: ["pothole", "construction"],
    reason: "도로 유지보수에는 포트홀과 공사 구간을 함께 보는 것이 의사결정에 효과적입니다.",
  },
  {
    match: /침수|재난|홍수|flood|disaster/i,
    name: "침수·우천 재난대응 데이터셋",
    desc: "침수 발생 지점과 우천 상황을 연결해, 취약 구간과 재난 대응 우선순위를 파악할 수 있는 데이터.",
    tags: ["#침수", "#우천", "#재난대응"],
    events: ["flood"],
    weather: ["비"],
    reason: "침수·재난 대응에는 침수 지점과 강우 상황의 결합 분석이 핵심입니다.",
  },
  {
    match: /상권|인파|유동인구|마케팅|commercial|crowd|footfall|marketing/i,
    name: "인파밀집 상권 데이터셋",
    desc: "인파밀집 이벤트를 모아, 유동 인구가 많은 구간과 시간대를 파악할 수 있는 데이터.",
    tags: ["#인파밀집", "#상권", "#유동인구"],
    events: ["crowd"],
    reason: "상권·마케팅 분석에는 인파가 밀집하는 구간과 시점 데이터가 직접적인 근거가 됩니다.",
  },
];

export function ruleBasedRecommend(
  input: { occupation: string; purposes: string[]; details?: string },
  opts?: { projects?: string[]; region?: string }
): RecDataset[] {
  const haystack = [input.occupation, ...(input.purposes ?? []), input.details ?? ""].join(" ");
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
