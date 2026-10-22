import { NextResponse } from "next/server";
import { FEATURES, getTask, type Feature } from "@/lib/youcam";
import { FIXTURES, VARIANTS } from "@/lib/fixtures";
import { normaliseSimulation, normaliseSkinAnalysis, normaliseSkinTone, normaliseVto } from "@/lib/normalize";
import { FALLBACK_MESSAGE, isPhotoError, type FallbackReason } from "@/lib/fallback";

export const dynamic = "force-dynamic";

function shape(feature: Feature, resp: any) {
  if (feature === "skin-analysis") return normaliseSkinAnalysis(resp);
  if (feature === "skin-tone-analysis") return normaliseSkinTone(resp);
  if (feature === "skin-simulation") return normaliseSimulation(resp);
  return normaliseVto(resp);
}
/** Route YouCam's S3 result links through /api/img so browsers render them (they're served as octet-stream). */
const via = (u?: string) => (u && /^https:\/\//.test(u) ? `/api/img?u=${encodeURIComponent(u)}` : u);
function proxied(r: any) {
  if (r?.scores) for (const k of Object.keys(r.scores)) r.scores[k].mask = via(r.scores[k].mask);
  if (r?.resized) r.resized = via(r.resized);
  if (r?.url) r.url = via(r.url);
  return r;
}
function recorded(f: Feature, variant?: string, fallback?: FallbackReason, detail?: string) {
  const fx = (variant && VARIANTS[f]?.[variant]) || FIXTURES[f];
  return NextResponse.json({
    status: "success", demo: true, provenance: fx._meta.source, result: shape(f, fx.response),
    ...(fallback ? { fallback, notice: FALLBACK_MESSAGE[fallback], detail } : {}),
  });
}

/** GET /api/task/<feature>/<taskId> -> { status: running|success|error, result?, demo, provenance?, fallback?, notice? } */
export async function GET(_req: Request, ctx: { params: Promise<{ feature: string; taskId: string }> }) {
  const { feature, taskId } = await ctx.params;
  if (!FEATURES.includes(feature as Feature)) return NextResponse.json({ error: "Unknown feature" }, { status: 404 });
  const f = feature as Feature;

  // Demo task ids always resolve to the recorded fixture, whatever DEMO_MODE says.
  if (taskId.startsWith("demo-")) return recorded(f, decodeURIComponent(taskId).split("~")[1]);
  try {
    const resp = await getTask(f, taskId);
    const status = resp?.data?.task_status;
    if (status === "success") {
      try { return NextResponse.json({ status, demo: false, result: proxied(shape(f, resp)) }); }
      catch { return recorded(f, undefined, "api-error", "unexpected response shape"); }
    }
    if (status === "error") {
      const code = resp?.data?.error;
      // Photo problems are the user's to fix: report them (the client asks for a retake and offers the recorded result).
      if (isPhotoError(code)) return NextResponse.json({ status, demo: false, error: code, message: resp?.data?.error_message, canFallback: true });
      const credit = /credit|unit|balance|insufficient/i.test(`${code} ${resp?.data?.error_message || ""}`);
      return recorded(f, undefined, credit ? "credits" : "api-error", `${code || "error"} ${resp?.data?.error_message || ""}`.trim());
    }
    return NextResponse.json({ status: "running", demo: false });
  } catch (e) {
    console.error(`[youcam] ${f} poll failed:`, (e as Error).message);
    return recorded(f, undefined, "api-error", String((e as Error).message || "").slice(0, 160));
  }
}
