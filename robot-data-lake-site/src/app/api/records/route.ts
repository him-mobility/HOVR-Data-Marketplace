import { NextRequest, NextResponse } from "next/server";
import { all, get } from "@/lib/db";
import { parseFilters, buildWhere } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  const i = Math.trunc(n);
  return Math.min(max, Math.max(min, i));
}

type Row = {
  idx: number; robot_id: string; project: string; ts: number; lat: number; lng: number;
  road_name: string; event_type: string; weather_condition: string; confidence: number;
  object_type: string; object_count: number;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const f = parseFilters(sp);
  const { sql, params, text } = buildWhere(f);

  const limit = clampInt(sp.get("limit"), 25, 1, 300);
  const offset = Math.max(0, clampInt(sp.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER));

  const base = `FROM robot_position p
     JOIN event e ON e.position_idx = p.idx
     JOIN observation o ON o.position_idx = p.idx ${sql}`;

  const totalRow = get<{ c: number }>(`SELECT COUNT(*) c ${base}`, params);

  const rows = all<Row>(
    `SELECT p.idx, p.robot_id, p.project, p.ts, p.lat, p.lng, p.road_name,
            e.event_type, o.weather_condition, o.confidence, o.object_type, o.object_count
     ${base}
     ORDER BY p.idx DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // resolvedSql is intentionally the human-readable filter summary — raw SQL/
  // table/column names are never exposed to the customer surface.
  return NextResponse.json({ total: totalRow?.c ?? 0, limit, offset, resolvedSql: text, rows });
}
