// scripts/seed.ts
// Deterministic seed of the 98,043-row SQLite data lake.
//   TOTAL (97,843) positions are synthesized from makeRng(SEED), then the 200
//   externally-loaded records (scripts/extra-records.json) are appended.
//
// Invariants (enforced by scripts/seed.test.ts):
//   - PRNG is mulberry32 ONLY (via makeRng). NEVER an LCG.
//   - Points sit inside tight per-region radius boxes (≈1.1–1.8 km), coordinate↔project consistent.
//   - Event counts sum to exactly 97,843 across the 7 EVENT_TYPES.
//
// Build order: node scripts/gen-extra.mjs  →  npm run seed.

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { makeRng } from "../src/lib/rng";
import { DB_PATH } from "../src/lib/paths";
import {
  SEED,
  TOTAL,
  SCHEMA_SQL,
  EVENT_TYPES,
  PROJECTS,
  REGIONS,
  CAPITAL_REGIONS,
  METRO_REGIONS,
  WEATHERS,
  TRAFFIC,
  LANE_STATUS,
  OBJECT_TYPES,
  INFERENCE_MODELS,
  START_MS,
  WINDOW_DAYS,
} from "../src/lib/schema";

const rng = makeRng(SEED);

// ── 1) Regions / projects / coordinates (coordinate↔project consistent + radius box). ──
type Reg = { name: string; lat: number; lng: number; roads: readonly string[]; metro: "gwangju" | "capital" | "metro" };

const ALL_REGIONS: Reg[] = [
  ...REGIONS.map((r) => ({ ...r, metro: "gwangju" as const })),
  ...CAPITAL_REGIONS.map((r) => ({ ...r, metro: "capital" as const })),
  ...METRO_REGIONS.map((r) => ({ ...r, metro: "metro" as const })),
];

const GWANGJU_PROJ = PROJECTS.filter((p) => p.metro === "gwangju");
const PROJ_ROBOTS: Record<string, number> = Object.fromEntries(PROJECTS.map((p) => [p.name, p.robots]));

// Capital/metro regions are fixed to their real city project (부산 coords = busan).
// Only the 16 Gwangju regions draw weighted-random from the Gwangju project pool.
const REGION_PROJECT: Record<string, string> = {
  강남: "seoul-loop", 여의도: "seoul-loop", 잠실: "seoul-loop", 구로: "seoul-loop", 홍대: "seoul-loop",
  분당: "gyeonggi", 수원: "gyeonggi", 고양: "gyeonggi", 인천송도: "incheon",
  부산: "busan", 대구: "daegu", 대전: "daejeon", 울산: "ulsan", 세종: "sejong",
};

function pickProject(region: Reg): { name: string; robots: number } {
  if (region.metro === "gwangju") {
    const p = rng.weighted(GWANGJU_PROJ);
    return { name: p.name, robots: p.robots };
  }
  const name = REGION_PROJECT[region.name];
  return { name, robots: PROJ_ROBOTS[name] };
}

const COASTAL_TIGHT = new Set(["인천송도"]); // coastal — tighter box to block sea drift.

function placeNear(region: Reg): { lat: number; lng: number } {
  const tight = COASTAL_TIGHT.has(region.name);
  const maxDLat = tight ? 0.01 : 0.016,
    maxDLng = tight ? 0.011 : 0.019; // ≈1.1–1.8 km box
  const sd = rng.next() < 0.65 ? 0.006 : 0.013; // dense downtown / mild spread
  let dLat = 0,
    dLng = 0;
  for (let t = 0; t < 8; t++) {
    dLat = rng.gauss(0, sd);
    dLng = rng.gauss(0, sd * 1.15);
    if (Math.abs(dLat) <= maxDLat && Math.abs(dLng) <= maxDLng) break;
  }
  dLat = Math.max(-maxDLat, Math.min(maxDLat, dLat));
  dLng = Math.max(-maxDLng, Math.min(maxDLng, dLng));
  // 6 decimals. NO global metro CLAMP.
  return { lat: Number((region.lat + dLat).toFixed(6)), lng: Number((region.lng + dLng).toFixed(6)) };
}

// ── 2) Time — hour-of-day weighting with an 18–19h peak. ──
// index = hour 0..23
const HOUR_WEIGHTS = [
  0.3, 0.2, 0.15, 0.12, 0.12, 0.25, 0.6, 1.4, 2.2, 2.0, // 0–9
  1.7, 1.8, 1.9, 1.7, 1.6, 1.7, 2.0, 2.6, 3.2, 3.1, // 10–19  (18–19 peak)
  2.2, 1.5, 1.0, 0.6, // 20–23
];
const HOUR_ITEMS = HOUR_WEIGHTS.map((weight, hour) => ({ hour, weight }));

function pickHour(): number {
  return rng.weighted(HOUR_ITEMS).hour;
}

function pickTs(): number {
  const dayOffset = rng.int(0, WINDOW_DAYS - 1);
  const hour = pickHour();
  const min = rng.int(0, 59);
  const sec = rng.int(0, 59);
  return START_MS + dayOffset * 86_400_000 + hour * 3_600_000 + min * 60_000 + sec * 1000;
}

// ── 3) Weather (per position). Decided up front because accident selection is rain-weighted. ──
const WEATHER_ITEMS = [
  { value: "맑음", weight: 0.62 },
  { value: "비", weight: 0.22 },
  { value: "안개", weight: 0.1 },
  { value: "눈", weight: 0.06 },
] as const;
function pickWeather(): string {
  const total = WEATHER_ITEMS.reduce((s, w) => s + w.weight, 0);
  let x = rng.next() * total;
  for (const w of WEATHER_ITEMS) {
    x -= w.weight;
    if (x <= 0) return w.value;
  }
  return WEATHER_ITEMS[WEATHER_ITEMS.length - 1].value;
}

// ── Generate TOTAL positions (with weather attached). ──
type Row = {
  robot_id: string;
  project: string;
  ts: number;
  lat: number;
  lng: number;
  road_name: string;
  heading: number;
  speed: number;
  accuracy: number;
  weather: string;
  event_type: string | null;
};

console.log(`Generating ${TOTAL.toLocaleString()} positions…`);
const rows: Row[] = new Array(TOTAL);
for (let i = 0; i < TOTAL; i++) {
  const region = rng.pick(ALL_REGIONS);
  const proj = pickProject(region);
  const robot_id = `${proj.name}_${String(rng.int(1, proj.robots)).padStart(2, "0")}`;
  const { lat, lng } = placeNear(region);
  const road_name = rng.pick(region.roads);
  const ts = pickTs();
  const weather = pickWeather();
  rows[i] = {
    robot_id,
    project: proj.name,
    ts,
    lat,
    lng,
    road_name,
    heading: Number(rng.float(0, 360).toFixed(1)),
    speed: Number(rng.float(0, 65).toFixed(1)),
    accuracy: Number(rng.float(2.5, 12).toFixed(1)),
    weather,
    event_type: null,
  };
}

// ── 4) Event assignment. ──
// accident(777): rain-weighted Efraimidis–Spirakis reservoir (key = r^(1/w)); keep top-777 by key.
//   → rain accident rate ≈1.8× clear.
const W_RAIN = 1.9,
  W_FOGSNOW = 1.25,
  W_CLEAR = 1.0;
function weatherWeight(w: string): number {
  if (w === "비") return W_RAIN;
  if (w === "안개" || w === "눈") return W_FOGSNOW;
  return W_CLEAR;
}

const ACCIDENT_COUNT = EVENT_TYPES.find((e) => e.slug === "accident")!.count; // 777
// Compute Efraimidis–Spirakis keys, then select the highest 777.
const keyed: { idx: number; key: number }[] = new Array(TOTAL);
for (let i = 0; i < TOTAL; i++) {
  const w = weatherWeight(rows[i].weather);
  const u = rng.next();
  // key = u^(1/w); take log to avoid pow precision issues, larger key = more likely chosen.
  const key = Math.log(u) / w; // == log(u^(1/w)); maximizing this picks highest u^(1/w)
  keyed[i] = { idx: i, key };
}
// We want the largest u^(1/w) ⇒ largest log(u)/w (closest to 0). Sort descending by key.
keyed.sort((a, b) => b.key - a.key);
const accidentIdx = new Set<number>();
for (let i = 0; i < ACCIDENT_COUNT; i++) {
  accidentIdx.add(keyed[i].idx);
  rows[keyed[i].idx].event_type = "accident";
}

// Other 6 events: build exact-count slug array, Fisher–Yates shuffle, drop onto non-accident positions.
const otherSlugs: string[] = [];
for (const e of EVENT_TYPES) {
  if (e.slug === "accident") continue;
  for (let k = 0; k < e.count; k++) otherSlugs.push(e.slug);
}
// otherSlugs.length must equal TOTAL - ACCIDENT_COUNT.
if (otherSlugs.length !== TOTAL - ACCIDENT_COUNT) {
  throw new Error(`event-count mismatch: otherSlugs=${otherSlugs.length}, expected ${TOTAL - ACCIDENT_COUNT}`);
}
for (let i = otherSlugs.length - 1; i > 0; i--) {
  const j = rng.int(0, i);
  [otherSlugs[i], otherSlugs[j]] = [otherSlugs[j], otherSlugs[i]];
}
let cursor = 0;
for (let i = 0; i < TOTAL; i++) {
  if (accidentIdx.has(i)) continue;
  rows[i].event_type = otherSlugs[cursor++];
}
if (cursor !== otherSlugs.length) {
  throw new Error(`assignment mismatch: used ${cursor} of ${otherSlugs.length}`);
}

// ── 5) observation fields (weather-correlated) + media (~34%). ──
function roadSurface(weather: string): string {
  if (weather === "비") return "wet";
  if (weather === "눈") return "snow";
  return rng.next() < 0.05 ? "wet" : "dry";
}
function visibility(weather: string): number {
  if (weather === "안개") return rng.int(40, 200);
  if (weather === "비") return rng.int(150, 600);
  if (weather === "눈") return rng.int(120, 500);
  return rng.int(2000, 10000);
}
function objectCount(): number {
  // right-skewed: most small, occasional large.
  return Math.max(0, Math.round(Math.abs(rng.gauss(0, 6)) + rng.next() * 4));
}

// ── 6) Sort positions by ts ascending, then assign idx (1..TOTAL). ──
console.log("Sorting by ts and assigning idx…");
rows.sort((a, b) => a.ts - b.ts);

// ── Write DB. ──
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
// also clear stale WAL/SHM sidecars
for (const ext of ["-wal", "-shm"]) {
  const f = DB_PATH + ext;
  if (fs.existsSync(f)) fs.rmSync(f);
}

const db = new Database(DB_PATH);
db.exec(SCHEMA_SQL);

const insPos = db.prepare(
  `INSERT INTO robot_position (idx, robot_id, project, ts, lat, lng, road_name, heading, speed, accuracy)
   VALUES (@idx, @robot_id, @project, @ts, @lat, @lng, @road_name, @heading, @speed, @accuracy)`
);
const insObs = db.prepare(
  `INSERT INTO observation (idx, position_idx, ts, inference_model, object_type, object_count, lane_status, traffic_density, weather_condition, road_surface, visibility, confidence)
   VALUES (@idx, @position_idx, @ts, @inference_model, @object_type, @object_count, @lane_status, @traffic_density, @weather_condition, @road_surface, @visibility, @confidence)`
);
const insEvt = db.prepare(
  `INSERT INTO event (idx, position_idx, ts, event_type) VALUES (@idx, @position_idx, @ts, @event_type)`
);
const insMedia = db.prepare(
  `INSERT INTO media (idx, position_idx, event_idx, thumbnail, short_clip, live_stream, redacted_image, sensor_snapshot)
   VALUES (@idx, @position_idx, @event_idx, @thumbnail, @short_clip, @live_stream, @redacted_image, @sensor_snapshot)`
);

let mediaCounter = 0;

const insertAll = db.transaction(() => {
  for (let i = 0; i < rows.length; i++) {
    const idx = i + 1; // idx 1..TOTAL, ascending with ts
    const row = rows[i];
    insPos.run({
      idx,
      robot_id: row.robot_id,
      project: row.project,
      ts: row.ts,
      lat: row.lat,
      lng: row.lng,
      road_name: row.road_name,
      heading: row.heading,
      speed: row.speed,
      accuracy: row.accuracy,
    });

    const surf = roadSurface(row.weather);
    insObs.run({
      idx,
      position_idx: idx,
      ts: row.ts,
      inference_model: rng.pick(INFERENCE_MODELS),
      object_type: rng.pick(OBJECT_TYPES),
      object_count: objectCount(),
      lane_status: rng.pick(LANE_STATUS),
      traffic_density: rng.pick(TRAFFIC),
      weather_condition: row.weather,
      road_surface: surf,
      visibility: visibility(row.weather),
      confidence: Number(rng.float(60, 99.5).toFixed(1)),
    });

    insEvt.run({ idx, position_idx: idx, ts: row.ts, event_type: row.event_type });

    if (rng.next() < 0.34) {
      mediaCounter++;
      const id = rng.int(100000, 999999);
      const base = `s3://him-shared/robot-data-lake/${row.project}/${row.event_type}/${id}`;
      insMedia.run({
        idx: mediaCounter,
        position_idx: idx,
        event_idx: idx, // event idx mirrors position idx (1:1 per position)
        thumbnail: `${base}/thumb.jpg`,
        short_clip: rng.next() < 0.6 ? `${base}/clip.mp4` : null,
        live_stream: rng.next() < 0.15 ? `${base}/live.m3u8` : null,
        redacted_image: rng.next() < 0.5 ? `${base}/redacted.jpg` : null,
        sensor_snapshot: rng.next() < 0.4 ? `${base}/sensor.json` : null,
      });
    }
  }
});
insertAll();

// ── 7) External load (200) appended starting at idx TOTAL+1. ──
type Extra = {
  robot_id: string;
  project: string;
  ts: number;
  lat: number;
  lng: number;
  road_name: string;
  heading: number;
  speed: number;
  accuracy: number;
  inference_model: string;
  object_type: string;
  object_count: number;
  lane_status: string;
  traffic_density: string;
  weather_condition: string;
  road_surface: string;
  visibility: number;
  confidence: number;
  event_type: string;
  media: null | {
    thumbnail: string;
    short_clip: string | null;
    live_stream: string | null;
    redacted_image: string | null;
    sensor_snapshot: string | null;
  };
};

function runExtra(): number {
  const extraPath = path.join(__dirname, "extra-records.json");
  if (!fs.existsSync(extraPath)) {
    throw new Error(
      `extra-records.json이 없습니다: ${extraPath}\n먼저 'node scripts/gen-extra.mjs'를 실행하세요.`
    );
  }
  const extra: Extra[] = JSON.parse(fs.readFileSync(extraPath, "utf8"));
  const runTx = db.transaction(() => {
    for (let i = 0; i < extra.length; i++) {
      const e = extra[i];
      const idx = TOTAL + 1 + i; // continue after generated rows
      insPos.run({
        idx,
        robot_id: e.robot_id,
        project: e.project,
        ts: e.ts,
        lat: e.lat,
        lng: e.lng,
        road_name: e.road_name,
        heading: e.heading,
        speed: e.speed,
        accuracy: e.accuracy,
      });
      insObs.run({
        idx,
        position_idx: idx,
        ts: e.ts,
        inference_model: e.inference_model,
        object_type: e.object_type,
        object_count: e.object_count,
        lane_status: e.lane_status,
        traffic_density: e.traffic_density,
        weather_condition: e.weather_condition,
        road_surface: e.road_surface,
        visibility: e.visibility,
        confidence: e.confidence,
      });
      insEvt.run({ idx, position_idx: idx, ts: e.ts, event_type: e.event_type });
      if (e.media) {
        mediaCounter++;
        insMedia.run({
          idx: mediaCounter,
          position_idx: idx,
          event_idx: idx,
          thumbnail: e.media.thumbnail,
          short_clip: e.media.short_clip ?? null,
          live_stream: e.media.live_stream ?? null,
          redacted_image: e.media.redacted_image ?? null,
          sensor_snapshot: e.media.sensor_snapshot ?? null,
        });
      }
    }
  });
  runTx();
  return extra.length;
}

const extraLoaded = runExtra();

// ── 8) Summary. ──
const positions = (db.prepare("SELECT COUNT(*) c FROM robot_position").get() as { c: number }).c;
const uniqueCoords = (
  db.prepare("SELECT COUNT(*) c FROM (SELECT DISTINCT lat, lng FROM robot_position)").get() as { c: number }
).c;
const media = (db.prepare("SELECT COUNT(*) c FROM media").get() as { c: number }).c;
const events = (db.prepare("SELECT COUNT(*) c FROM event").get() as { c: number }).c;
const observations = (db.prepare("SELECT COUNT(*) c FROM observation").get() as { c: number }).c;

db.close();

console.log(
  `positions=${positions} (generated=${TOTAL}, extra=${extraLoaded}), uniqueCoords=${uniqueCoords}, media=${media}`
);
console.log(`  observation=${observations}, event=${events}`);
