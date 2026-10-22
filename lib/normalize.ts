import type { CheckIn, ConcernKey } from "./types";
import { CONCERN_KEYS } from "./concerns.ts";

/** Normalise a YouCam skin-analysis (format=json) task response into our CheckIn scores. */
export function normaliseSkinAnalysis(resp: any): Pick<CheckIn, "scores" | "overall" | "skinAge"> & { resized?: string } {
  const out: any[] = resp?.data?.results?.output ?? [];
  const scores: CheckIn["scores"] = {};
  let overall: number | undefined, skinAge: number | undefined, resized: string | undefined;
  for (const o of out) {
    if (o.type === "all") overall = o.score;
    else if (o.type === "skin_age") skinAge = o.score;
    else if (o.type === "resize_image") resized = o.mask_urls?.[0];
    else if ((CONCERN_KEYS as string[]).includes(o.type) && typeof o.raw_score === "number") {
      scores[o.type as ConcernKey] = { raw: o.raw_score, ui: o.ui_score, mask: o.mask_urls?.[0] };
    }
  }
  return { scores, overall, skinAge, resized };
}

export function normaliseSkinTone(resp: any) {
  const c = resp?.data?.results?.color ?? {};
  return {
    skinColor: c.skin_color as string | undefined,
    eyeColor: c.eye_color_name as string | undefined,
    lipColor: c.lip_color as string | undefined,
    hairColor: c.hair_color_name as string | undefined,
    faceQuality: resp?.data?.results?.face_quality,
  };
}

export function normaliseVto(resp: any) {
  return { url: resp?.data?.results?.url as string | undefined };
}

export function normaliseSimulation(resp: any) {
  return { url: resp?.data?.results?.url as string | undefined };
}

/** Our concern keys -> YouCam Skin Simulation parameter names (moisture has no simulation). */
export const SIMULATION_PARAM: Partial<Record<ConcernKey, string>> = {
  acne: "acne", redness: "redness", age_spot: "spots", wrinkle: "wrinkle", pore: "pores", texture: "texture", radiance: "radiance",
};
