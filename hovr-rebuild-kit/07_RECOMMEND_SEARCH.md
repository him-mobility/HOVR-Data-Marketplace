# 07 · RECOMMEND & SEARCH — `/search` 폼(지역=보유데이터) · `/api/recommend`(지역 한정)

> 목표: 직업·활용목적·**관심지역(보유 데이터 기반)**·관심항목·세부내용을 받아 AI가 보유 데이터셋을 추천. 관심지역 선택 시 추천·건수·`/demo` 딥링크가 그 지역으로 **실제 한정**된다. 키 없으면 규칙 기반 폴백.

## A. `src/lib/recommend.ts` (서버 전용)

- import `{ EVENT_TYPES, REGION_PROJECTS } from "./schema"` (REGION_PROJECTS = 지역→project SSOT, 02단계).
- 상수: `EVENT_LABEL`(slug→label), `EVENT_SLUGS`, `WEATHERS=["맑음","비","눈","안개"]`, `REGIONS = Object.keys(REGION_PROJECTS)`.
- `REGION_CASE_SQL` (집계 라벨링용, lat 휴리스틱 금지):
  ```ts
  const REGION_CASE_SQL = `CASE ${Object.entries(REGION_PROJECTS)
    .map(([region,projs]) => `WHEN project IN (${projs.map(p=>`'${p}'`).join(",")}) THEN '${region}'`)
    .join(" ")} ELSE '기타' END`;
  ```
- `RecFilters = { events?, weather?, projects?, regions?: string[] }`. `RecDataset = { name, description, tags[], domain, filters, reason, totalCount, demoQuery }`.
- `buildSchemaContext()`: 실시간 집계(하드코딩 X) — total, events(GROUP BY event_type), weather, projects, **regions = `SELECT ${REGION_CASE_SQL} value, COUNT(*) count FROM robot_position GROUP BY value ORDER BY count DESC`** (부산·대구 등 정확 라벨링). `schemaContextToText(ctx)`로 LLM용 텍스트화.
- `computeRealCount(f)`: events/weather/projects는 `IN`. **regions는 project 매핑으로 한정**(lat 휴리스틱 제거):
  ```ts
  if (f.regions?.length) {
    const projs = f.regions.flatMap(r => REGION_PROJECTS[r] ?? []);
    if (projs.length) { where.push(`p.project IN (${projs.map(()=>"?").join(",")})`); params.push(...projs); }
  }
  ```
  base = `robot_position p JOIN event e … JOIN observation o …`.
- `finalizeDataset(d)`: events는 슬러그 검증, weather는 WEATHERS 검증, **projects는 그대로 통과**, regions는 REGIONS 검증. `/demo` 딥링크 qs에는 `events`·`projects`만 설정. `totalCount=computeRealCount(f)`, `demoQuery=qs.toString()`.
- `ruleBasedRecommend(input, opts?)` — **지역 반영**:
  ```ts
  export function ruleBasedRecommend(input:{occupation;purposes;details?}, opts?:{projects?:string[]; region?:string}) {
    const matched = KEYWORD_RULES.filter(r => r.match.test([occupation,...purposes,details].join(" ")));
    const picked = (matched.length?matched:KEYWORD_RULES.slice(0,2)).slice(0,3);
    const region = opts?.region, projects = opts?.projects?.length ? opts.projects : undefined;
    return picked.map(r => finalizeDataset({
      name: region ? `${r.name} · ${region}` : r.name,
      description: region ? `${r.desc} (관심 지역: ${region})` : r.desc,
      tags: region ? [...r.tags, `#${region}`] : r.tags,
      domain:"both", filters:{ events:r.events, weather:r.weather, projects }, reason:r.reason,
    }));
  }
  ```
  `KEYWORD_RULES`: 보험/사고→accident+우천, 주차/단속→illegal_parking+stopped_vehicle, 공사/포트홀→pothole+construction, 침수/재난→flood+비, 상권/인파→crowd.

## B. `src/app/api/recommend/route.ts`

`runtime="nodejs"`, `dynamic="force-dynamic"`. `MODEL = process.env.RECOMMEND_MODEL || "claude-haiku-4-5-20251001"`(빠른 응답).
- body `{occupation, purposes[], details?, region?, projects?}`. occupation+purposes 없으면 400(`INPUT_REQUIRED`). `rateLimit("rec:"+clientKey)` 429.
  ```ts
  const region = body.region?.trim() || undefined;
  const projects = Array.isArray(body.projects) && body.projects.length ? body.projects.filter(p=>typeof p==="string") : undefined;
  ```
- **키 없으면** `{ datasets: ruleBasedRecommend({occupation,purposes,details:body.details}, {projects, region}), aiPowered:false }`.
- 키 있으면 `ctx=schemaContextToText(buildSchemaContext())` + 사용자 정보 userMessage(아래) → `messages.create({model:MODEL, max_tokens:3000, system:SYSTEM, messages})` → JSON 파싱(`/\{[\s\S]*\}/`). **관심지역 지정 시 각 dataset의 filters.projects를 강제 주입** 후 finalize:
  ```ts
  const datasets = parsed.datasets.slice(0,4)
    .map(d => finalizeDataset(projects?.length ? {...d, filters:{...d.filters, projects}} : d));
  return { datasets, aiPowered:true };
  ```
  실패 시 `ruleBasedRecommend(..., {projects, region})` 폴백.
- userMessage에 지역 줄 포함:
  ```
  - 관심 지역: {region ?? "전체"}{projects?.length ? ` (수집처 ${projects.join(", ")}로 한정 — 추천 데이터의 filters.projects에 반드시 이 수집처들을 포함)` : ""}
  ```
- SYSTEM: HOVR 추천 전문가. filters 키(events 슬러그/weather/projects/regions), 실제 존재값만 사용, 0건 금지, 2~4개, **JSON만** 출력.

## C. `src/app/search/page.tsx` (`"use client"`)

- `REGION_PROJECTS`는 **반드시 `@/lib/schema`에서** import(server 전용 recommend.ts를 import하면 better-sqlite3가 클라 번들로 들어가 빌드 실패). 추천 후 지도 페이지로 이동하므로 클라 라우팅 수단(예: `next/navigation`의 `useRouter`)을 사용.
- 상수: `OCCUPATIONS`(보험·금융/물류·모빌리티/도로·시설 관리/부동산·도시계획/마케팅·상권/공공·행정/연구·학계/자율주행·로보틱스/통신·인프라/기타), `PURPOSES`(9개), **`REGIONS = ["전체", ...Object.keys(REGION_PROJECTS)]`**(=전체·광주·수도권·부산·대구·대전·울산·세종 — **보유 데이터 기반**), `INTERESTS = ["불법주정차","포트홀","정차차량","공사","인파밀집","침수","사고"]`.
- **레이아웃: 전체 화면 단일 컬럼.** 맨 위에 다크 navy 히어로(`AI 추천` + "비즈니스에 맞는 데이터, AI가 직접 찾아드립니다")를 두고, 그 아래에 01~05 폼 5섹션을 화면 가로 폭 전체를 쓰는 하나의 컬럼으로(읽기 좋은 폭으로 가운데 정렬) 위에서 아래로 차례로 쌓는다. 폼과 나란히 놓이는 별도의 결과/미리보기 영역은 만들지 않는다 — 이 페이지에는 폼만 존재한다.
- 폼 5섹션: 01 직업(칩+직접입력) · 02 활용목적(복수) · **03 관심 지역(단일, REGIONS)** · 04 관심 항목(복수, INTERESTS) · 05 세부 내용(textarea). 맨 아래에 제출 버튼 하나(`AI 추천 받기 →`, 로딩 중에는 "가장 맞는 데이터를 찾는 중…" 류 문구).
- submit: 선택값을 모아 `/api/recommend`로 POST한다. 지역·관심항목을 합쳐 `details` 문자열로, 지역이 "전체"가 아니면 해당 지역의 `REGION_PROJECTS[region]`을 `projects` 배열로 전달:
  ```ts
  const extra = [region!=="전체"?`관심 지역: ${region}`:"", interests.length?`관심 항목: ${interests.join(", ")}`:""].filter(Boolean).join(" / ");
  const fullDetails = [details.trim(), extra].filter(Boolean).join(" / ");
  const selectedProjects = region!=="전체" ? [...(REGION_PROJECTS[region] ?? [])] : [];
  ```
- **결과 처리: 결과를 이 페이지에 표시하지 않고, 가장 맞는 데이터셋 하나로 지도 페이지로 곧장 이동한다.** 응답 `datasets`는 적합도 순으로 정렬되어 오므로 **첫 번째(=가장 적합한) 데이터셋만** 사용하고, 그 `demoQuery`를 붙여 `/demo`(지도에서 살펴보기)로 라우팅한다(예: `/demo?{demoQuery}`). 추천을 화면에 나열하지 않으므로 결과 카드 UI는 만들지 않으며, `aiPowered`·`reason`·`totalCount` 같은 부가 정보도 화면에 표시하지 않는다. 페이지가 가져야 할 상태는 로딩과 에러뿐이고(추천이 성공하면 곧바로 다른 페이지로 떠나므로 로딩 표시는 그대로 둔다), 응답에 데이터셋이 하나도 없으면 "조건을 바꿔 다시 시도해 주세요" 같은 에러 메시지를 보여준다.

## D. 검증 포인트

- 지역=부산 선택 + "도로 유지보수" → `AI 추천 받기` 클릭 시 가장 맞는 데이터셋 1개로 **바로 `/demo`로 이동**, 딥링크가 부산 한정(`/demo?events=pothole&projects=busan`)이라 지도가 부산만 표시. 전국(미지정) 대비 정확히 좁혀짐.
- 키 없는 환경 → 규칙 폴백도 첫 번째(최적) 데이터셋의 projects가 지역으로 반영되어 딥링크가 좁혀짐.
