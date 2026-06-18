import { NextRequest, NextResponse } from "next/server";
import { all } from "@/lib/db";
import { parseFilters, buildWhere } from "@/lib/query";
import { EVENT_TYPES } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// slug -> index (event color/legend ordering)
const E_INDEX: Record<string, number> = Object.fromEntries(
  EVENT_TYPES.map((e, i) => [e.slug, i])
);

type Row = { lng: number; lat: number; et: string; idx: number };

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { sql, params } = buildWhere(f);

  const rows = all<Row>(
    `SELECT p.lng, p.lat, e.event_type et, p.idx
     FROM robot_position p JOIN event e ON e.position_idx = p.idx ${sql}`,
    params
  );

  const points: number[][] = rows.map((r) => [r.lng, r.lat, E_INDEX[r.et] ?? 0, r.idx]);
  const { text } = buildWhere(f);

  return NextResponse.json({ total: points.length, points, resolvedWhere: text });
}
