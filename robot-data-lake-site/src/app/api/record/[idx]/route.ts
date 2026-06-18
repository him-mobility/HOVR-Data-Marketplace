import { NextResponse } from "next/server";
import { get } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaRow = {
  thumbnail: string | null;
  short_clip: string | null;
  live_stream: string | null;
  redacted_image: string | null;
  sensor_snapshot: string | null;
};

export async function GET(_req: Request, { params }: { params: { idx: string } }) {
  const idx = Number(params.idx);
  if (!Number.isInteger(idx)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const position = get<Record<string, unknown>>(
    `SELECT * FROM robot_position WHERE idx = ?`,
    [idx]
  );
  if (!position) {
    return NextResponse.json({ error: "레코드를 찾을 수 없습니다." }, { status: 404 });
  }

  const observation = get<Record<string, unknown>>(
    `SELECT * FROM observation WHERE position_idx = ?`,
    [idx]
  );
  const event = get<Record<string, unknown>>(
    `SELECT * FROM event WHERE position_idx = ?`,
    [idx]
  );
  const mediaRow = get<MediaRow>(
    `SELECT thumbnail, short_clip, live_stream, redacted_image, sensor_snapshot FROM media WHERE position_idx = ?`,
    [idx]
  );

  // Customer hygiene: never expose raw storage URLs (s3://…). Surface only
  // whether each asset kind is present.
  const media = mediaRow
    ? {
        hasThumbnail: !!mediaRow.thumbnail,
        hasClip: !!mediaRow.short_clip,
        hasLiveStream: !!mediaRow.live_stream,
        hasRedacted: !!mediaRow.redacted_image,
        hasSensorSnapshot: !!mediaRow.sensor_snapshot,
      }
    : undefined;

  return NextResponse.json({ position, observation, event, media });
}
