import { NextRequest, NextResponse } from "next/server";
import { all, get } from "@/lib/db";
import { parseFilters, buildWhere, Filters } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FacetRow = { v: string; c: number };

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);

  // Count a dimension's options while omitting that same dimension's selection
  // (so a chip stays clickable even after you select within its own group).
  function facet(omit: keyof Filters, col: string): FacetRow[] {
    const sub: Filters = { ...f, [omit]: [] as string[] };
    const { sql, params } = buildWhere(sub);
    return all<FacetRow>(
      `SELECT ${col} v, COUNT(*) c
       FROM robot_position p JOIN event e ON e.position_idx = p.idx ${sql}
       GROUP BY ${col} ORDER BY c DESC`,
      params
    );
  }

  const { sql, params, text } = buildWhere(f);
  const totalRow = get<{ c: number }>(
    `SELECT COUNT(*) c FROM robot_position p JOIN event e ON e.position_idx = p.idx ${sql}`,
    params
  );

  return NextResponse.json({
    total: totalRow?.c ?? 0,
    resolvedWhere: text,
    projects: facet("projects", "p.project"),
    events: facet("events", "e.event_type"),
    roads: facet("roads", "p.road_name"),
  });
}
