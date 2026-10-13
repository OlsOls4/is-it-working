import { NextResponse } from "next/server";
import { getTask, isDemoMode, YouCamError, type Feature } from "@/lib/youcam";
import { FIXTURES } from "@/lib/fixtures";
import { normaliseSkinAnalysis, normaliseSkinTone, normaliseVto } from "@/lib/normalize";

export const dynamic = "force-dynamic";

const FEATURES: Feature[] = ["skin-analysis", "skin-tone-analysis", "makeup-vto"];

function shape(feature: Feature, resp: any) {
  if (feature === "skin-analysis") return normaliseSkinAnalysis(resp);
  if (feature === "skin-tone-analysis") return normaliseSkinTone(resp);
  return normaliseVto(resp);
}

/** GET /api/task/<feature>/<taskId> -> { status: running|success|error, result?, demo, provenance? } */
export async function GET(_req: Request, ctx: { params: Promise<{ feature: string; taskId: string }> }) {
  const { feature, taskId } = await ctx.params;
  if (!FEATURES.includes(feature as Feature)) return NextResponse.json({ error: "Unknown feature" }, { status: 404 });
  const f = feature as Feature;

  if (isDemoMode() || taskId.startsWith("demo-")) {
    const fx = FIXTURES[f];
    return NextResponse.json({ status: "success", demo: true, provenance: fx._meta.source, result: shape(f, fx.response), raw: fx.response });
  }
  try {
    const resp = await getTask(f, taskId);
    const status = resp?.data?.task_status;
    if (status === "success") return NextResponse.json({ status, demo: false, result: shape(f, resp) });
    if (status === "error") return NextResponse.json({ status, demo: false, error: resp?.data?.error || "error", message: resp?.data?.error_message });
    return NextResponse.json({ status: "running", demo: false });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ status: "error", error: err.message }, { status: err.status || 502 });
  }
}
