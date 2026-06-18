import { NextResponse } from "next/server";
import { all, get } from "@/lib/db";
import { parseFilters, buildWhere } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const f = parseFilters(sp);
  const where = buildWhere(f);

  const limit = clampInt(sp.get("limit"), 25, 1, 300);
  const offset = clampInt(sp.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);

  const base = `FROM robot_position p
       JOIN event e ON e.position_idx = p.idx
       JOIN observation o ON o.position_idx = p.idx
       ${where.sql}`;

  const totalRow = get<{ c: number }>(`SELECT COUNT(*) c ${base}`, where.params);

  const sql = `SELECT p.idx, p.robot_id, p.project, p.ts, p.lat, p.lng, p.road_name,
       e.event_type, o.weather_condition, o.confidence, o.object_type, o.object_count
     ${base}
     ORDER BY p.idx DESC
     LIMIT ? OFFSET ?`;

  const rows = all<Record<string, unknown>>(sql, [...where.params, limit, offset]);

  return NextResponse.json({
    total: totalRow?.c ?? 0,
    limit,
    offset,
    resolvedSql: sql,
    rows,
  });
}
