import { NextResponse } from "next/server";
import { createTask, getCredit, liveGate, readImage, spendCredit, uploadImage, UNIT_COST, type Feature } from "@/lib/youcam";
import { SKIN_ANALYSIS_ACTIONS } from "@/lib/concerns";
import { takeLiveSlot } from "@/lib/ratelimit";
import { FALLBACK_MESSAGE, type FallbackReason } from "@/lib/fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FEATURES: Feature[] = ["skin-analysis", "skin-tone-analysis", "makeup-vto"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const lighten = (hex: string, t: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) + (255 - parseInt(hex.slice(i, i + 2), 16)) * t).toString(16).padStart(2, "0")).join("");

const demo = (feature: string, fallback?: FallbackReason, detail?: string) =>
  NextResponse.json({ taskId: `demo-${feature}`, demo: true, ...(fallback ? { fallback, notice: FALLBACK_MESSAGE[fallback], detail } : {}) });

/**
 * POST /api/task/<feature>
 *   body: multipart {image, shade?} or JSON {imageDataUrl, shade?}
 *   -> { taskId, demo, fallback?, notice? }
 * Live (key + DEMO_MODE=0 + valid x-access-code): uploads via the File API, then starts the YouCam task.
 * Otherwise, or if credits are short / the API errors / the daily limit is hit: a demo task id whose GET returns the
 * recorded fixture. This route never fails because of YouCam.
 */
export async function POST(req: Request, ctx: { params: Promise<{ feature: string }> }) {
  const { feature } = await ctx.params;
  if (!FEATURES.includes(feature as Feature)) return NextResponse.json({ error: "Unknown feature" }, { status: 404 });
  const f = feature as Feature;
  if (!liveGate(req).live) return demo(f);

  // Validate input first (cheap, no units).
  const clone = req.clone();
  const img = await readImage(req).catch(() => null);
  if (!img) return NextResponse.json({ error: "No image supplied" }, { status: 400 });
  if (img.bytes.byteLength > 9.5 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 10 MB" }, { status: 413 });
  let shade: string | null = null;
  if (f === "makeup-vto") {
    const ct = clone.headers.get("content-type") || "";
    shade = ct.includes("multipart") ? String((await clone.formData()).get("shade") || "") : (await clone.json().catch(() => ({})))?.shade;
    if (!shade || !HEX.test(shade)) return NextResponse.json({ error: "shade must be #RRGGBB" }, { status: 400 });
  }

  const units = await getCredit();
  if (units !== null && units < UNIT_COST[f]) return demo(f, "credits", `${units} units left, ${UNIT_COST[f]} needed`);
  if (!takeLiveSlot(req)) return demo(f, "rate-limit");

  try {
    const fileId = await uploadImage(img.bytes, img.type, img.type === "image/png" ? "selfie.png" : "selfie.jpg");
    let body: Record<string, unknown>;
    if (f === "skin-analysis") {
      // 8 SD concerns -> "5-8 concerns" tier (12 units). Separate PNG masks (we blend them client-side).
      body = { src_file_id: fileId, dst_actions: SKIN_ANALYSIS_ACTIONS, miniserver_args: { enable_mask_overlay: false }, format: "json" };
    } else if (f === "skin-tone-analysis") {
      body = { src_file_id: fileId, face_angle_strictness_level: "medium" };
    } else {
      body = {
        src_file_id: fileId,
        version: "1.0",
        effects: [
          { category: "foundation", palettes: [{ color: shade, colorIntensity: 55, glowIntensity: 15, coverageIntensity: 60 }] },
          { category: "concealer", palettes: [{ color: lighten(shade!, 0.12), colorIntensity: 45, colorUnderEyeIntensity: 50, coverageLevel: 55 }] },
        ],
      };
    }
    const taskId = await createTask(f, body);
    spendCredit(UNIT_COST[f]);
    return NextResponse.json({ taskId, demo: false });
  } catch (e) {
    const msg = String((e as Error).message || "");
    const credit = /credit|unit|balance|insufficient|quota/i.test(msg) || (e as any).status === 402;
    console.error(`[youcam] ${f} start failed:`, msg);
    return demo(f, credit ? "credits" : "api-error", msg.slice(0, 160));
  }
}
