// Server-only. Read-only singleton over the seeded SQLite database.
import fs from "node:fs";
import Database from "better-sqlite3";
import { DB_PATH } from "./paths";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `DB가 없습니다: ${DB_PATH}\n먼저 'npm run seed'를 실행해 데이터를 생성하세요.`
    );
  }
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  _db = db;
  return _db;
}

export function all<T = unknown>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function get<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}
