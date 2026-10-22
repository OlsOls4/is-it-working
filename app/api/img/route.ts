import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** YouCam result storage: the bucket every mask / try-on / simulation URL has come from (same bucket, alternate endpoints). */
const ALLOWED_HOSTS = new Set(["yce-us.s3-accelerate.amazonaws.com", "yce-us.s3.us-west-2.amazonaws.com", "yce-us.s3.amazonaws.com"]);
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * GET /api/img?u=<YouCam result URL>
 * YouCam returns masks / try-on images as signed S3 links served as "binary/octet-stream", which some browsers
 * refuse to render in <img>. We re-serve them with the right image type. Exact YouCam hosts only, 10 s timeout,
 * 10 MB cap, images only. The client copies each result into IndexedDB on save, because the links expire after ~2 h.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") || "";
  let url: URL;
  try { url = new URL(u); } catch { return NextResponse.json({ error: "bad url" }, { status: 400 }); }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.port) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }
  const r = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r || !r.ok) return NextResponse.json({ error: r?.status === 403 ? "expired" : "upstream" }, { status: r?.status === 403 ? 410 : 502 });
  if (Number(r.headers.get("content-length") || 0) > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  const png = buf[0] === 0x89 && buf[1] === 0x50, jpg = buf[0] === 0xff && buf[1] === 0xd8;
  if (!png && !jpg) return NextResponse.json({ error: "not an image" }, { status: 415 });
  return new NextResponse(buf, { headers: { "Content-Type": png ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
