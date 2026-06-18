// Single source of truth — client-safe. NO node imports here.
// Coordinates, counts, enums, time window, and DDL all live here so the seed,
// the API, and the client read identical constants.

export const SEED = 42;
export const TOTAL = 97_843; // synthetic generated count (seed/event-distribution basis)
export const DISPLAY_TOTAL = TOTAL + 200; // 98,043 = generated + 200 externally loaded
export { DISPLAY_TOTAL as _reexportHint }; // (re-exported by content.ts)

// ── Event types (array order = map eventIdx). counts sum to 97,843 = TOTAL. ──
export type EventType = {
  slug: string;
  label: string;
  count: number;
  color: string;
};
export const EVENT_TYPES: readonly EventType[] = [
  { slug: "illegal_parking", label: "불법주정차", count: 29841, color: "#FACC15" },
  { slug: "pothole", label: "포트홀", count: 22487, color: "#FB923C" },
  { slug: "stopped_vehicle", label: "정차차량", count: 14722, color: "#2DD4BF" },
  { slug: "construction", label: "공사", count: 12017, color: "#A78BFA" },
  { slug: "crowd", label: "인파밀집", count: 11038, color: "#F472B6" },
  { slug: "flood", label: "침수", count: 6961, color: "#38BDF8" },
  { slug: "accident", label: "사고", count: 777, color: "#F87171" },
] as const;

// ── Projects (collection sites). metro groups them; weight drives sampling. ──
export type Project = {
  name: string;
  robots: number;
  weight: number;
  metro: "gwangju" | "capital" | "metro";
};
export const PROJECTS: readonly Project[] = [
  // gwangju
  { name: "aban", robots: 6, weight: 0.42, metro: "gwangju" },
  { name: "gwangju-loop", robots: 5, weight: 0.24, metro: "gwangju" },
  { name: "sangmu", robots: 4, weight: 0.2, metro: "gwangju" },
  { name: "pungam", robots: 4, weight: 0.14, metro: "gwangju" },
  // capital
  { name: "seoul-loop", robots: 7, weight: 0.5, metro: "capital" },
  { name: "gyeonggi", robots: 6, weight: 0.32, metro: "capital" },
  { name: "incheon", robots: 4, weight: 0.18, metro: "capital" },
  // metro
  { name: "busan", robots: 6, weight: 0.3, metro: "metro" },
  { name: "daegu", robots: 5, weight: 0.24, metro: "metro" },
  { name: "daejeon", robots: 5, weight: 0.22, metro: "metro" },
  { name: "ulsan", robots: 4, weight: 0.14, metro: "metro" },
  { name: "sejong", robots: 3, weight: 0.1, metro: "metro" },
] as const;

// ── Regions ──
export type Region = {
  name: string;
  lat: number;
  lng: number;
  roads: readonly string[];
};

// 광주 16지역 — 각 지역 대표 도로명 3개.
export const REGIONS: readonly Region[] = [
  { name: "상무", lat: 35.152, lng: 126.851, roads: ["상무대로", "치평로", "시청로"] },
  { name: "충장로", lat: 35.148, lng: 126.915, roads: ["금남로", "충장로", "제봉로"] },
  { name: "첨단", lat: 35.226, lng: 126.853, roads: ["첨단강변로", "임방울대로", "첨단과기로"] },
  { name: "수완", lat: 35.205, lng: 126.815, roads: ["수완로", "장신로", "흥룡로"] },
  { name: "봉선", lat: 35.124, lng: 126.905, roads: ["봉선로", "제석로", "월산로"] },
  { name: "일곡", lat: 35.213, lng: 126.888, roads: ["일곡로", "설죽로", "삼각로"] },
  { name: "송정", lat: 35.139, lng: 126.792, roads: ["상무대로", "광산로", "송정로"] },
  { name: "화정", lat: 35.15, lng: 126.873, roads: ["화정로", "죽봉대로", "백운로"] },
  { name: "운암", lat: 35.176, lng: 126.873, roads: ["하서로", "운암로", "동운로"] },
  { name: "두암", lat: 35.18, lng: 126.92, roads: ["동문대로", "두암로", "무등로"] },
  { name: "진월", lat: 35.118, lng: 126.886, roads: ["남문로", "진월로", "효덕로"] },
  { name: "오치", lat: 35.198, lng: 126.905, roads: ["설죽로", "오치로", "동운로"] },
  { name: "양동", lat: 35.156, lng: 126.9, roads: ["천변좌로", "양동로", "경열로"] },
  { name: "비아", lat: 35.236, lng: 126.832, roads: ["하남대로", "비아로", "산월로"] },
  { name: "효천", lat: 35.106, lng: 126.876, roads: ["효천로", "송암로", "대남대로"] },
  { name: "하남산단", lat: 35.196, lng: 126.785, roads: ["하남대로", "평동로", "어등대로"] },
] as const;

// 수도권 9지역.
export const CAPITAL_REGIONS: readonly Region[] = [
  { name: "강남", lat: 37.497, lng: 127.027, roads: ["테헤란로", "강남대로", "역삼로"] },
  { name: "여의도", lat: 37.521, lng: 126.924, roads: ["여의대로", "국회대로", "은행로"] },
  { name: "잠실", lat: 37.513, lng: 127.1, roads: ["올림픽로", "송파대로", "잠실로"] },
  { name: "구로", lat: 37.495, lng: 126.887, roads: ["디지털로", "경인로", "구로중앙로"] },
  { name: "홍대", lat: 37.557, lng: 126.924, roads: ["양화로", "월드컵북로", "와우산로"] },
  { name: "분당", lat: 37.382, lng: 127.119, roads: ["분당수서로", "성남대로", "황새울로"] },
  { name: "수원", lat: 37.263, lng: 127.029, roads: ["효원로", "권광로", "팔달로"] },
  { name: "고양", lat: 37.658, lng: 126.832, roads: ["중앙로", "고양대로", "일산로"] },
  { name: "인천송도", lat: 37.389, lng: 126.643, roads: ["센트럴로", "컨벤시아대로", "송도과학로"] },
] as const;

// 광역시 5지역.
export const METRO_REGIONS: readonly Region[] = [
  { name: "부산", lat: 35.18, lng: 129.075, roads: ["중앙대로", "해운대로", "수영로"] },
  { name: "대구", lat: 35.871, lng: 128.601, roads: ["달구벌대로", "동대구로", "중앙대로"] },
  { name: "대전", lat: 36.351, lng: 127.385, roads: ["대덕대로", "계룡로", "동서대로"] },
  { name: "울산", lat: 35.539, lng: 129.311, roads: ["삼산로", "번영로", "문수로"] },
  { name: "세종", lat: 36.48, lng: 127.289, roads: ["한누리대로", "도움로", "절재로"] },
] as const;

// 지역 라벨 → project[] (client-safe SSOT: 관심지역/추천/집계 공용).
export const REGION_PROJECTS: Record<string, readonly string[]> = {
  광주: ["aban", "gwangju-loop", "sangmu", "pungam"],
  수도권: ["seoul-loop", "gyeonggi", "incheon"],
  부산: ["busan"],
  대구: ["daegu"],
  대전: ["daejeon"],
  울산: ["ulsan"],
  세종: ["sejong"],
};

// ── Enums ──
export const WEATHERS = ["맑음", "비", "눈", "안개"] as const;
export const ROAD_SURFACES = ["dry", "wet", "snow"] as const;
export const TRAFFIC = ["low", "medium", "high"] as const;
export const LANE_STATUS = ["normal", "blocked", "merge"] as const;
export const OBJECT_TYPES = ["car", "truck", "bus", "motorcycle", "pedestrian", "bicycle"] as const;
export const INFERENCE_MODELS = ["yolov8-road-v3", "rtdetr-l-v2", "yolov8-road-v2"] as const;

// ── Time window ──
export const END_MS = Date.parse("2026-06-17T00:00:00Z");
export const WINDOW_DAYS = 30;
export const START_MS = END_MS - 30 * 86400000;

// ── DDL (4 tables, all idx INTEGER PRIMARY KEY) + indexes + WAL. ──
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS robot_position (
  idx INTEGER PRIMARY KEY,
  robot_id TEXT,
  project TEXT,
  ts INTEGER,
  lat REAL,
  lng REAL,
  road_name TEXT,
  heading REAL,
  speed REAL,
  accuracy REAL
);

CREATE TABLE IF NOT EXISTS observation (
  idx INTEGER PRIMARY KEY,
  position_idx INTEGER REFERENCES robot_position(idx),
  ts INTEGER,
  inference_model TEXT,
  object_type TEXT,
  object_count INTEGER,
  lane_status TEXT,
  traffic_density TEXT,
  weather_condition TEXT,
  road_surface TEXT,
  visibility INTEGER,
  confidence REAL
);

CREATE TABLE IF NOT EXISTS event (
  idx INTEGER PRIMARY KEY,
  position_idx INTEGER REFERENCES robot_position(idx),
  ts INTEGER,
  event_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  idx INTEGER PRIMARY KEY,
  position_idx INTEGER REFERENCES robot_position(idx),
  event_idx INTEGER REFERENCES event(idx),
  thumbnail TEXT,
  short_clip TEXT,
  live_stream TEXT,
  redacted_image TEXT,
  sensor_snapshot TEXT
);

CREATE INDEX IF NOT EXISTS idx_pos_ts ON robot_position(ts);
CREATE INDEX IF NOT EXISTS idx_pos_project ON robot_position(project);
CREATE INDEX IF NOT EXISTS idx_pos_road ON robot_position(road_name);
CREATE INDEX IF NOT EXISTS idx_event_type ON event(event_type);
CREATE INDEX IF NOT EXISTS idx_event_pos ON event(position_idx);
CREATE INDEX IF NOT EXISTS idx_obs_pos ON observation(position_idx);
CREATE INDEX IF NOT EXISTS idx_obs_weather ON observation(weather_condition);
CREATE INDEX IF NOT EXISTS idx_media_pos ON media(position_idx);
`;
