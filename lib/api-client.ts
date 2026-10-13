"use client";
export type Feature = "skin-analysis" | "skin-tone-analysis" | "makeup-vto";

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
  constructor(message: string, public canFallback = false) { super(message); }
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
    const r = await fetch(`/api/task/${feature}/demo-${feature}`, { cache: "no-store" });
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
    if (j.status === "error") throw new TaskError(friendlyError(j.error, j.message), true);
    if (Date.now() - t0 > 90_000) return recorded("The live YouCam API took too long — showing a recorded result.");
    await new Promise((res) => setTimeout(res, s.demo ? 600 : 2500));
  }
}

function friendlyError(code?: string, msg?: string) {
  const map: Record<string, string> = {
    error_src_face_too_small: "Your face is too small in the frame — move closer so it fills the oval.",
    error_src_face_out_of_bound: "Part of your face is outside the frame — centre it in the oval.",
    error_lighting_dark: "It's too dark — face a window or a soft light.",
    error_no_face: "We couldn't find a face. Look straight at the camera.",
    error_pose: "Look straight ahead — head level, not tilted.",
    error_below_min_image_size: "That photo is too small (needs at least 480px on the short side).",
  };
  return (code && map[code]) || msg || code || "Analysis failed";
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
