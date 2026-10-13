/**
 * Server-only YouCam API client. Never import from a client component.
 * Docs: https://docs.perfectcorp.com/reference/ai_skin_analysis ,
 *       https://docs.perfectcorp.com/reference/ai_skin_tone_analysis ,
 *       https://docs.perfectcorp.com/reference/makeup_vto ,
 *       https://docs.perfectcorp.com/reference/file
 *
 * Flow for every feature:
 *   1. POST /s2s/v2.0/file  {files:[{content_type,file_name,file_size}]} -> data.files[0].{file_id, requests[0].{url,headers}}
 *   2. PUT the bytes to the pre-signed url with the returned headers
 *   3. POST /s2s/v2.x/task/<feature> {src_file_id, ...}                -> data.task_id
 *   4. GET  /s2s/v2.x/task/<feature>/<task_id>                          -> data.task_status running|success|error
 */
import "server-only";

export type Feature = "skin-analysis" | "skin-tone-analysis" | "makeup-vto";

const BASE = process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com";
const VERSION: Record<Feature, string> = {
  "skin-analysis": "v2.1",
  "skin-tone-analysis": "v2.0",
  "makeup-vto": "v2.0",
};

/** Deployment-level: true when no key is set or DEMO_MODE=1. Individual requests can still be demo (see liveGate). */
export function isDemoMode() {
  return !process.env.YOUCAM_API_KEY || process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
}
export const liveConfigured = () => !isDemoMode();

/** Units per call, from GET /s2s/v2.0/credit/feature-cost (skin analysis = SD, 5-8 concerns). */
export const UNIT_COST: Record<Feature, number> = { "skin-analysis": 12, "skin-tone-analysis": 20, "makeup-vto": 1 };

export type GateReason = "demo-deployment" | "forced-demo" | "no-access-code-configured" | "access-code-missing" | "access-code-wrong";
/**
 * Decides whether THIS request may call the live API. Live calls need:
 * a key + DEMO_MODE=0, a LIVE_ACCESS_CODE configured on the server, and the matching x-access-code header.
 * Anything else is served the recorded demo, so a public URL can never drain units.
 */
export function liveGate(req: Request): { live: true } | { live: false; reason: GateReason } {
  if (isDemoMode()) return { live: false, reason: "demo-deployment" };
  if (req.headers.get("x-force-demo") === "1") return { live: false, reason: "forced-demo" };
  const code = process.env.LIVE_ACCESS_CODE;
  if (!code) return { live: false, reason: "no-access-code-configured" };
  const sent = req.headers.get("x-access-code");
  if (!sent) return { live: false, reason: "access-code-missing" };
  if (sent.trim() !== code) return { live: false, reason: "access-code-wrong" };
  return { live: true };
}

let creditCache: { at: number; units: number } | null = null;
/** Remaining units (GET /s2s/v1.0/client/credit, costs nothing). Cached 60 s per instance. null if unknown. */
export async function getCredit(): Promise<number | null> {
  if (creditCache && Date.now() - creditCache.at < 60_000) return creditCache.units;
  try {
    const r = await fetch(`${BASE}/s2s/v1.0/client/credit`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    if (!r.ok || !Array.isArray(j?.results)) { console.error("[youcam] credit check failed", r.status, JSON.stringify(j).slice(0, 200)); return null; }
    const units = j.results.reduce((a: number, x: any) => a + (Number(x.amount_dec ?? x.amount) || 0), 0);
    creditCache = { at: Date.now(), units };
    return units;
  } catch { return null; }
}
export function spendCredit(units: number) { if (creditCache) creditCache.units -= units; }

function headers(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`, "Content-Type": "application/json", ...extra };
}

export class YouCamError extends Error {
  constructor(message: string, public status = 502, public code?: string) { super(message); }
}

async function json(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.status && body.status !== 200)) {
    throw new YouCamError(body.error || `YouCam HTTP ${res.status}`, res.status >= 400 && res.status < 500 ? res.status : 502, body.error_code);
  }
  return body;
}

export async function uploadImage(bytes: ArrayBuffer, contentType: string, fileName = "selfie.jpg"): Promise<string> {
  const init = await json(await fetch(`${BASE}/s2s/v2.0/file`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }] }),
  }));
  const file = init?.data?.files?.[0];
  const req = file?.requests?.[0];
  if (!file?.file_id || !req?.url) throw new YouCamError("File API returned no upload URL");
  const put = await fetch(req.url, { method: req.method || "PUT", headers: req.headers || { "Content-Type": contentType }, body: bytes });
  if (!put.ok) throw new YouCamError(`Upload to storage failed (${put.status})`);
  return file.file_id as string;
}

export async function createTask(feature: Feature, body: Record<string, unknown>): Promise<string> {
  const r = await json(await fetch(`${BASE}/s2s/${VERSION[feature]}/task/${feature}`, {
    method: "POST", headers: headers(), body: JSON.stringify(body),
  }));
  const id = r?.data?.task_id;
  if (!id) throw new YouCamError("No task_id returned");
  return id;
}

export async function getTask(feature: Feature, taskId: string) {
  return json(await fetch(`${BASE}/s2s/${VERSION[feature]}/task/${feature}/${encodeURIComponent(taskId)}`, {
    headers: headers(), cache: "no-store",
  }));
}

/** Reads an uploaded image from a multipart form (field "image") or JSON {imageDataUrl}. */
export async function readImage(req: Request): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const f = form.get("image");
    if (f && typeof f !== "string") return { bytes: await f.arrayBuffer(), type: f.type || "image/jpeg" };
    return null;
  }
  const body = await req.json().catch(() => null);
  const url: string | undefined = body?.imageDataUrl;
  if (!url?.startsWith("data:")) return null;
  const [meta, b64] = url.split(",");
  const type = meta.slice(5, meta.indexOf(";")) || "image/jpeg";
  const buf = Buffer.from(b64, "base64");
  return { bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, type };
}
