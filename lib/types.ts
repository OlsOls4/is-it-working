export type ConcernKey =
  | "acne" | "redness" | "age_spot" | "wrinkle"
  | "pore" | "moisture" | "texture" | "radiance";

export type ProductType =
  | "retinoid" | "niacinamide" | "azelaic" | "vitamin_c" | "exfoliant_aha_bha"
  | "benzoyl_peroxide" | "moisturiser" | "peptide" | "complexion" | "other";

export interface ConcernScore {
  raw: number; // YouCam raw_score, 1-100, higher = healthier
  ui: number;  // YouCam ui_score, 1-100 (calibrated, friendlier)
  mask?: string; // URL of the detection mask (PNG with alpha)
}

export interface CheckIn {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  photo?: string; // URL or data URL
  scores: Partial<Record<ConcernKey, ConcernScore>>;
  overall?: number; // "all" score
  skinAge?: number;
  source: "live" | "demo-real" | "demo-simulated";
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  type: ProductType;
  concern: ConcernKey;
  startDate: string; // ISO date
  stoppedDate?: string;
  price?: number;
  complexion?: boolean; // tinted / foundation-like product -> shade match + VTO
  shadeName?: string;
  shadeHex?: string;
}

export type VerdictKind = "KEEP" | "WAIT" | "DROP";

export interface Verdict {
  kind: VerdictKind;
  label: string;          // "KEEP" | "GIVE IT 4 MORE WEEKS" | "DROP"
  moreWeeks?: number;
  headline: string;       // one-line plain-English
  reasons: string[];      // supporting bullet points
  confidence: number;     // 0-100
  confidenceLabel: "Low" | "Medium" | "High";
  stats: {
    baseline: number | null;
    current: number | null;
    delta: number | null;
    noise: number;
    threshold: number;
    weeksOn: number;
    checkInsSince: number;
    windowMin: number;
    windowMax: number;
    overlaps: string[];
  };
}
