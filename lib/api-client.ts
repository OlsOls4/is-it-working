"use client";
import { friendlyError, type AnyFeature } from "./fallback";
import { getBlob, isIdbRef } from "./blobstore";
import { DEMO_TINT_SHADE } from "./demo-data";
export type Feature = AnyFeature;

export type Mode = { demo: boolean; liveConfigured?: boolean; accessCodeRequired?: boolean; accessOk?: boolean; reason?: string };

/** Headers that tell the server whether this browser may use live mode (access code) or wants the demo. */
export function modeHeaders(forceDemo = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (typeof window === "undefined") return h;
  const code = localStorage.getItem("iiw:access");
  if (code) h["x-access-code"] = code;
  if (forceDemo || localStorage.getItem("iiw:forceDemo") === "1") h["x-force-demo"] = "1";
  return h;
}

export async function getMode(): Promise<Mode> {
  const r = await fetch("/api/mode", { cache: "no-store", headers: modeHeaders() });
  return r.json();
}

export class TaskError extends Error {
  /** canFallback: the recorded result can be shown instead; code: YouCam error code (photo problems -> retake). */
  constructor(message: string, public canFallback = false, public code?: string) { super(message); }
}

/** Start a YouCam task through our server route and poll it to completion. */
export async function runTask<T = any>(
  feature: Feature,
  image: Blob | null,
  extra: Record<string, string> = {},
  onStatus?: (s: string) => void,
  opts: { forceDemo?: boolean } = {},
): Promise<{ result: T; demo: boolean; provenance?: string; notice?: string }> {
  const form = new FormData();
  if (image) form.append("image", image, "selfie.jpg");
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  const headers = modeHeaders(opts.forceDemo);
  const recorded = async (notice: string) => {
    const r = await fetch(`/api/task/${feature}/demo-${feature}${extra.shade?.toLowerCase() === DEMO_TINT_SHADE.hex ? "~tint" : ""}`, { cache: "no-store" });
    const j = await r.json();
    return { result: j.result as T, demo: true, provenance: j.provenance, notice };
  };
  onStatus?.("uploading");
  let s: any;
  try {
    const start = await fetch(`/api/task/${feature}`, { method: "POST", body: form, headers });
    s = await start.json();
    if (!start.ok) throw new TaskError(s.error || "Could not start analysis", start.status >= 500);
  } catch (e) {
    if (e instanceof TaskError && !e.canFallback) throw e;
    return recorded("Couldn't reach the analysis service — showing a recorded result.");
  }
  onStatus?.("analysing");
  const t0 = Date.now();
  for (;;) {
    let j: any;
    try { j = await (await fetch(`/api/task/${feature}/${encodeURIComponent(s.taskId)}`, { cache: "no-store" })).json(); }
    catch { j = { status: "running" }; }
    if (j.status === "success") return { result: j.result, demo: j.demo, provenance: j.provenance, notice: j.notice || s.notice };
    if (j.status === "error") throw new TaskError(friendlyError(j.error, feature, j.message), true, j.error);
    if (Date.now() - t0 > 90_000) return recorded("The live YouCam API took too long — showing a recorded result.");
    await new Promise((res) => setTimeout(res, s.demo ? 600 : 2500));
  }
}

/** Downscale to <=1600px long side, JPEG ~0.9, and return blob + mean luminance (0-255) for a lighting hint. */
export async function prepareImage(src: Blob | HTMLCanvasElement): Promise<{ blob: Blob; dataUrl: string; luminance: number; width: number; height: number }> {
  let bmp: CanvasImageSource; let w: number; let h: number;
  if (src instanceof HTMLCanvasElement) { bmp = src; w = src.width; h = src.height; }
  else { const b = await createImageBitmap(src); bmp = b; w = b.width; h = b.height; }
  const scale = Math.min(1, 1600 / Math.max(w, h));
  const cw = Math.round(w * scale), ch = Math.round(h * scale);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const ctx = c.getContext("2d")!; ctx.drawImage(bmp, 0, 0, cw, ch);
  const sample = ctx.getImageData(Math.round(cw * 0.3), Math.round(ch * 0.3), Math.max(1, Math.round(cw * 0.4)), Math.max(1, Math.round(ch * 0.4))).data;
  let sum = 0; for (let i = 0; i < sample.length; i += 16) sum += 0.2126 * sample[i] + 0.7152 * sample[i + 1] + 0.0722 * sample[i + 2];
  const luminance = sum / (sample.length / 16);
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.9));
  // small thumbnail for localStorage
  const t = document.createElement("canvas"); const ts = 360 / Math.max(cw, ch); t.width = Math.round(cw * ts); t.height = Math.round(ch * ts);
  t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
  return { blob, dataUrl: t.toDataURL("image/jpeg", 0.75), luminance, width: cw, height: ch };
}

/** Pixel size of an image blob. */
export async function imageSize(b: Blob) { const bmp = await createImageBitmap(b); const r = { width: bmp.width, height: bmp.height }; bmp.close?.(); return r; }

/**
 * The full-size photo behind a check-in, for re-analysis (skin tone / VTO / simulation).
 * idb: refs and /demo/ files are full size; a data: URL is only the 360px localStorage thumbnail, so we return null
 * and the caller asks for a fresh photo instead of sending YouCam an image it will reject.
 */
export async function fullSizePhoto(src?: string): Promise<Blob | null> {
  if (!src || src.startsWith("data:")) return null;
  if (isIdbRef(src)) return getBlob(src);
  try { const r = await fetch(src); return r.ok ? await r.blob() : null; } catch { return null; }
}
