import "server-only";
/**
 * Best-effort, in-memory per-IP daily limit for live YouCam calls (per serverless instance).
 * The access code is the real guard; this just stops one tester looping and draining units.
 */
const hits = new Map<string, number>();
let globalHits = { day: "", n: 0 };
const PER_IP = Number(process.env.LIVE_DAILY_LIMIT_PER_IP || 6);
const GLOBAL = Number(process.env.LIVE_DAILY_LIMIT_GLOBAL || 40);

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns true and counts the call if allowed. */
export function takeLiveSlot(req: Request): boolean {
  const day = new Date().toISOString().slice(0, 10);
  if (globalHits.day !== day) { globalHits = { day, n: 0 }; hits.clear(); }
  const key = `${day}|${clientIp(req)}`;
  const n = hits.get(key) || 0;
  if (n >= PER_IP || globalHits.n >= GLOBAL) return false;
  hits.set(key, n + 1); globalHits.n++;
  return true;
}
