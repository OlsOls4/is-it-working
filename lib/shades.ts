/**
 * A fictional foundation range used to demo shade matching. Not real products.
 * Matching = nearest shade to YouCam Skin Tone Analysis `skin_color` by CIE76 ΔE in Lab space.
 */
export interface Shade { code: string; name: string; hex: string; undertone: "cool" | "neutral" | "warm" }

export const RANGE = { brand: "Halo & Hue", product: "Second Skin Serum Foundation", price: 34 };

export const SHADES: Shade[] = [
  { code: "C110", name: "Porcelain", hex: "#f1d6c4", undertone: "cool" },
  { code: "N130", name: "Ivory", hex: "#ecceb4", undertone: "neutral" },
  { code: "W150", name: "Shell", hex: "#e6c09f", undertone: "warm" },
  { code: "C180", name: "Rose Beige", hex: "#ddb39b", undertone: "cool" },
  { code: "N200", name: "Natural Beige", hex: "#d6aa8a", undertone: "neutral" },
  { code: "W230", name: "Warm Beige", hex: "#cfa080", undertone: "warm" },
  { code: "N260", name: "Sand", hex: "#c39272", undertone: "neutral" },
  { code: "W300", name: "Honey", hex: "#b88160", undertone: "warm" },
  { code: "N340", name: "Caramel", hex: "#a36e4f", undertone: "neutral" },
  { code: "W380", name: "Amber", hex: "#8f5b3e", undertone: "warm" },
  { code: "N420", name: "Espresso", hex: "#6f4430", undertone: "neutral" },
  { code: "C460", name: "Ebony", hex: "#4f3024", undertone: "cool" },
];

function hexToLab(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  let [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function deltaE(a: string, b: string) {
  const [l1, a1, b1] = hexToLab(a), [l2, a2, b2] = hexToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Ranked matches with a 0-100 "match" figure (100 = identical, ΔE 20+ ≈ 0). */
export function matchShades(skinHex: string) {
  return SHADES.map((s) => {
    const d = deltaE(skinHex, s.hex);
    return { ...s, deltaE: Math.round(d * 10) / 10, match: Math.max(0, Math.round(100 - d * 5)) };
  }).sort((a, b) => a.deltaE - b.deltaE);
}
