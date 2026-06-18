// Regenerate 200 external-load records -> scripts/extra-records.json
// Deterministic (mulberry32, seed 20260617). Same radius-box + coord validation as seed.ts.
// Run BEFORE `npm run seed` (seed reads extra-records.json).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- deterministic PRNG (mulberry32, NEVER LCG) ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = mulberry32(20260617);
const float = (min, max) => min + r() * (max - min);
const int = (min, max) => Math.floor(min + r() * (max - min + 1));
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const gauss = (mean, sd) => { const u = 1 - r(), v = r(); return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// time window (mirror schema.ts)
const END_MS = Date.parse("2026-06-17T00:00:00Z");
const START_MS = END_MS - 30 * 86400000;

const WEATHERS = ["맑음", "비", "눈", "안개"];
const TRAFFIC = ["low", "medium", "high"];
const LANE_STATUS = ["normal", "blocked", "merge"];
const OBJECT_TYPES = ["car", "truck", "bus", "motorcycle", "pedestrian", "bicycle"];
const INFERENCE_MODELS = ["yolov8-road-v3", "rtdetr-l-v2", "yolov8-road-v2"];

// 7 event types with weights (+ guaranteed min 1 of each)
const EVENT_TYPES = [
  { slug: "illegal_parking", weight: 30 },
  { slug: "pothole", weight: 22 },
  { slug: "stopped_vehicle", weight: 15 },
  { slug: "construction", weight: 12 },
  { slug: "crowd", weight: 11 },
  { slug: "flood", weight: 7 },
  { slug: "accident", weight: 3 },
];
function weighted(items) {
  const total = items.reduce((s, it) => s + it.weight, 0); let x = r() * total;
  for (const it of items) { x -= it.weight; if (x <= 0) return it; } return items[items.length - 1];
}

// 15 places: city project + center coord + matching roads
const PLACES = [
  { project: "seoul-loop", robots: 7, lat: 37.497, lng: 127.027, roads: ["테헤란로", "강남대로", "봉은사로"] },
  { project: "seoul-loop", robots: 7, lat: 37.521, lng: 126.924, roads: ["여의대로", "국제금융로", "의사당대로"] },
  { project: "seoul-loop", robots: 7, lat: 37.557, lng: 126.924, roads: ["양화로", "월드컵북로", "홍익로"] },
  { project: "gyeonggi", robots: 6, lat: 37.382, lng: 127.119, roads: ["분당수서로", "성남대로", "황새울로"] },
  { project: "gyeonggi", robots: 6, lat: 37.263, lng: 127.029, roads: ["효원로", "권광로", "팔달로"] },
  { project: "incheon", robots: 4, lat: 37.389, lng: 126.643, roads: ["컨벤시아대로", "인천타워대로", "송도과학로"] },
  { project: "busan", robots: 6, lat: 35.18, lng: 129.075, roads: ["중앙대로", "해운대로", "수영로"] },
  { project: "daegu", robots: 5, lat: 35.871, lng: 128.601, roads: ["달구벌대로", "국채보상로", "동대구로"] },
  { project: "daejeon", robots: 5, lat: 36.351, lng: 127.385, roads: ["대덕대로", "계룡로", "한밭대로"] },
  { project: "ulsan", robots: 4, lat: 35.539, lng: 129.311, roads: ["삼산로", "번영로", "문수로"] },
  { project: "sejong", robots: 3, lat: 36.48, lng: 127.289, roads: ["한누리대로", "절재로", "갈매로"] },
  { project: "aban", robots: 6, lat: 35.226, lng: 126.853, roads: ["첨단강변로", "첨단과기로", "임방울대로"] },
  { project: "gwangju-loop", robots: 5, lat: 35.176, lng: 126.873, roads: ["운암로", "동운로", "북문대로"] },
  { project: "sangmu", robots: 4, lat: 35.152, lng: 126.851, roads: ["상무대로", "치평로", "상무중앙로"] },
  { project: "pungam", robots: 4, lat: 35.15, lng: 126.873, roads: ["화정로", "죽봉대로", "화운로"] },
];

function placeNear(place) {
  const tight = place.project === "incheon";
  const maxDLat = tight ? 0.01 : 0.016, maxDLng = tight ? 0.011 : 0.019;
  const sd = r() < 0.65 ? 0.006 : 0.013;
  let dLat = 0, dLng = 0;
  for (let t = 0; t < 8; t++) { dLat = gauss(0, sd); dLng = gauss(0, sd * 1.15); if (Math.abs(dLat) <= maxDLat && Math.abs(dLng) <= maxDLng) break; }
  dLat = Math.max(-maxDLat, Math.min(maxDLat, dLat)); dLng = Math.max(-maxDLng, Math.min(maxDLng, dLng));
  const lat = Number((place.lat + dLat).toFixed(6)), lng = Number((place.lng + dLng).toFixed(6));
  return { lat, lng };
}

const N = 200;
const records = [];
for (let i = 0; i < N; i++) {
  const place = pick(PLACES);
  const { lat, lng } = placeNear(place);
  const ts = Math.floor(float(START_MS, END_MS));
  const robot_id = `${place.project}_${String(int(1, place.robots)).padStart(2, "0")}`;
  const road_name = pick(place.roads);

  const weather = pick(WEATHERS);
  let road_surface = "dry";
  if (weather === "비") road_surface = "wet";
  else if (weather === "눈") road_surface = "snow";
  else if (r() < 0.05) road_surface = "wet";
  let visibility;
  if (weather === "안개") visibility = float(40, 200);
  else if (weather === "비") visibility = float(150, 600);
  else visibility = float(2000, 10000);

  // guarantee at least 1 of each event type for the first 7 records
  const ev = i < EVENT_TYPES.length ? EVENT_TYPES[i] : weighted(EVENT_TYPES);

  records.push({
    robot_id,
    project: place.project,
    ts,
    lat,
    lng,
    road_name,
    heading: Number(float(0, 360).toFixed(2)),
    speed: Number(float(0, 60).toFixed(2)),
    accuracy: Number(float(2, 12).toFixed(2)),
    inference_model: pick(INFERENCE_MODELS),
    object_type: pick(OBJECT_TYPES),
    object_count: Math.max(0, Math.round(Math.abs(gauss(6, 5)))),
    lane_status: pick(LANE_STATUS),
    traffic_density: pick(TRAFFIC),
    weather_condition: weather,
    road_surface,
    visibility: Number(visibility.toFixed(1)),
    confidence: Number(float(60, 99.5).toFixed(2)),
    event_type: ev.slug,
    media: r() < 0.34,
  });
}

const outPath = path.join(__dirname, "extra-records.json");
fs.writeFileSync(outPath, JSON.stringify(records, null, 2));
console.log(`gen-extra: wrote ${records.length} records -> ${outPath}`);
