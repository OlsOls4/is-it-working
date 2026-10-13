import type { ConcernKey, ProductType } from "./types";

/** User-facing concern -> YouCam SD skin-analysis dst_action (same key). */
export const CONCERNS: { key: ConcernKey; label: string; short: string; colour: string; blurb: string }[] = [
  { key: "acne", label: "Acne", short: "Acne", colour: "#c2410c", blurb: "Active breakouts and blemishes" },
  { key: "redness", label: "Redness", short: "Redness", colour: "#be123c", blurb: "Flushing and irritation" },
  { key: "age_spot", label: "Dark spots", short: "Spots", colour: "#92400e", blurb: "Pigmentation and age spots" },
  { key: "wrinkle", label: "Wrinkles", short: "Lines", colour: "#4338ca", blurb: "Fine lines and wrinkles" },
  { key: "pore", label: "Pores", short: "Pores", colour: "#0f766e", blurb: "Pore visibility" },
  { key: "moisture", label: "Moisture", short: "Moisture", colour: "#0369a1", blurb: "Hydration" },
  { key: "texture", label: "Texture", short: "Texture", colour: "#6d28d9", blurb: "Smoothness and evenness" },
  { key: "radiance", label: "Radiance", short: "Glow", colour: "#a16207", blurb: "Brightness and glow" },
];

export const CONCERN_KEYS = CONCERNS.map((c) => c.key);
export const concernMeta = (k: ConcernKey) => CONCERNS.find((c) => c.key === k)!;

/** The 8 SD concerns sent to YouCam (5-8 concerns tier = 12 units per analysis, per /s2s/v2.0/credit/feature-cost). */
export const SKIN_ANALYSIS_ACTIONS: ConcernKey[] = [...CONCERN_KEYS];

/**
 * How long a product type typically needs before a fair verdict, in weeks.
 * Ranges reflect commonly cited dermatology guidance on time-to-visible-effect
 * (e.g. retinoids 8-12 weeks, niacinamide 4-8, azelaic acid 4-8).
 */
export const PRODUCT_TYPES: Record<ProductType, { label: string; min: number; max: number; purgeWeeks?: number; note: string }> = {
  retinoid: { label: "Retinoid (retinol, retinal, tretinoin)", min: 8, max: 12, purgeWeeks: 6, note: "Cell turnover takes time; early flare-ups ('purging') are common in weeks 2-6." },
  niacinamide: { label: "Niacinamide", min: 4, max: 8, note: "Effects on pores, oil and redness usually show by week 4-8." },
  azelaic: { label: "Azelaic acid", min: 4, max: 8, note: "Redness and spots typically respond in 4-8 weeks." },
  vitamin_c: { label: "Vitamin C", min: 6, max: 12, note: "Brightening and spot fading are gradual." },
  exfoliant_aha_bha: { label: "Exfoliant (AHA / BHA)", min: 3, max: 6, purgeWeeks: 3, note: "Texture often improves quickly; overuse can raise redness." },
  benzoyl_peroxide: { label: "Benzoyl peroxide", min: 4, max: 8, note: "Breakouts usually calm within 4-6 weeks." },
  moisturiser: { label: "Moisturiser / barrier cream", min: 2, max: 4, note: "Hydration effects should be visible within 2-4 weeks." },
  peptide: { label: "Peptides", min: 8, max: 12, note: "Firmness and lines change slowly." },
  complexion: { label: "Tinted / complexion product", min: 2, max: 4, note: "Skincare claims in tints are modest; shade fit matters most." },
  other: { label: "Something else", min: 4, max: 8, note: "Default 4-8 week window." },
};
