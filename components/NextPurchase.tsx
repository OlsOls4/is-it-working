"use client";
import { useState } from "react";
import Link from "next/link";
import type { Product, Verdict, ConcernKey } from "@/lib/types";
import { matchShades, RANGE } from "@/lib/shades";
import { concernMeta } from "@/lib/concerns";
import Sheet from "./Sheet";

/** A different mechanism to try when a product for this concern fails (illustrative, not medical advice). */
const SWAP_MECHANISM: Record<ConcernKey, string> = {
  redness: "azelaic acid or niacinamide", acne: "benzoyl peroxide or a BHA", age_spot: "vitamin C or azelaic acid",
  wrinkle: "a retinoid", pore: "niacinamide or a BHA", moisture: "a ceramide barrier cream", texture: "an AHA exfoliant", radiance: "vitamin C",
};

/** Verdict -> the right next purchase: KEEP = one-tap reorder, DROP = a matched swap you can try first, WAIT = don't rebuy yet. */
export default function NextPurchase({ p, v, skinHex, compact }: { p: Product; v: Verdict; skinHex?: string; compact?: boolean }) {
  const [sheet, setSheet] = useState(false);
  if (v.collecting) return null;
  const best = p.complexion && skinHex ? matchShades(skinHex)[0] : null;

  if (v.kind === "KEEP") return (
    <div className={`np np-keep ${compact ? "compact" : ""}`}>
      <div style={{ flex: 1 }}>
        <div className="eyebrow">Next purchase · keep</div>
        <div className="np-title">Reorder {p.name}</div>
        <div className="small muted">It's measurably working, so rebuy with confidence{p.price ? ` · £${p.price}` : ""}.</div>
      </div>
      <button className="btn" onClick={() => setSheet(true)}>Reorder{p.price ? ` · £${p.price}` : ""}</button>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Added to basket">
        <p style={{ marginTop: 0 }}><b>{p.name}</b>{p.brand ? ` · ${p.brand}` : ""}{p.price ? ` · £${p.price}` : ""}</p>
        <p className="small muted">Demo checkout. In a retailer's version this is their one-tap reorder (or subscribe-and-save), sent at the moment the verdict says the product works.</p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setSheet(false)}>Keep browsing</button>
          <Link className="btn" href="/retailers">How retailers use this</Link>
        </div>
      </Sheet>
    </div>
  );

  if (v.kind === "DROP" && p.complexion) return (
    <Link href={`/try-on?product=${p.id}`} className={`np np-drop card-link ${compact ? "compact" : ""}`}>
      <div style={{ flex: 1 }}>
        <div className="eyebrow">Next purchase · swap, don't give up</div>
        <div className="np-title">{best ? <>{RANGE.product} <b>{best.code} {best.name}</b></> : "A shade that matches your skin"}</div>
        <div className="small">{best ? `ΔE ${best.deltaE} from your skin (${best.quality.toLowerCase()}) vs ΔE ${v.shade?.deltaE ?? "?"} for your tint. ` : ""}Try it on your own face before you buy →</div>
      </div>
      {best && <span className="pair-sw" aria-hidden><span style={{ background: v.shade?.shadeHex }} /><span style={{ background: best.hex }} /></span>}
    </Link>
  );

  if (v.kind === "DROP") return (
    <div className={`np np-drop ${compact ? "compact" : ""}`}>
      <div className="eyebrow">Next purchase · swap the mechanism</div>
      <div className="np-title">Don't rebuy. For {concernMeta(p.concern).label.toLowerCase()}, try {SWAP_MECHANISM[p.concern]} instead.</div>
      <div className="small muted">A different active, not the same one from a new brand. (Illustrative, not medical advice.)</div>
    </div>
  );

  return (
    <div className={`np np-wait ${compact ? "compact" : ""}`}>
      <div className="eyebrow">Next purchase · not yet</div>
      <div className="np-title">Finish the bottle before you decide</div>
      <div className="small muted">Re-judged in {v.moreWeeks} week{v.moreWeeks === 1 ? "" : "s"}. Rebuying or switching now would waste a fair trial.</div>
    </div>
  );
}
