"use client";
export type Feature = "skin-analysis" | "skin-tone-analysis" | "makeup-vto";

export async function getMode(): Promise<{ demo: boolean; accessCodeRequired?: boolean }> {
  const r = await fetch("/api/mode", { cache: "no-store" });
  return r.json();
}

/** Start a YouCam task through our server route and poll it to completion. */
export async function runTask<T = any>(
  feature: Feature,
  image: Blob | null,
  extra: Record<string, string> = {},
  onStatus?: (s: string) => void,
): Promise<{ result: T; demo: boolean; provenance?: string }> {
  const form = new FormData();
  if (image) form.append("image", image, "selfie.jpg");
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  const headers: Record<string, string> = {};
  const code = typeof window !== "undefined" ? localStorage.getItem("iiw:access") : null;
  if (code) headers["x-access-code"] = code;
  onStatus?.("uploading");
  const start = await fetch(`/api/task/${feature}`, { method: "POST", body: form, headers });
  const s = await start.json();
  if (!start.ok) throw new Error(s.error || "Could not start analysis");
  onStatus?.("analysing");
  const t0 = Date.now();
  for (;;) {
    const r = await fetch(`/api/task/${feature}/${encodeURIComponent(s.taskId)}`, { cache: "no-store" });
    const j = await r.json();
    if (j.status === "success") return { result: j.result, demo: j.demo, provenance: j.provenance };
    if (j.status === "error") throw new Error(friendlyError(j.error, j.message));
    if (Date.now() - t0 > 90_000) throw new Error("Analysis timed out — please try again.");
    await new Promise((res) => setTimeout(res, 2500));
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
