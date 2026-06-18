# 02 · DATA MODEL & SEED — 4테이블 · 결정적 시드(좌표 검증) · 테스트

> 목표: 98,043건의 전국 더미데이터를 **결정적**으로 생성하되, 좌표가 바다/산/타지역으로 새지 않고 좌표↔수집처가 정합하도록 한다. 시드 후 6개 불변식을 테스트로 박제한다.

## A. `src/lib/rng.ts` — 결정적 PRNG (mulberry32, 절대 LCG 금지)

과거 LCG(`seed*1103515245`)가 JS 정수정밀도(2^53)를 넘겨 유니크 좌표가 741개로 붕괴했다. **mulberry32(Math.imul 기반)로만** 생성한다.
```ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeRng(seed: number) {
  const r = mulberry32(seed);
  return {
    next: r,
    float: (min: number, max: number) => min + r() * (max - min),
    int: (min: number, max: number) => Math.floor(min + r() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)],
    gauss: (mean: number, sd: number) => { const u = 1 - r(), v = r(); return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    weighted: <T extends { weight: number }>(items: readonly T[]): T => {
      const total = items.reduce((s, it) => s + it.weight, 0); let x = r() * total;
      for (const it of items) { x -= it.weight; if (x <= 0) return it; } return items[items.length - 1];
    },
  };
}
```

## B. `src/lib/schema.ts` — 단일 진실원본 (client-safe, node 코드 금지)

```ts
export const SEED = 42;
export const TOTAL = 97_843;            // 합성 생성분(시드/이벤트분포 기준)
export const DISPLAY_TOTAL = TOTAL + 200; // 98,043 = 생성 + 외부 적재 200
export { DISPLAY_TOTAL as _reexportHint }; // (content.ts에서 재노출)
```
- **`EVENT_TYPES`** (순서 = 지도 eventIdx) `{slug,label,count,color}`:
  | slug | label | count | color |
  |---|---|---|---|
  | illegal_parking | 불법주정차 | 29841 | #FACC15 |
  | pothole | 포트홀 | 22487 | #FB923C |
  | stopped_vehicle | 정차차량 | 14722 | #2DD4BF |
  | construction | 공사 | 12017 | #A78BFA |
  | crowd | 인파밀집 | 11038 | #F472B6 |
  | flood | 침수 | 6961 | #38BDF8 |
  | accident | 사고 | 777 | #F87171 |
  (합 = 97,843 = TOTAL)
- **`PROJECTS`** `{name,robots,weight,metro}` (12):
  - gwangju: aban(6,.42) · gwangju-loop(5,.24) · sangmu(4,.2) · pungam(4,.14)
  - capital: seoul-loop(7,.5) · gyeonggi(6,.32) · incheon(4,.18)
  - metro: busan(6,.3) · daegu(5,.24) · daejeon(5,.22) · ulsan(4,.14) · sejong(3,.1)
- **`REGIONS`** (광주 16) `{name,lat,lng,roads[]}`: 상무(35.152,126.851) 충장로(35.148,126.915) 첨단(35.226,126.853) 수완(35.205,126.815) 봉선(35.124,126.905) 일곡(35.213,126.888) 송정(35.139,126.792) 화정(35.15,126.873) 운암(35.176,126.873) 두암(35.18,126.92) 진월(35.118,126.886) 오치(35.198,126.905) 양동(35.156,126.9) 비아(35.236,126.832) 효천(35.106,126.876) 하남산단(35.196,126.785). roads는 각 지역 대표 도로명 3개(상무대로/금남로/첨단강변로 …).
- **`CAPITAL_REGIONS`** (9): 강남(37.497,127.027) 여의도(37.521,126.924) 잠실(37.513,127.1) 구로(37.495,126.887) 홍대(37.557,126.924) 분당(37.382,127.119) 수원(37.263,127.029) 고양(37.658,126.832) 인천송도(37.389,126.643).
- **`METRO_REGIONS`** (5): 부산(35.18,129.075) 대구(35.871,128.601) 대전(36.351,127.385) 울산(35.539,129.311) 세종(36.48,127.289).
- **`REGION_PROJECTS`** (지역 라벨 → project[], client-safe SSOT — 관심지역/추천/집계 공용):
  ```ts
  export const REGION_PROJECTS: Record<string, readonly string[]> = {
    광주:["aban","gwangju-loop","sangmu","pungam"], 수도권:["seoul-loop","gyeonggi","incheon"],
    부산:["busan"], 대구:["daegu"], 대전:["daejeon"], 울산:["ulsan"], 세종:["sejong"],
  };
  ```
- enums: `WEATHERS=["맑음","비","눈","안개"]`, `ROAD_SURFACES=["dry","wet","snow"]`, `TRAFFIC=["low","medium","high"]`, `LANE_STATUS=["normal","blocked","merge"]`, `OBJECT_TYPES=["car","truck","bus","motorcycle","pedestrian","bicycle"]`, `INFERENCE_MODELS=["yolov8-road-v3","rtdetr-l-v2","yolov8-road-v2"]`.
- 시간창: `END_MS=Date.parse("2026-06-17T00:00:00Z")`, `WINDOW_DAYS=30`, `START_MS=END_MS-30*86400000`.
- **`SCHEMA_SQL`** DDL (4테이블, 전부 `idx INTEGER PRIMARY KEY`):
  - `robot_position(idx, robot_id TEXT, project TEXT, ts INTEGER, lat REAL, lng REAL, road_name TEXT, heading REAL, speed REAL, accuracy REAL)`
  - `observation(idx, position_idx→robot_position, ts, inference_model, object_type, object_count, lane_status, traffic_density, weather_condition, road_surface, visibility, confidence)`
  - `event(idx, position_idx→robot_position, ts, event_type TEXT NOT NULL)`
  - `media(idx, position_idx→robot_position, event_idx→event, thumbnail, short_clip, live_stream, redacted_image, sensor_snapshot)`
  - 인덱스: pos(ts), pos(project), pos(road_name), event(event_type), event(position_idx), obs(position_idx), obs(weather_condition), media(position_idx). `PRAGMA journal_mode=WAL`.

## C. `src/lib/paths.ts` / `src/lib/db.ts`

```ts
// paths.ts (server-only)
export const DB_PATH = path.join(process.cwd(), "data", "robot-data-lake.sqlite");
// db.ts (server-only): read-only 싱글톤
//  getDb(): 없으면 throw("DB가 없습니다 … 먼저 'npm run seed'"); new Database(DB_PATH,{readonly:true,fileMustExist:true}); pragma("query_only = ON")
//  all<T>(sql,params=[]) / get<T>(sql,params=[])
```

## D. `scripts/seed.ts` — 생성 규칙 (좌표 검증 포함, 핵심)

`makeRng(SEED)`로 결정적 생성. `TOTAL`개 포지션을 만든 뒤 ts 오름차순 정렬해 idx 부여.

**1) 지역/수집처/좌표 (좌표↔project 정합 + 반경 박스):**
```ts
const ALL_REGIONS = [
  ...REGIONS.map(r=>({...r, metro:"gwangju" as const})),
  ...CAPITAL_REGIONS.map(r=>({...r, metro:"capital" as const})),
  ...METRO_REGIONS.map(r=>({...r, metro:"metro" as const})),
];
const GWANGJU_PROJ = PROJECTS.filter(p=>p.metro==="gwangju");
const PROJ_ROBOTS = Object.fromEntries(PROJECTS.map(p=>[p.name,p.robots]));
// 수도권/광역시 지역은 실제 도시 project로 고정(부산 좌표=busan). 광주 16지역만 광주 풀에서 가중 무작위.
const REGION_PROJECT: Record<string,string> = {
  강남:"seoul-loop", 여의도:"seoul-loop", 잠실:"seoul-loop", 구로:"seoul-loop", 홍대:"seoul-loop",
  분당:"gyeonggi", 수원:"gyeonggi", 고양:"gyeonggi", 인천송도:"incheon",
  부산:"busan", 대구:"daegu", 대전:"daejeon", 울산:"ulsan", 세종:"sejong",
};
function pickProject(region){
  if (region.metro==="gwangju"){ const p = rng.weighted(GWANGJU_PROJ); return {name:p.name, robots:p.robots}; }
  const name = REGION_PROJECT[region.name]; return {name, robots: PROJ_ROBOTS[name]};
}
const COASTAL_TIGHT = new Set(["인천송도"]); // 해안 인접은 더 좁게(바다 유입 차단)
function placeNear(region){
  const tight = COASTAL_TIGHT.has(region.name);
  const maxDLat = tight?0.01:0.016, maxDLng = tight?0.011:0.019; // ≈1.1~1.8km 박스
  const sd = rng.next()<0.65 ? 0.006 : 0.013;                    // 도심 밀집/약한 산포
  let dLat=0,dLng=0;
  for (let t=0;t<8;t++){ dLat=rng.gauss(0,sd); dLng=rng.gauss(0,sd*1.15); if (Math.abs(dLat)<=maxDLat && Math.abs(dLng)<=maxDLng) break; }
  dLat=Math.max(-maxDLat,Math.min(maxDLat,dLat)); dLng=Math.max(-maxDLng,Math.min(maxDLng,dLng));
  return { lat: region.lat+dLat, lng: region.lng+dLng };
}
// 루프: const region=rng.pick(ALL_REGIONS); const proj=pickProject(region);
//        robot_id=`${proj.name}_${String(rng.int(1,proj.robots)).padStart(2,"0")}`;
//        const {lat,lng}=placeNear(region); road_name=rng.pick(region.roads);
//        lat/lng는 Number(x.toFixed(6)). (전역 광역 CLAMP는 쓰지 않는다.)
```
**2) 시간:** 시 분포 가중(18–19시 피크) `HOUR_WEIGHTS`로 시 선택, `START_MS + dayOffset*86.4e6 + hour*3.6e6 + 분*60000 + 초*1000`.

**3) 이벤트 배정:** accident(777)은 **우천 가중 표본추출**(Efraimidis-Spirakis, key=`r^(1/w)`, W_RAIN=1.9·W_FOGSNOW=1.25·W_CLEAR=1.0)로 선택 → 우천 사고율 ≈1.8×. 나머지 6종은 정확 카운트만큼 슬러그 배열 만들어 Fisher-Yates 셔플 후 비-사고 포지션에 배정.

**4) observation:** weather 상관 노면(비→wet, 눈→snow, else 5%만 wet)·시정(안개 40~200·비 150~600·맑음 2000~10000)·객체수 우측왜곡·confidence 60~99.5·inference_model/object_type/lane/traffic. **media ≈34%**만 생성(S3 경로 `s3://him-shared/robot-data-lake/...`).

**5) 외부 적재분:** `scripts/extra-records.json`(200건)을 idx `TOTAL+1`부터 이어서 적재(아래 E).

**6) 요약 출력:** `positions, uniqueCoords(DISTINCT lat,lng), media` 콘솔 로그.

## E. `scripts/gen-extra.mjs` — 외부 적재 200건 재생성

`node scripts/gen-extra.mjs` → `scripts/extra-records.json`(정확히 200건) 생성. mulberry32(시드 20260617). `PLACES`(도시별 project·중심좌표·도로 일치 표본 15곳)에서 뽑아 **D와 동일한 반경 박스 + 좌표 검증** 적용:
```js
const tight = place.project === "incheon";
const maxDLat = tight?0.01:0.016, maxDLng = tight?0.011:0.019;
const sd = r()<0.65 ? 0.006 : 0.013;
let dLat=0,dLng=0;
for (let t=0;t<8;t++){ dLat=gauss(0,sd); dLng=gauss(0,sd*1.15); if (Math.abs(dLat)<=maxDLat && Math.abs(dLng)<=maxDLng) break; }
dLat=Math.max(-maxDLat,Math.min(maxDLat,dLat)); dLng=Math.max(-maxDLng,Math.min(maxDLng,dLng));
const lat=Number((place.lat+dLat).toFixed(6)), lng=Number((place.lng+dLng).toFixed(6));
```
이벤트 7종 가중 + 최소 1건 보장. `seed.ts`의 `runExtra`가 읽는 필드(robot_id/project/ts/lat/lng/road_name/heading/speed/accuracy/object_*/lane/traffic/weather/road_surface/visibility/confidence/event_type/media)와 일치.
빌드 순서: **gen-extra → seed**(시드가 extra-records.json을 읽음).

## F. `scripts/seed.test.ts` — 검증 게이트 (vitest, pretest가 먼저 시드)

`EXPECTED = TOTAL + extra.length`(=98,043). 6 테스트:
1. `robot_position COUNT == EXPECTED`
2. **유니크 (lat,lng) > 95,000** (PRNG 붕괴 방지)
3. event 7종 슬러그 모두 존재 & `event COUNT == EXPECTED`
4. `observation == EXPECTED`, `event == EXPECTED`, media ∈ (30,000, 37,000)
5. 우천사고율/맑음사고율 ∈ [1.5, 2.2]
6. idx가 ts 오름차순 일치(생성분 idx ≤ TOTAL 한정)

> (선택) 좌표 정합 검증: 임시 tsx로 전 행을 돌며 각 점이 자기 project 권역 중심 반경 ≈3km 내인지, 최근접 권역 metro==project metro인지 확인 → 위반 0이어야 한다(바다/산/타지역 0). 검증 후 임시 스크립트는 삭제.

## G. 산출 기대치

`npm run seed` → `positions=98043 (generated=97843, extra=200), uniqueCoords≈98024, media≈33496`. `npm test` → 6/6 통과.
