/**
 * Seeded demo user: 9 weekly check-ins (weeks 0-8) and three products.
 *
 * WEEK 0 IS REAL: its scores are copied verbatim from a live YouCam Skin Analysis v2.1
 * response (fixtures/skin-analysis.week00.real.json) on a synthetic, AI-generated face.
 * lib/verdict.test.ts asserts these numbers match the fixture.
 *
 * WEEKS 1-8 ARE SIMULATED: plausible raw_score series in the exact shape of the real
 * response, hand-authored so the three products tell three different stories.
 * ui_score for simulated weeks = real week-0 ui_score + 0.55 x raw change (rounded).
 * Photos: week 0 = the analysed synthetic face; weeks 4 and 8 = AI-generated variants
 * of the same face (week 4 is a 50/50 blend). Masks exist only for week 0 (real).
 */
import type { CheckIn, ConcernKey, Product } from "./types";

export const WEEK0_REAL: Record<ConcernKey, { raw: number; ui: number }> = {
  pore: { raw: 57.80260956287384, ui: 71 },
  redness: { raw: 69.44927978515625, ui: 76 },
  radiance: { raw: 60.76193451881409, ui: 72 },
  texture: { raw: 61.10827326774597, ui: 72 },
  wrinkle: { raw: 92.91607141494751, ui: 86 },
  acne: { raw: 84.69006, ui: 83 },
  age_spot: { raw: 76.60674285888672, ui: 73 },
  moisture: { raw: 53.70643138885498, ui: 71 },
};
export const WEEK0_OVERALL = 75.5;
export const WEEK0_SKIN_AGE = 36;

// SIMULATED weeks 1..8 (raw_score). Week 0 comes from WEEK0_REAL.
const SIM: Record<ConcernKey, number[]> = {
  redness: [70.6, 72.4, 72.0, 74.6, 75.9, 76.8, 78.1, 78.6], // azelaic acid working
  moisture: [54.4, 53.1, 54.0, 52.8, 53.9, 53.2, 52.6, 53.4], // skin tint doing nothing
  texture: [60.6, 61.6, 60.9, 61.4, 61.0, 62.1, 61.8, 62.6], // retinal: early days
  acne: [85.1, 84.4, 85.6, 85.9, 85.2, 86.3, 86.0, 86.7],
  age_spot: [76.2, 77.0, 76.8, 77.4, 76.9, 77.6, 77.8, 78.1],
  wrinkle: [93.1, 92.6, 92.9, 93.3, 92.8, 93.0, 93.4, 93.1],
  pore: [58.3, 57.4, 58.6, 57.9, 58.2, 57.7, 58.5, 58.1],
  radiance: [61.2, 61.9, 61.5, 62.6, 62.3, 63.4, 63.1, 63.9],
};
const OVERALL_SIM = [75.8, 76.0, 76.2, 76.9, 77.0, 77.6, 77.9, 78.3];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Dates are relative to "today" so the demo always looks current: week 8 was yesterday. */
export function buildDemo(today = new Date()): { checkIns: CheckIn[]; products: Product[] } {
  const w0 = addDays(today, -57);
  const dateOf = (week: number) => iso(addDays(w0, week * 7));
  const photoOf: Record<number, string> = { 0: "/demo/week-00.jpg", 4: "/demo/week-04.jpg", 8: "/demo/week-08.jpg" };

  const checkIns: CheckIn[] = [];
  for (let w = 0; w <= 8; w++) {
    const scores: CheckIn["scores"] = {};
    (Object.keys(WEEK0_REAL) as ConcernKey[]).forEach((k) => {
      const r0 = WEEK0_REAL[k];
      if (w === 0) scores[k] = { raw: r0.raw, ui: r0.ui, mask: `/demo/masks/${k}.png` };
      else {
        const raw = SIM[k][w - 1];
        scores[k] = { raw, ui: Math.round(r0.ui + 0.55 * (raw - r0.raw)) };
      }
    });
    checkIns.push({
      id: `demo-w${w}`,
      date: dateOf(w),
      photo: photoOf[w],
      scores,
      overall: w === 0 ? WEEK0_OVERALL : OVERALL_SIM[w - 1],
      skinAge: w === 0 ? WEEK0_SKIN_AGE : undefined,
      source: w === 0 ? "demo-real" : "demo-simulated",
    });
  }

  const products: Product[] = [
    { id: "demo-azelaic", name: "Calm Down Azelaic 10% Serum", brand: "Fieldnote Skin", type: "azelaic", concern: "redness", startDate: dateOf(0), price: 18 },
    { id: "demo-tint", name: "Dew Tint Hydrating Skin Tint", brand: "Halo & Hue", type: "complexion", concern: "moisture", startDate: dateOf(1), price: 32, complexion: true, shadeName: "Medium 04", shadeHex: "#c18466" },
    { id: "demo-retinal", name: "Night Shift Retinal 0.05%", brand: "Fieldnote Skin", type: "retinoid", concern: "texture", startDate: dateOf(4), price: 28 },
  ];
  return { checkIns, products };
}
