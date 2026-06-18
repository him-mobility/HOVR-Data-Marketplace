import { NextResponse } from "next/server";
import { all, get } from "@/lib/db";
import { parseFilters, buildWhere, type Filters } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FacetRow = { v: string; c: number };

type Dim = "projects" | "events" | "roads";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const f = parseFilters(sp);
  const fullWhere = buildWhere(f);

  // Total = rows matching ALL active filters.
  const totalRow = get<{ c: number }>(
    `SELECT COUNT(*) c
       FROM robot_position p
       JOIN event e ON e.position_idx = p.idx
       ${fullWhere.sql}`,
    fullWhere.params
  );

  // Count one dimension while applying all OTHER active filters (omit own dim).
  function facet(omit: Dim, col: string): FacetRow[] {
    const sub: Filters = { ...f, [omit]: undefined };
    const w = buildWhere(sub);
    return all<FacetRow>(
      `SELECT ${col} v, COUNT(*) c
         FROM robot_position p
         JOIN event e ON e.position_idx = p.idx
         ${w.sql}
        GROUP BY ${col}
        ORDER BY c DESC`,
      w.params
    );
  }

  return NextResponse.json({
    total: totalRow?.c ?? 0,
    resolvedWhere: fullWhere.text,
    projects: facet("projects", "p.project"),
    events: facet("events", "e.event_type"),
    roads: facet("roads", "p.road_name"),
  });
}
