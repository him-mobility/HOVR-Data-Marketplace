// server-only: tiny wrapper that turns thrown errors into a 500 JSON response.
import { NextResponse } from "next/server";

export function safe<T extends (...args: never[]) => Promise<Response>>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : "internal error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }) as T;
}
