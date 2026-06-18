// In-memory sliding-window rate limit. Single process (one `npm start`).
// Default: 15 requests / 60s / key. Applied to /api/agent · /api/chat (· /api/recommend).
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 15, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false; // blocked
  }
  arr.push(now);
  hits.set(key, arr);
  return true; // allowed
}

export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : req.headers.get("x-real-ip") || "anon").trim();
  return ip.slice(0, 64);
}
