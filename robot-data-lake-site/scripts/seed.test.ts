// scripts/seed.test.ts — validation gate (vitest). pretest re-seeds first.
// 6 invariants that pin the data layer (esp. mulberry32 unique-coord survival).
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { TOTAL, EVENT_TYPES } from "../src/lib/schema";
import { DB_PATH } from "../src/lib/paths";

const extra: unknown[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "extra-records.json"), "utf8")
);
const EXPECTED = TOTAL + extra.length; // 98,043

let db: Database.Database;
const count = (sql: string, params: unknown[] = []): number =>
  (db.prepare(sql).get(...params) as { c: number }).c;

beforeAll(() => {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`DB가 없습니다: ${DB_PATH} — 먼저 'npm run seed'`);
  }
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
});

describe("seed validation gate", () => {
  it("1) robot_position COUNT == EXPECTED", () => {
    expect(count("SELECT COUNT(*) c FROM robot_position")).toBe(EXPECTED);
  });

  it("2) unique (lat,lng) > 95,000 (PRNG collapse guard)", () => {
    const uniq = count("SELECT COUNT(*) c FROM (SELECT DISTINCT lat, lng FROM robot_position)");
    expect(uniq).toBeGreaterThan(95_000);
  });

  it("3) all 7 event slugs present AND event COUNT == EXPECTED", () => {
    const slugs = new Set(
      (db.prepare("SELECT DISTINCT event_type FROM event").all() as { event_type: string }[]).map(
        (r) => r.event_type
      )
    );
    for (const e of EVENT_TYPES) expect(slugs.has(e.slug)).toBe(true);
    expect(slugs.size).toBe(EVENT_TYPES.length);
    expect(count("SELECT COUNT(*) c FROM event")).toBe(EXPECTED);
  });

  it("4) observation == EXPECTED, event == EXPECTED, media in (30000, 37000)", () => {
    expect(count("SELECT COUNT(*) c FROM observation")).toBe(EXPECTED);
    expect(count("SELECT COUNT(*) c FROM event")).toBe(EXPECTED);
    const media = count("SELECT COUNT(*) c FROM media");
    expect(media).toBeGreaterThan(30_000);
    expect(media).toBeLessThan(37_000);
  });

  it("5) rain-accident-rate / clear-accident-rate in [1.5, 2.2]", () => {
    const rate = (weather: string): number => {
      const acc = count(
        `SELECT COUNT(*) c FROM event e
           JOIN observation o ON o.position_idx = e.position_idx
          WHERE e.event_type = 'accident' AND o.weather_condition = ?`,
        [weather]
      );
      const tot = count("SELECT COUNT(*) c FROM observation WHERE weather_condition = ?", [weather]);
      return acc / tot;
    };
    const ratio = rate("비") / rate("맑음");
    expect(ratio).toBeGreaterThanOrEqual(1.5);
    expect(ratio).toBeLessThanOrEqual(2.2);
  });

  it("6) idx ascending matches ts ascending for idx <= TOTAL", () => {
    const rows = db
      .prepare("SELECT idx, ts FROM robot_position WHERE idx <= ? ORDER BY idx ASC")
      .all(TOTAL) as { idx: number; ts: number }[];
    let prev = -Infinity;
    let violations = 0;
    for (const r of rows) {
      if (r.ts < prev) violations++;
      prev = r.ts;
    }
    expect(violations).toBe(0);
  });
});
