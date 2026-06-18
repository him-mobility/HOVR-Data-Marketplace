import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
export function middleware(req: NextRequest) {
  const pass = process.env.DEMO_PASSWORD;
  if (!pass) return NextResponse.next();           // 미설정 → 게이트 없음(로컬 영향 X)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try { const provided = atob(auth.slice(6)).split(":").slice(1).join(":"); if (provided === pass) return NextResponse.next(); } catch {}
  }
  return new NextResponse("인증이 필요합니다 (HOVR 데모).", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="HOVR Demo"' } });
}
