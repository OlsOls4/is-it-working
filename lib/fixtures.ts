import "server-only";
import skin from "@/fixtures/skin-analysis.week00.real.json";
import tone from "@/fixtures/skin-tone.week00.simulated.json";
import vto from "@/fixtures/makeup-vto.foundation.real.json";
import type { Feature } from "./youcam";

/** Recorded responses served in demo mode. skin-analysis + makeup-vto are REAL; skin-tone is SIMULATED (see _meta). */
export const FIXTURES: Record<Feature, { _meta: any; response: any }> = {
  "skin-analysis": skin as any,
  "skin-tone-analysis": tone as any,
  "makeup-vto": vto as any,
};
