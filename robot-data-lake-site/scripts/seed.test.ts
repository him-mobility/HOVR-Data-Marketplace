import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { TOTAL, EVENT_TYPES } from "../src/lib/schema";
import { DB_PATH } from "../src/lib/paths";

const extra = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "scripts", "extra-records.json"), "utf8")
) as unknown[];
const EXPECTED = TOTAL + extra.length; // 98,043

let db: Database.Database;
const count = (sql: string): number => (db.prepare(sql).get() as { c: number }).c;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
});
afterAll(() => {
  db.close();
});

describe("seed invariants", () => {
  it("robot_position COUNT == EXPECTED", () => {
    expect(count("SELECT COUNT(*) c FROM robot_position")).toBe(EXPECTED);
  });

  it("unique (lat,lng) > 95,000 (PRNG not collapsed = mulberry32 not LCG)", () => {
    const unique = count("SELECT COUNT(*) c FROM (SELECT DISTINCT lat, lng FROM robot_position)");
    expect(unique).toBeGreaterThan(95_000);
  });

  it("all 7 event slugs exist & event COUNT == EXPECTED", () => {
    expect(count("SELECT COUNT(*) c FROM event")).toBe(EXPECTED);
    const slugs = new Set(
      (db.prepare("SELECT DISTINCT event_type t FROM event").all() as { t: string }[]).map((r) => r.t)
    );
    for (const e of EVENT_TYPES) expect(slugs.has(e.slug)).toBe(true);
    expect(slugs.size).toBe(EVENT_TYPES.length);
  });

  it("observation == EXPECTED, event == EXPECTED, media in (30k, 37k)", () => {
    expect(count("SELECT COUNT(*) c FROM observation")).toBe(EXPECTED);
    expect(count("SELECT COUNT(*) c FROM event")).toBe(EXPECTED);
    const media = count("SELECT COUNT(*) c FROM media");
    expect(media).toBeGreaterThan(30_000);
    expect(media).toBeLessThan(37_000);
  });

  it("rain accident rate / clear accident rate in [1.5, 2.2]", () => {
    const rate = (weather: string): number => {
      const total = count(
        `SELECT COUNT(*) c FROM observation WHERE weather_condition='${weather}'`
      );
      const accidents = (db
        .prepare(
          `SELECT COUNT(*) c FROM event e JOIN observation o ON o.position_idx = e.position_idx WHERE e.event_type='accident' AND o.weather_condition=?`
        )
        .get(weather) as { c: number }).c;
      return accidents / total;
    };
    const ratio = rate("비") / rate("맑음");
    expect(ratio).toBeGreaterThanOrEqual(1.5);
    expect(ratio).toBeLessThanOrEqual(2.2);
  });

  it("idx matches ts ascending order (generated idx <= TOTAL only)", () => {
    const rows = db
      .prepare("SELECT idx, ts FROM robot_position WHERE idx <= ? ORDER BY idx ASC")
      .all(TOTAL) as { idx: number; ts: number }[];
    let prevTs = -Infinity;
    for (const row of rows) {
      expect(row.ts).toBeGreaterThanOrEqual(prevTs);
      prevTs = row.ts;
    }
  });
});
