import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/img?u=<YouCam result URL>
 * YouCam returns masks / try-on images as signed S3 links served as "binary/octet-stream", which some browsers
 * refuse to render in <img>. We re-serve them with the right image type. Only YouCam's S3 hosts are allowed.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") || "";
  let url: URL;
  try { url = new URL(u); } catch { return NextResponse.json({ error: "bad url" }, { status: 400 }); }
  if (url.protocol !== "https:" || !/(^|\.)amazonaws\.com$/.test(url.hostname) || !/^yce/.test(url.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }
  const r = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!r || !r.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
  const buf = Buffer.from(await r.arrayBuffer());
  const type = buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg" : "image/png";
  return new NextResponse(buf, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" } });
}
