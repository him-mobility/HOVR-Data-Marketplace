# 04 · DEMO DASHBOARD — `/demo` 지도·차트·표·드로어·필터 + 데이터 API 5종

> 목표: 다크 "Live Operations Console" `/demo`. 좌측 메인 패널(지도/차트/표) + 우측 고정 HOVI 패널(05단계). 모든 데이터는 read-only SQLite에서. 모든 API: `export const runtime="nodejs"; export const dynamic="force-dynamic";`

## A. 공용 쿼리 (`src/lib/query.ts`)

- `Filters = { projects?, events?, roads?: string[]; from?, to?: number }` (from/to=epoch ms).
- `parseFilters(sp)`: `projects/events/roads` 콤마 분리(trim·빈값제거·최대 50). projects는 `PROJECTS` 이름, events는 `EVENT_TYPES` slug로 allow-list. roads는 각 40자 컷. from/to는 `Number()` 유한값만.
- `buildWhere(f) → {sql, params, text}`: 별칭 `p`=position·`e`=event·`o`=observation. `p.project`/`p.road_name`/`e.event_type` 순으로 파라미터 바인딩 `IN (?,…)`, 그 뒤 `p.ts >= ?`/`p.ts <= ?`. 비면 sql=`""`, text=`"(전체)"`. text는 사람이 읽는 표시용(값 인라인, 작은따옴표 이스케이프).
- (선택) `src/lib/route.ts`의 `safe(handler)`: 예외 → `NextResponse.json({error},{status:500})`.

## B. 타입 (`src/components/demo/types.ts`)

```ts
export type F = { projects: string[]; events: string[]; roads: string[]; from?: number; to?: number };
export type Facet = { v: string; c: number };
export type Facets = { total: number; resolvedWhere: string; projects: Facet[]; events: Facet[]; roads: Facet[] };
export type Agg = {
  byEvent:{event_type:string;c:number}[]; byProject:{project:string;c:number}[];
  byDay:{day:string;c:number}[]; hotspots:{road_name:string;c:number}[];
};
```

## C. 데이터 API 5종 (전부 GET, `parseFilters` 사용)

**`GET /api/geo`** — `SELECT p.lng,p.lat,e.event_type et,p.idx FROM robot_position p JOIN event e ON e.position_idx=p.idx {where}` (전체 반환, 샘플링 X). 각 행 → `[lng, lat, E_INDEX[et]??0, idx]`(E_INDEX=slug→index). **응답** `{ total, points: number[][], resolvedWhere }`. 포인트 튜플 = `[lng,lat,eventIdx,idx]`.

**`GET /api/facets`** — 차원별로 *자기 차원 선택은 빼고* 다른 필터 적용해 `GROUP BY` 카운트(`facet(omit,col)`). columns: projects→`p.project`, events→`e.event_type`, roads→`p.road_name`. **응답** `{ total, resolvedWhere, projects:{v,c}[], events:{v,c}[], roads:{v,c}[] }`.

**`GET /api/aggregate`** — `base = FROM robot_position p JOIN event e ON e.position_idx=p.idx {where}`. 4쿼리: byEvent(GROUP BY e.event_type ORDER c DESC), byProject(p.project), byDay(`date(p.ts/1000,'unixepoch')` ASC), hotspots(p.road_name ORDER c DESC LIMIT 5). **응답** `{ byEvent, byProject, byDay, hotspots }`.

**`GET /api/records`** — 추가 param `limit`([1,300] 기본 25)·`offset`(≥0 기본 0). 3테이블 조인(+observation). `SELECT p.idx,p.robot_id,p.project,p.ts,p.lat,p.lng,p.road_name,e.event_type,o.weather_condition,o.confidence,o.object_type,o.object_count {base} ORDER BY p.idx DESC LIMIT ? OFFSET ?`. **응답** `{ total, limit, offset, resolvedSql, rows[] }`.

**`GET /api/record/[idx]`** — `idx=Number(params.idx)`(비정수→400). 4쿼리: `robot_position WHERE idx=?`(없으면 404), `observation/event/media WHERE position_idx=?`. **응답** `{ position, observation, event, media }`(없는 건 undefined).

## D. `/demo` 페이지 + DemoApp

`src/app/demo/page.tsx`: `metadata={title:"HOVR Explorer — 데이터 대시보드"}`, `<DemoApp/>` 렌더. (SiteChrome가 `/demo`는 BARE 처리 → 헤더/푸터/챗위젯 없음.)

**`DemoApp.tsx`** (`"use client"`):
- 상태: `f:F`(init `{projects:[],events:[],roads:[]}`), `points`, `geoTotal`, `facets`, `agg`, `view:{n,total}`, `picked:number|null`, `modal`, `show:{map:true,charts:false,ledger:false}`.
- `qs(f)`로 쿼리스트링; 마운트 시 `?events=&projects=&roads=` 딥링크 1회 반영.
- `query` 변경마다 `/api/geo` `/api/facets` `/api/aggregate` 병렬 fetch → points/geoTotal/facets/agg 세팅.
- **MapView는 `next/dynamic` `ssr:false`** (로딩 "지도 로딩…").
- 레이아웃: `h-[100dvh] bg-[#080c14] text-slate-200` 세로 컬럼. 상단 컨트롤바: 홈 링크, `HimWordmark`+"HOVR"+앰버(`#f59e0b`) 펄스 점, **필터** 버튼(모달 열기·토큰수 뱃지 `#2dd4bf`), 인라인 제거가능 토큰, 패널 토글 지도/차트/데이터 표(활성=틸 `#2dd4bf` 보더/배경). 본문: 좌측=켠 패널 세로 균등 분배(Map/Charts/Ledger), 우측=고정 `lg:w-[380px]` AgentPanel(05). 지도 오버레이: 좌상단 `이 영역 {view.n} / 전체 {geoTotal}`, 좌하단 앰버 `최다 발생 · {hotspot.road_name} · {c}건`(agg.hotspots[0]).
- `setPicked`가 Map·Ledger의 `onPick` → Drawer 오픈.

## E. MapView (`MapView.tsx`) — MapLibre GL v5

- `import "maplibre-gl/dist/maplibre-gl.css"`.
- STYLE = `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json` (CARTO dark-matter, 키 불필요).
- 초기화(1회): `new maplibregl.Map({ container, style:STYLE, center:[127.0,36.35], zoom:6.4 })`. **center `[127.0,36.35]`** = 전국(광주~수도권). `NavigationControl({showCompass:false})` bottom-right. 컨테이너 `<div className="h-full w-full" role="img" aria-label="전국 데이터 지도">`.
- props `{ points:number[][], onPick:(idx)=>void, onViewport:(inView,total)=>void }`. 포인트 = `[lng,lat,eventIdx,idx]`. `toGeoJSON`: Point `coordinates:[p[0],p[1]]`, `properties:{e:p[2], idx:p[3]}`.
- source `"pts"`: `cluster:true, clusterRadius:54, clusterMaxZoom:13`.
- 레이어:
  - `clusters`(circle, `["has","point_count"]`): color interp on point_count 0→`#2dd4bf` 800→`#5eb6c9` 3000→`#f0a830` 9000→`#f97316`; radius 0→13 800→19 3000→27 9000→36; opacity .82; stroke 1 `rgba(255,255,255,0.25)`.
  - `cluster-count`(symbol): `text-field=["get","point_count_abbreviated"]`, font `["Open Sans Bold"]`, size 12, color `#06121f`.
  - `pts-un`(circle, `["!",["has","point_count"]]`): color = `match ["get","e"]` → 각 eventIdx→`EVENT_TYPES[i].color`(fallback `#8899aa`); radius interp on zoom 10→2.2 13→4 16→7; opacity .9.
  - **색은 hex/rgb만**(oklch 거부).
- `recount()`: `load`+`moveend`마다 `getBounds()` 박스에 든 점 수 세어 `onViewport(n, points.length)`.
- 클릭: `pts-un`→`onPick(Number(props.idx))`; `clusters`→`getClusterExpansionZoom`+`easeTo`(줌인). hover시 커서 pointer.
- `points` prop 변경 시 `source.setData(...)` + `recount()`(재초기화 X).

## F. Charts (`Charts.tsx`) — Recharts, props `{agg}`

`grid gap-4 md:grid-cols-3`, 각 `Panel`(`rounded-xl border border-white/10 bg-[#0e1626] p-4`, `h-52`). tooltip bg `#0d1320`. `short(n)`: ≥10000→`{만}`, ≥1000→`{천}`, else locale.
- **도로 상황별**(세로 막대, byEvent): 각 Cell=이벤트 색, x라벨 angle -25, LabelList top, radius `[6,6,0,0]`.
- **날짜별 수집량**(Area, byDay): name=`day.slice(5)`, stroke `#38BDF8` 2.5, gradient(.6→.05), monotone, X interval 6.
- **지역·팀별 수집량**(가로 막대, byProject): fill `#60A5FA`, radius `[0,6,6,0]`, YAxis width 78, LabelList right.
- `EMAP = Object.fromEntries(EVENT_TYPES.map(e=>[e.slug,e]))`로 라벨/색.

## G. Ledger (`Ledger.tsx`) — props `{query, onPick}`, PAGE=25

`/api/records?{query}&limit=25&offset` fetch, query 변경 시 offset 0 교체. 헤더 "수집 데이터 목록" + `{rows.length}/{total}건`. 컬럼: 번호 `#idx`(mono)·시각 `MM-DD HH:mm`(mono)·로봇 robot_id(mono)·도로 road_name·상황(이벤트 색 점+라벨). "더보기 (+N)" 버튼 append(rows.length<total일 때). 세로 스크롤, 행 클릭→onPick(idx), hover `bg-white/5`.

## H. Drawer (`Drawer.tsx`) — props `{idx, onClose}`

idx null이면 미렌더. idx 변경 시 `/api/record/{idx}` fetch. 우측 모달 `aside max-w-md bg-[#0d1320]` + 백드롭 `bg-black/50`(클릭 닫기) + ✕. 제목 "수집 레코드 상세"/`#idx`. 4테이블 조인 표시: 로봇칩(position.robot_id), 이벤트 뱃지(event, bg `{color}22` border `{color}`), **위치**(project·road_name·`lat, lng`·`YYYY-MM-DD HH:mm`·`{speed}km/h · {heading}°`), **현장 관측**(`{object_type}×{object_count}`·`{weather}·{road_surface}`·`{visibility}m·{traffic_density}`), **사진·영상**(media 있으면 "썸네일 미리보기" 박스, 없으면 안내).

## I. FilterModal (`FilterModal.tsx`) — props `{open,onClose,f,setF,facets}`

중앙 모달 `max-w-2xl bg-[#0d1320]` + 백드롭 `bg-black/60`. 헤더 "필터 설정"·"전체 초기화"·"완료"(틸 버튼=닫기). 차원:
- **기간**: 프리셋 전체/최근 24시간(1)/3일/7일/14일 → `from=END_MS-days*86400000, to=END_MS`(전체=clear). + `datetime-local` 시작/종료(범위 `[START_MS,END_MS]`).
- **수집처**: `facets.projects` 칩 토글 `f.projects`.
- **이벤트**: `EVENT_TYPES`(라벨+색점), 카운트는 `facets.events` slug 매칭, 토글 `f.events`.
- **장소·도로**: `facets.roads` 칩(`max-h-40` 스크롤), 토글 `f.roads`.
- `Chip`: 라벨+색점+카운트, 활성=틸(`#2dd4bf`), 카운트 0=흐리게. **적용은 실시간**(setF 즉시 → DemoApp fetch 재실행), "완료"는 닫기만.

> 다크 팔레트: 배경 `#080c14`/패널 `#0e1626`·`#0b1220`/모달 `#0d1320`, 라이브=앰버 `#f59e0b`, 에이전트/활성=틸 `#2dd4bf`.
