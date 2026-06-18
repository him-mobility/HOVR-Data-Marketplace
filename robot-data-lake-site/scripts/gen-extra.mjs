// scripts/gen-extra.mjs
// Regenerates the 200 "externally loaded" records into scripts/extra-records.json.
// Uses mulberry32 (seed 20260617) and the SAME tight radius-box + coordinate
// validation as the seed, so external points also sit near their project center
// (no drift into sea/mountains/other regions).
//
// Build order: gen-extra → seed (seed reads extra-records.json).
//
// Run: node scripts/gen-extra.mjs   → writes scripts/extra-records.json (exactly 200).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "extra-records.json");

// ── mulberry32 (Math.imul based) — NEVER an LCG. ──
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = mulberry32(20260617);
const float = (min, max) => min + r() * (max - min);
const int = (min, max) => Math.floor(min + r() * (max - min + 1));
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const gauss = (mean, sd) => {
  const u = 1 - r(),
    v = r();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ── Enums (mirror schema.ts; this file is standalone .mjs). ──
const WEATHERS = ["맑음", "비", "눈", "안개"];
const TRAFFIC = ["low", "medium", "high"];
const LANE_STATUS = ["normal", "blocked", "merge"];
const OBJECT_TYPES = ["car", "truck", "bus", "motorcycle", "pedestrian", "bicycle"];
const INFERENCE_MODELS = ["yolov8-road-v3", "rtdetr-l-v2", "yolov8-road-v2"];

// 7 event types with weights (must guarantee at least 1 of each below).
const EVENT_WEIGHTS = [
  { slug: "illegal_parking", weight: 30 },
  { slug: "pothole", weight: 23 },
  { slug: "stopped_vehicle", weight: 15 },
  { slug: "construction", weight: 12 },
  { slug: "crowd", weight: 11 },
  { slug: "flood", weight: 7 },
  { slug: "accident", weight: 2 },
];
function weightedEvent() {
  const total = EVENT_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  let x = r() * total;
  for (const e of EVENT_WEIGHTS) {
    x -= e.weight;
    if (x <= 0) return e.slug;
  }
  return EVENT_WEIGHTS[EVENT_WEIGHTS.length - 1].slug;
}

// PLACES: per-city project + center coords + road samples (≈15 places).
// Centers match real city locations so points land in the right metro/region.
const PLACES = [
  // capital
  { name: "강남", project: "seoul-loop", lat: 37.497, lng: 127.027, roads: ["테헤란로", "강남대로", "역삼로"] },
  { name: "여의도", project: "seoul-loop", lat: 37.521, lng: 126.924, roads: ["여의대로", "국회대로", "은행로"] },
  { name: "홍대", project: "seoul-loop", lat: 37.557, lng: 126.924, roads: ["양화로", "월드컵북로", "와우산로"] },
  { name: "분당", project: "gyeonggi", lat: 37.382, lng: 127.119, roads: ["분당수서로", "성남대로", "황새울로"] },
  { name: "수원", project: "gyeonggi", lat: 37.263, lng: 127.029, roads: ["효원로", "권광로", "팔달로"] },
  { name: "인천송도", project: "incheon", lat: 37.389, lng: 126.643, roads: ["센트럴로", "컨벤시아대로", "송도과학로"] },
  // metro
  { name: "부산", project: "busan", lat: 35.18, lng: 129.075, roads: ["중앙대로", "해운대로", "수영로"] },
  { name: "대구", project: "daegu", lat: 35.871, lng: 128.601, roads: ["달구벌대로", "동대구로", "중앙대로"] },
  { name: "대전", project: "daejeon", lat: 36.351, lng: 127.385, roads: ["대덕대로", "계룡로", "동서대로"] },
  { name: "울산", project: "ulsan", lat: 35.539, lng: 129.311, roads: ["삼산로", "번영로", "문수로"] },
  { name: "세종", project: "sejong", lat: 36.48, lng: 127.289, roads: ["한누리대로", "도움로", "절재로"] },
  // gwangju
  { name: "상무", project: "sangmu", lat: 35.152, lng: 126.851, roads: ["상무대로", "치평로", "시청로"] },
  { name: "충장로", project: "aban", lat: 35.148, lng: 126.915, roads: ["금남로", "충장로", "제봉로"] },
  { name: "첨단", project: "gwangju-loop", lat: 35.226, lng: 126.853, roads: ["첨단강변로", "임방울대로", "첨단과기로"] },
  { name: "봉선", project: "pungam", lat: 35.124, lng: 126.905, roads: ["봉선로", "제석로", "월산로"] },
];

const PROJ_ROBOTS = {
  "seoul-loop": 7, gyeonggi: 6, incheon: 4,
  busan: 6, daegu: 5, daejeon: 5, ulsan: 4, sejong: 3,
  aban: 6, "gwangju-loop": 5, sangmu: 4, pungam: 4,
};

// Time window (mirror schema.ts).
const END_MS = Date.parse("2026-06-17T00:00:00Z");
const START_MS = END_MS - 30 * 86400000;

function placeCoord(place) {
  const tight = place.project === "incheon";
  const maxDLat = tight ? 0.01 : 0.016,
    maxDLng = tight ? 0.011 : 0.019;
  const sd = r() < 0.65 ? 0.006 : 0.013;
  let dLat = 0,
    dLng = 0;
  for (let t = 0; t < 8; t++) {
    dLat = gauss(0, sd);
    dLng = gauss(0, sd * 1.15);
    if (Math.abs(dLat) <= maxDLat && Math.abs(dLng) <= maxDLng) break;
  }
  dLat = Math.max(-maxDLat, Math.min(maxDLat, dLat));
  dLng = Math.max(-maxDLng, Math.min(maxDLng, dLng));
  const lat = Number((place.lat + dLat).toFixed(6));
  const lng = Number((place.lng + dLng).toFixed(6));
  return { lat, lng };
}

function makeObservation(weather) {
  const road_surface = weather === "비" ? "wet" : weather === "눈" ? "snow" : r() < 0.05 ? "wet" : "dry";
  let visibility;
  if (weather === "안개") visibility = int(40, 200);
  else if (weather === "비") visibility = int(150, 600);
  else if (weather === "눈") visibility = int(120, 500);
  else visibility = int(2000, 10000);
  // right-skewed object count
  const object_count = Math.max(0, Math.round(Math.abs(gauss(0, 6)) + r() * 3));
  const confidence = Number(float(60, 99.5).toFixed(1));
  return {
    inference_model: pick(INFERENCE_MODELS),
    object_type: pick(OBJECT_TYPES),
    object_count,
    lane_status: pick(LANE_STATUS),
    traffic_density: pick(TRAFFIC),
    weather_condition: weather,
    road_surface,
    visibility,
    confidence,
  };
}

function makeMedia(place, slug) {
  // ~50% of external records carry media (these are curated external samples).
  if (r() >= 0.5) return null;
  const id = int(100000, 999999);
  const base = `s3://him-shared/robot-data-lake/${place.project}/${slug}/${id}`;
  return {
    thumbnail: `${base}/thumb.jpg`,
    short_clip: r() < 0.6 ? `${base}/clip.mp4` : null,
    live_stream: r() < 0.15 ? `${base}/live.m3u8` : null,
    redacted_image: r() < 0.5 ? `${base}/redacted.jpg` : null,
    sensor_snapshot: r() < 0.4 ? `${base}/sensor.json` : null,
  };
}

const N = 200;
const records = [];

// Pre-assign event slugs: guarantee at least 1 of each of the 7, fill rest weighted.
const slugs = [];
for (const e of EVENT_WEIGHTS) slugs.push(e.slug); // 7 guaranteed
while (slugs.length < N) slugs.push(weightedEvent());
// Fisher-Yates shuffle so the guaranteed ones aren't all at the front.
for (let i = slugs.length - 1; i > 0; i--) {
  const j = Math.floor(r() * (i + 1));
  [slugs[i], slugs[j]] = [slugs[j], slugs[i]];
}

for (let i = 0; i < N; i++) {
  const place = pick(PLACES);
  const { lat, lng } = placeCoord(place);
  const robots = PROJ_ROBOTS[place.project];
  const robot_id = `${place.project}_${String(int(1, robots)).padStart(2, "0")}`;
  const ts = START_MS + int(0, 30 * 86400000 - 1);
  const weather = pick(WEATHERS);
  const obs = makeObservation(weather);
  const event_type = slugs[i];
  records.push({
    robot_id,
    project: place.project,
    ts,
    lat,
    lng,
    road_name: pick(place.roads),
    heading: Number(float(0, 360).toFixed(1)),
    speed: Number(float(0, 60).toFixed(1)),
    accuracy: Number(float(2.5, 12).toFixed(1)),
    ...obs,
    event_type,
    media: makeMedia(place, event_type),
  });
}

// Sort by ts ascending for tidy append (idx assigned by seed.ts).
records.sort((a, b) => a.ts - b.ts);

writeFileSync(OUT, JSON.stringify(records, null, 2));

// Self-check summary.
const counts = {};
for (const rec of records) counts[rec.event_type] = (counts[rec.event_type] || 0) + 1;
const mediaCount = records.filter((rec) => rec.media).length;
const allSeven = EVENT_WEIGHTS.every((e) => (counts[e.slug] || 0) >= 1);
console.log(`gen-extra: wrote ${records.length} records → ${OUT}`);
console.log(`  event counts: ${JSON.stringify(counts)}`);
console.log(`  all 7 events present: ${allSeven}, media: ${mediaCount}`);
if (records.length !== N) {
  console.error(`ERROR: expected ${N} records, got ${records.length}`);
  process.exit(1);
}
if (!allSeven) {
  console.error("ERROR: not all 7 event types present");
  process.exit(1);
}
