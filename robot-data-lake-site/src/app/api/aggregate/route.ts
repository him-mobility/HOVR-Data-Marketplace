import { NextRequest, NextResponse } from "next/server";
import { all } from "@/lib/db";
import { parseFilters, buildWhere } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const f = parseFilters(req.nextUrl.searchParams);
  const { sql, params } = buildWhere(f);
  const base = `FROM robot_position p JOIN event e ON e.position_idx = p.idx ${sql}`;

  const byEvent = all<{ event_type: string; c: number }>(
    `SELECT e.event_type event_type, COUNT(*) c ${base} GROUP BY e.event_type ORDER BY c DESC`,
    params
  );
  const byProject = all<{ project: string; c: number }>(
    `SELECT p.project project, COUNT(*) c ${base} GROUP BY p.project ORDER BY c DESC`,
    params
  );
  const byDay = all<{ day: string; c: number }>(
    `SELECT date(p.ts/1000,'unixepoch') day, COUNT(*) c ${base} GROUP BY day ORDER BY day ASC`,
    params
  );
  const hotspots = all<{ road_name: string; c: number }>(
    `SELECT p.road_name road_name, COUNT(*) c ${base} GROUP BY p.road_name ORDER BY c DESC LIMIT 5`,
    params
  );

  return NextResponse.json({ byEvent, byProject, byDay, hotspots });
}
