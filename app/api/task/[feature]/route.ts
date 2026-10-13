import { NextResponse } from "next/server";
import { createTask, isDemoMode, readImage, uploadImage, YouCamError, type Feature } from "@/lib/youcam";
import { SKIN_ANALYSIS_ACTIONS } from "@/lib/concerns";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FEATURES: Feature[] = ["skin-analysis", "skin-tone-analysis", "makeup-vto"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const lighten = (hex: string, t: number) =>
  "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) + (255 - parseInt(hex.slice(i, i + 2), 16)) * t).toString(16).padStart(2, "0")).join("");

/**
 * POST /api/task/<feature>
 *   body: multipart {image, shade?} or JSON {imageDataUrl, shade?}
 *   -> { taskId, demo }
 * Live: uploads the image via the File API, then starts the YouCam task.
 * Demo: returns a placeholder id; GET returns the recorded fixture.
 */
export async function POST(req: Request, ctx: { params: Promise<{ feature: string }> }) {
  const { feature } = await ctx.params;
  if (!FEATURES.includes(feature as Feature)) return NextResponse.json({ error: "Unknown feature" }, { status: 404 });
  if (isDemoMode()) return NextResponse.json({ taskId: `demo-${feature}`, demo: true });

  const code = process.env.LIVE_ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return NextResponse.json({ error: "Live mode needs an access code" }, { status: 401 });
  }

  try {
    const clone = req.clone();
    const img = await readImage(req);
    if (!img) return NextResponse.json({ error: "No image supplied" }, { status: 400 });
    if (img.bytes.byteLength > 9.5 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 10 MB" }, { status: 413 });

    let shade: string | null = null;
    if (feature === "makeup-vto") {
      const ct = clone.headers.get("content-type") || "";
      shade = ct.includes("multipart") ? String((await clone.formData()).get("shade") || "") : (await clone.json().catch(() => ({})))?.shade;
      if (!shade || !HEX.test(shade)) return NextResponse.json({ error: "shade must be #RRGGBB" }, { status: 400 });
    }

    const fileId = await uploadImage(img.bytes, img.type, img.type === "image/png" ? "selfie.png" : "selfie.jpg");
    let body: Record<string, unknown>;
    if (feature === "skin-analysis") {
      // 8 SD concerns -> "5-8 concerns" tier (12 units). Separate PNG masks (we blend them client-side).
      body = { src_file_id: fileId, dst_actions: SKIN_ANALYSIS_ACTIONS, miniserver_args: { enable_mask_overlay: false }, format: "json" };
    } else if (feature === "skin-tone-analysis") {
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
    const taskId = await createTask(feature as Feature, body);
    return NextResponse.json({ taskId, demo: false });
  } catch (e) {
    const err = e as YouCamError;
    return NextResponse.json({ error: err.message || "YouCam request failed", code: err.code }, { status: err.status || 502 });
  }
}
