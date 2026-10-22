import "server-only";
import skin from "@/fixtures/series/skin-analysis.w08.real.json";
import tone from "@/fixtures/skin-tone.w08.real.json";
import vto from "@/fixtures/makeup-vto.5N.real.json";
import vtoTint from "@/fixtures/makeup-vto.tint-medium04.real.json";
import sim from "@/fixtures/skin-simulation.texture.real.json";
import type { Feature } from "./youcam";

/**
 * Recorded responses served in demo mode. ALL are real YouCam API responses on the synthetic week-8 face
 * (result images downloaded to /public/demo so they don't expire); see each file's _meta.
 */
export const FIXTURES: Record<Feature, { _meta: any; response: any }> = {
  "skin-analysis": skin as any,
  "skin-tone-analysis": tone as any,
  "makeup-vto": vto as any,
  "skin-simulation": sim as any,
};
/** Extra recorded variants, addressable as demo-<feature>~<variant>. */
export const VARIANTS: Partial<Record<Feature, Record<string, { _meta: any; response: any }>>> = {
  "makeup-vto": { tint: vtoTint as any },
};
