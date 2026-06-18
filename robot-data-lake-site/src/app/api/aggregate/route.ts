import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { parseFilters, buildWhere } from "@/lib/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const f = parseFilters(sp);
  const where = buildWhere(f);

  const base = `FROM robot_position p JOIN event e ON e.position_idx = p.idx ${where.sql}`;
  const p = where.params;

  const byEvent = all<{ event_type: string; c: number }>(
    `SELECT e.event_type, COUNT(*) c ${base} GROUP BY e.event_type ORDER BY c DESC`,
    p
  );
  const byProject = all<{ project: string; c: number }>(
    `SELECT p.project, COUNT(*) c ${base} GROUP BY p.project ORDER BY c DESC`,
    p
  );
  const byDay = all<{ day: string; c: number }>(
    `SELECT date(p.ts/1000,'unixepoch') day, COUNT(*) c ${base} GROUP BY day ORDER BY day ASC`,
    p
  );
  const hotspots = all<{ road_name: string; c: number }>(
    `SELECT p.road_name, COUNT(*) c ${base} GROUP BY p.road_name ORDER BY c DESC LIMIT 5`,
    p
  );

  return NextResponse.json({ byEvent, byProject, byDay, hotspots });
}
