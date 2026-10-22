export type ConcernKey =
  | "acne" | "redness" | "age_spot" | "wrinkle"
  | "pore" | "moisture" | "texture" | "radiance";

export type ProductType =
  | "retinoid" | "niacinamide" | "azelaic" | "vitamin_c" | "exfoliant_aha_bha"
  | "benzoyl_peroxide" | "moisturiser" | "peptide" | "complexion" | "other";

export interface ConcernScore {
  raw: number; // YouCam raw_score, 1-100, higher = healthier
  ui: number;  // YouCam ui_score, 1-100 (calibrated, friendlier)
  mask?: string; // detection mask (PNG with alpha): a /demo/ path, or an "idb:" ref to a blob saved in IndexedDB
}

export interface CheckIn {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  photo?: string; // full-size photo: a /demo/ path, or an "idb:" ref to the blob saved in IndexedDB (never expires)
  thumb?: string; // small data-URL thumbnail kept in localStorage (fallback if IndexedDB is unavailable)
  scores: Partial<Record<ConcernKey, ConcernScore>>;
  overall?: number; // "all" score
  skinAge?: number;
  // live = your photo, live YouCam call; demo-real = seeded demo week (real recorded YouCam response);
  // recorded = you checked in on the public demo without live access, so the recorded sample result was saved
  source: "live" | "demo-real" | "recorded";
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

export interface SkinTone { hex: string; date: string; source: "live" | "demo-real"; eyeColor?: string; hairColor?: string }

export type VerdictKind = "KEEP" | "WAIT" | "DROP";

export interface Verdict {
  kind: VerdictKind;
  label: string;          // "KEEP" | "GIVE IT 4 MORE WEEKS" | "DROP" | "COLLECTING 1/3"
  collecting?: boolean;   // fewer than 3 check-ins since starting: no judgement yet
  shade?: { deltaE: number; skinHex: string; shadeHex: string }; // complexion products: fit vs YouCam Skin Tone
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
