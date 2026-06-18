// Small helper to wrap a route handler so thrown errors become a clean 500
// JSON response (never leaking a stack trace or SQL to the customer).
import { NextResponse } from "next/server";

type Handler = (req: Request, ctx: any) => Promise<Response> | Response;

export function safe(handler: Handler): Handler {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      // Log server-side only; do not surface details to the client.
      console.error("[api] handler error:", err);
      return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 500 });
    }
  };
}
