import { NextResponse } from "next/server";
import { getTask, type Feature } from "@/lib/youcam";
import { FIXTURES } from "@/lib/fixtures";
import { normaliseSkinAnalysis, normaliseSkinTone, normaliseVto } from "@/lib/normalize";
import { FALLBACK_MESSAGE, PHOTO_ERRORS, type FallbackReason } from "@/lib/fallback";

export const dynamic = "force-dynamic";

const FEATURES: Feature[] = ["skin-analysis", "skin-tone-analysis", "makeup-vto"];

function shape(feature: Feature, resp: any) {
  if (feature === "skin-analysis") return normaliseSkinAnalysis(resp);
  if (feature === "skin-tone-analysis") return normaliseSkinTone(resp);
  return normaliseVto(resp);
}
function recorded(f: Feature, fallback?: FallbackReason, detail?: string) {
  const fx = FIXTURES[f];
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
  if (taskId.startsWith("demo-")) return recorded(f);
  try {
    const resp = await getTask(f, taskId);
    const status = resp?.data?.task_status;
    if (status === "success") {
      try { return NextResponse.json({ status, demo: false, result: shape(f, resp) }); }
      catch { return recorded(f, "api-error", "unexpected response shape"); }
    }
    if (status === "error") {
      const code = resp?.data?.error;
      // Photo problems are the user's to fix: report them (the client offers the recorded result as well).
      if (code && PHOTO_ERRORS.includes(code)) return NextResponse.json({ status, demo: false, error: code, message: resp?.data?.error_message, canFallback: true });
      const credit = /credit|unit|balance|insufficient/i.test(`${code} ${resp?.data?.error_message || ""}`);
      return recorded(f, credit ? "credits" : "api-error", `${code || "error"} ${resp?.data?.error_message || ""}`.trim());
    }
    return NextResponse.json({ status: "running", demo: false });
  } catch (e) {
    console.error(`[youcam] ${f} poll failed:`, (e as Error).message);
    return recorded(f, "api-error", String((e as Error).message || "").slice(0, 160));
  }
}
