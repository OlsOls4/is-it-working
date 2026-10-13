import Link from "next/link";
import { isDemoMode } from "@/lib/youcam";

export const dynamic = "force-dynamic";

export default function About() {
  const demo = isDemoMode();
  return (
    <div className="fade-in">
      <div className="eyebrow">How it works</div>
      <h1 style={{ marginTop: 6 }}>Verdicts, <em>not vibes</em>.</h1>
      <p className="lede">Most people give up on a product too early — or keep buying one that never worked. Is It Working? turns a weekly selfie into evidence.</p>

      <section className="section card">
        <h3>1 · Weekly check-in → YouCam Skin Analysis</h3>
        <p className="small muted">A guided selfie (framing oval, lighting check) is sent server-side to <b>YouCam AI Skin Analysis v2.1</b> for 8 SD concerns: acne, redness, dark spots, wrinkles, pores, moisture, texture, radiance. We store the raw scores and detection masks per week.</p>
      </section>
      <section className="card">
        <h3>2 · Deterministic verdict engine</h3>
        <ul className="reasons small">
          <li>Baseline = average of up to 2 check-ins before you started; "now" = average of your last 2.</li>
          <li>Noise = how much <i>your</i> score wobbles week to week (residuals around your trend). A change must beat 2 standard errors to count.</li>
          <li>Each product type has a fair-verdict window (retinoids 8–12 weeks, niacinamide 4–8, azelaic acid 4–8, moisturisers 2–4…). Flat before the window → wait; flat after → drop.</li>
          <li>Needs at least 3 check-ins since starting. Retinoid/acid "purge" windows don't count as failure. Overlapping products on the same concern lower confidence.</li>
        </ul>
      </section>
      <section className="card">
        <h3>3 · Try before you buy</h3>
        <p className="small muted">For a dropped or complexion product, <b>YouCam Skin Tone Analysis</b> reads your skin colour, we match the nearest shade (ΔE in Lab space), and <b>YouCam Makeup VTO</b> renders foundation + concealer on your selfie before you buy.</p>
      </section>

      <section className="section card" id="modes">
        <h3>Demo vs live</h3>
        <p className="small" style={{ marginTop: 6 }}>This deployment is in <b className="mono">{demo ? "DEMO" : "LIVE"}</b> mode.</p>
        <ul className="reasons small">
          <li><b>Real:</b> week-0 skin analysis scores and masks, and the foundation try-on image, are recorded responses from the live YouCam API on a synthetic AI-generated face (no real person).</li>
          <li><b>Simulated:</b> weeks 1–8 scores (same response shape), the week 4/8 photos (AI-generated variants), and the skin-tone response (documented schema; 20 units was over budget).</li>
          <li>Live mode: set <span className="mono">YOUCAM_API_KEY</span> and <span className="mono">DEMO_MODE=0</span>. Calls go server-side only; the key never reaches the browser.</li>
        </ul>
      </section>
      <p className="foot">Your data stays in this browser. <Link href="/products#data">Manage data</Link> · MIT licensed · Not medical advice.</p>
    </div>
  );
}
