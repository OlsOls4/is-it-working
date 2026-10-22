/**
 * Seeded demo user: 9 weekly check-ins (weeks 0-8), three products and one skin-tone reading.
 *
 * EVERY SCORE AND MASK IS A REAL YouCam RESPONSE. Each week's scores come verbatim from a live
 * YouCam Skin Analysis v2.1 call (SD, 8 concerns) recorded in fixtures/series/ (see lib/demo-series.ts,
 * generated from those files; lib/verdict.test.ts checks they match).
 *
 * The photos are a synthetic series (no real person): week 0 is an AI-generated face; weeks 1-8 keep
 * its luma (texture, pores, lines, spots) and move the colour channels towards an AI-generated
 * "calmer skin" variant on an azelaic-acid-like schedule, with small exposure / white-balance jitter
 * so the weeks are as noisy as real check-ins (scripts/make-series.py). YouCam then measured them.
 *
 * The skin-tone reading (#b8957c) is a real YouCam Skin Tone Analysis of the week-8 photo
 * (fixtures/skin-tone.w08.real.json).
 */
import type { CheckIn, Product, SkinTone } from "./types";
import { DEMO_SERIES } from "./demo-series.ts";
import { localISO } from "./dates.ts";

export const DEMO_SKIN_HEX = "#b8957c";
export const DEMO_PHOTO = (w: number) => `/demo/series/w${String(w).padStart(2, "0")}/photo.jpg`;
export const DEMO_TINT_SHADE = { name: "Medium 04", hex: "#c18466" };

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Dates are relative to "today" so the demo always looks current: week 8 was yesterday. */
export function buildDemo(today = new Date()): { checkIns: CheckIn[]; products: Product[]; skinTone: SkinTone } {
  const w0 = addDays(today, -57);
  const dateOf = (week: number) => localISO(addDays(w0, week * 7));

  const checkIns: CheckIn[] = DEMO_SERIES.map((wk) => ({
    id: `demo-w${wk.week}`,
    date: dateOf(wk.week),
    photo: DEMO_PHOTO(wk.week),
    scores: Object.fromEntries(Object.entries(wk.scores).map(([k, s]) => [k, { ...s }])),
    overall: wk.overall,
    skinAge: wk.skinAge,
    source: "demo-real",
  }));

  const products: Product[] = [
    { id: "demo-azelaic", name: "Calm Down Azelaic 10% Serum", brand: "Fieldnote Skin", type: "azelaic", concern: "redness", startDate: dateOf(0), price: 18 },
    { id: "demo-tint", name: "Dew Tint Hydrating Skin Tint", brand: "Halo & Hue", type: "complexion", concern: "moisture", startDate: dateOf(1), price: 32, complexion: true, shadeName: DEMO_TINT_SHADE.name, shadeHex: DEMO_TINT_SHADE.hex },
    { id: "demo-retinal", name: "Night Shift Retinal 0.05%", brand: "Fieldnote Skin", type: "retinoid", concern: "texture", startDate: dateOf(4), price: 28 },
  ];
  const skinTone: SkinTone = { hex: DEMO_SKIN_HEX, date: dateOf(8), source: "demo-real", eyeColor: "Brown", hairColor: "Auburn" };
  return { checkIns, products, skinTone };
}
