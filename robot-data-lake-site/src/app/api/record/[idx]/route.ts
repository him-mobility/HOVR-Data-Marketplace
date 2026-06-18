import { NextResponse } from "next/server";
import { get } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { idx: string } }) {
  const idx = Number(params.idx);
  if (!Number.isInteger(idx)) {
    return NextResponse.json({ error: "invalid idx" }, { status: 400 });
  }

  const position = get(`SELECT * FROM robot_position WHERE idx = ?`, [idx]);
  if (!position) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const observation = get(`SELECT * FROM observation WHERE position_idx = ?`, [idx]);
  const event = get(`SELECT * FROM event WHERE position_idx = ?`, [idx]);
  const media = get(`SELECT * FROM media WHERE position_idx = ?`, [idx]);

  return NextResponse.json({ position, observation, event, media });
}
