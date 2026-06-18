// Deterministic seed: 97,843 generated + 200 external = 98,043 positions.
// Coordinates stay inside per-region radius boxes (no sea/mountain/other-region drift),
// coord <-> project matched 1:1. PRNG = mulberry32 (seed 42), NEVER LCG.
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { makeRng } from "../src/lib/rng";
import {
  SEED, TOTAL,
  EVENT_TYPES, PROJECTS, REGIONS, CAPITAL_REGIONS, METRO_REGIONS,
  WEATHERS, TRAFFIC, LANE_STATUS, OBJECT_TYPES, INFERENCE_MODELS,
  START_MS, END_MS, SCHEMA_SQL,
} from "../src/lib/schema";
import { DB_PATH } from "../src/lib/paths";

const rng = makeRng(SEED);

// ---------- regions / projects / coords ----------
const ALL_REGIONS = [
  ...REGIONS.map((r) => ({ ...r, metro: "gwangju" as const })),
  ...CAPITAL_REGIONS.map((r) => ({ ...r, metro: "capital" as const })),
  ...METRO_REGIONS.map((r) => ({ ...r, metro: "metro" as const })),
];
type RegionWithMetro = (typeof ALL_REGIONS)[number];

const GWANGJU_PROJ = PROJECTS.filter((p) => p.metro === "gwangju");
const PROJ_ROBOTS: Record<string, number> = Object.fromEntries(PROJECTS.map((p) => [p.name, p.robots]));

// 수도권/광역시 지역은 실제 도시 project로 고정. 광주 16지역만 광주 풀에서 가중 무작위.
const REGION_PROJECT: Record<string, string> = {
  강남: "seoul-loop", 여의도: "seoul-loop", 잠실: "seoul-loop", 구로: "seoul-loop", 홍대: "seoul-loop",
  분당: "gyeonggi", 수원: "gyeonggi", 고양: "gyeonggi", 인천송도: "incheon",
  부산: "busan", 대구: "daegu", 대전: "daejeon", 울산: "ulsan", 세종: "sejong",
};

function pickProject(region: RegionWithMetro): { name: string; robots: number } {
  if (region.metro === "gwangju") { const p = rng.weighted(GWANGJU_PROJ); return { name: p.name, robots: p.robots }; }
  const name = REGION_PROJECT[region.name];
  return { name, robots: PROJ_ROBOTS[name] };
}

const COASTAL_TIGHT = new Set(["인천송도"]); // 해안 인접은 더 좁게(바다 유입 차단)
function placeNear(region: RegionWithMetro): { lat: number; lng: number } {
  const tight = COASTAL_TIGHT.has(region.name);
  const maxDLat = tight ? 0.01 : 0.016, maxDLng = tight ? 0.011 : 0.019; // ≈1.1~1.8km 박스
  const sd = rng.next() < 0.65 ? 0.006 : 0.013;                          // 도심 밀집/약한 산포
  let dLat = 0, dLng = 0;
  for (let t = 0; t < 8; t++) { dLat = rng.gauss(0, sd); dLng = rng.gauss(0, sd * 1.15); if (Math.abs(dLat) <= maxDLat && Math.abs(dLng) <= maxDLng) break; }
  dLat = Math.max(-maxDLat, Math.min(maxDLat, dLat)); dLng = Math.max(-maxDLng, Math.min(maxDLng, dLng));
  return { lat: region.lat + dLat, lng: region.lng + dLng };
}

// ---------- time (hour weights, 18-19 peak) ----------
const HOUR_WEIGHTS = [
  3, 2, 1, 1, 1, 2, 5, 9, 14, 11, 9, 10, 11, 10, 10, 11, 13, 16, 20, 19, 14, 10, 7, 5,
];
function pickHour(): number {
  const total = HOUR_WEIGHTS.reduce((s, w) => s + w, 0);
  let x = rng.next() * total;
  for (let h = 0; h < 24; h++) { x -= HOUR_WEIGHTS[h]; if (x <= 0) return h; }
  return 23;
}
const WINDOW_DAYS = Math.round((END_MS - START_MS) / 86400000);

// ---------- generate positions ----------
type Pos = {
  robot_id: string; project: string; ts: number; lat: number; lng: number; road_name: string;
  heading: number; speed: number; accuracy: number; weather: string;
};

const positions: Pos[] = [];
for (let i = 0; i < TOTAL; i++) {
  const region = rng.pick(ALL_REGIONS);
  const proj = pickProject(region);
  const robot_id = `${proj.name}_${String(rng.int(1, proj.robots)).padStart(2, "0")}`;
  const { lat, lng } = placeNear(region);
  const road_name = rng.pick(region.roads);

  const dayOffset = rng.int(0, WINDOW_DAYS - 1);
  const hour = pickHour();
  const min = rng.int(0, 59);
  const sec = rng.int(0, 59);
  const ts = START_MS + dayOffset * 86_400_000 + hour * 3_600_000 + min * 60_000 + sec * 1000;

  const weather = rng.pick(WEATHERS);

  positions.push({
    robot_id,
    project: proj.name,
    ts,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    road_name,
    heading: Number(rng.float(0, 360).toFixed(2)),
    speed: Number(rng.float(0, 60).toFixed(2)),
    accuracy: Number(rng.float(2, 12).toFixed(2)),
    weather,
  });
}

// sort by ts ascending, then assign idx 1..TOTAL
positions.sort((a, b) => a.ts - b.ts);

// ---------- event assignment ----------
// accident(777): rain-weighted reservoir sampling (Efraimidis-Spirakis, key = r^(1/w)).
const W_RAIN = 1.9, W_FOGSNOW = 1.25, W_CLEAR = 1.0;
function eventWeight(weather: string): number {
  if (weather === "비") return W_RAIN;
  if (weather === "눈" || weather === "안개") return W_FOGSNOW;
  return W_CLEAR;
}
const accidentCount = EVENT_TYPES.find((e) => e.slug === "accident")!.count;
const keyed = positions.map((p, i) => ({ i, key: Math.pow(rng.next(), 1 / eventWeight(p.weather)) }));
keyed.sort((a, b) => b.key - a.key);
const accidentSet = new Set<number>(keyed.slice(0, accidentCount).map((k) => k.i));

// remaining 6 event types: exact-count slug array, Fisher-Yates shuffle, assign to non-accident positions.
const remainingSlugs: string[] = [];
for (const e of EVENT_TYPES) {
  if (e.slug === "accident") continue;
  for (let k = 0; k < e.count; k++) remainingSlugs.push(e.slug);
}
for (let i = remainingSlugs.length - 1; i > 0; i--) {
  const j = rng.int(0, i);
  const tmp = remainingSlugs[i]; remainingSlugs[i] = remainingSlugs[j]; remainingSlugs[j] = tmp;
}

const eventSlugByPos: string[] = new Array(positions.length);
let cursor = 0;
for (let i = 0; i < positions.length; i++) {
  if (accidentSet.has(i)) { eventSlugByPos[i] = "accident"; continue; }
  eventSlugByPos[i] = remainingSlugs[cursor++];
}

// ---------- observation helpers ----------
function roadSurfaceFor(weather: string): string {
  if (weather === "비") return "wet";
  if (weather === "눈") return "snow";
  return rng.next() < 0.05 ? "wet" : "dry";
}
function visibilityFor(weather: string): number {
  if (weather === "안개") return rng.float(40, 200);
  if (weather === "비") return rng.float(150, 600);
  return rng.float(2000, 10000);
}
function objectCount(): number {
  // right-skewed
  return Math.max(0, Math.round(Math.abs(rng.gauss(6, 5))));
}

function s3(kind: string, idx: number): string {
  return `s3://him-shared/robot-data-lake/${kind}/${idx}.bin`;
}

// ---------- DB ----------
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
for (const ext of ["-wal", "-shm"]) { if (fs.existsSync(DB_PATH + ext)) fs.rmSync(DB_PATH + ext); }

const db = new Database(DB_PATH);
db.exec(SCHEMA_SQL);

const insPos = db.prepare(
  "INSERT INTO robot_position (idx, robot_id, project, ts, lat, lng, road_name, heading, speed, accuracy) VALUES (?,?,?,?,?,?,?,?,?,?)"
);
const insObs = db.prepare(
  "INSERT INTO observation (idx, position_idx, ts, inference_model, object_type, object_count, lane_status, traffic_density, weather_condition, road_surface, visibility, confidence) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
);
const insEvent = db.prepare(
  "INSERT INTO event (idx, position_idx, ts, event_type) VALUES (?,?,?,?)"
);
const insMedia = db.prepare(
  "INSERT INTO media (idx, position_idx, event_idx, thumbnail, short_clip, live_stream, redacted_image, sensor_snapshot) VALUES (?,?,?,?,?,?,?,?)"
);

let mediaCount = 0;

const writeMain = db.transaction(() => {
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const idx = i + 1; // ts-ascending idx
    insPos.run(idx, p.robot_id, p.project, p.ts, p.lat, p.lng, p.road_name, p.heading, p.speed, p.accuracy);

    const road_surface = roadSurfaceFor(p.weather);
    const visibility = visibilityFor(p.weather);
    insObs.run(
      idx, idx, p.ts,
      rng.pick(INFERENCE_MODELS),
      rng.pick(OBJECT_TYPES),
      objectCount(),
      rng.pick(LANE_STATUS),
      rng.pick(TRAFFIC),
      p.weather,
      road_surface,
      Number(visibility.toFixed(1)),
      Number(rng.float(60, 99.5).toFixed(2))
    );

    insEvent.run(idx, idx, p.ts, eventSlugByPos[i]);

    if (rng.next() < 0.34) {
      mediaCount++;
      insMedia.run(
        idx, idx, idx,
        s3("thumbnails", idx),
        s3("clips", idx),
        s3("live", idx),
        s3("redacted", idx),
        s3("sensors", idx)
      );
    }
  }
});
writeMain();

// ---------- external load (extra-records.json) ----------
function runExtra() {
  const extraPath = path.join(process.cwd(), "scripts", "extra-records.json");
  if (!fs.existsSync(extraPath)) {
    throw new Error("scripts/extra-records.json 가 없습니다. 먼저 'node scripts/gen-extra.mjs'를 실행하세요.");
  }
  const extra = JSON.parse(fs.readFileSync(extraPath, "utf8")) as Array<Record<string, unknown>>;
  const tx = db.transaction(() => {
    for (let k = 0; k < extra.length; k++) {
      const e = extra[k];
      const idx = TOTAL + 1 + k;
      insPos.run(
        idx, e.robot_id, e.project, e.ts, e.lat, e.lng, e.road_name,
        e.heading ?? null, e.speed ?? null, e.accuracy ?? null
      );
      insObs.run(
        idx, idx, e.ts,
        e.inference_model ?? null, e.object_type ?? null, e.object_count ?? null,
        e.lane_status ?? null, e.traffic_density ?? null, e.weather_condition ?? null,
        e.road_surface ?? null, e.visibility ?? null, e.confidence ?? null
      );
      insEvent.run(idx, idx, e.ts, e.event_type);
      if (e.media) {
        mediaCount++;
        insMedia.run(
          idx, idx, idx,
          s3("thumbnails", idx), s3("clips", idx), s3("live", idx),
          s3("redacted", idx), s3("sensors", idx)
        );
      }
    }
  });
  tx();
  return extra.length;
}
const extraCount = runExtra();

// ---------- summary ----------
const positionsTotal = (db.prepare("SELECT COUNT(*) c FROM robot_position").get() as { c: number }).c;
const uniqueCoords = (db.prepare("SELECT COUNT(*) c FROM (SELECT DISTINCT lat, lng FROM robot_position)").get() as { c: number }).c;
const media = (db.prepare("SELECT COUNT(*) c FROM media").get() as { c: number }).c;

db.close();

console.log(
  `positions=${positionsTotal} (generated=${TOTAL}, extra=${extraCount}), uniqueCoords=${uniqueCoords}, media=${media}`
);
if (media !== mediaCount) {
  console.warn(`warn: media row count (${media}) != tracked (${mediaCount})`);
}
