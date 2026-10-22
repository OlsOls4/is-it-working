"use client";
import { useState } from "react";
import Link from "next/link";

const SURVEY = "https://professionalbeauty.co.uk/site/newsdetails/more-than-1-billion-in-skincare-products-wasted-uk";

export default function Retailers() {
  const [users, setUsers] = useState(10000);
  const [swapRate, setSwapRate] = useState(25);
  const [price, setPrice] = useState(17.51);
  const retained = users * (swapRate / 100) * price;
  const analyses = users * 52;

  return (
    <div className="fade-in">
      <div className="eyebrow">For retailers and brands</div>
      <h1 style={{ marginTop: 6 }}>Swap, <em>don't churn.</em></h1>
      <p className="lede" style={{ maxWidth: 720 }}>
        A white-label weekly check-in for your app or site. When a product isn't working, we keep the customer inside your catalogue with a matched swap they can try on first. When it is working, we turn that into a confident reorder.
      </p>

      <div className="retail-grid section">
        <div className="card">
          <h3>The problem you can't see</h3>
          <p className="small">In a 2022 survey of 2,000 UK adults for The Body Shop, people said they spend an average of <b>£17.51</b> per skincare product and have <b>two abandoned products</b> at home (about £35 each, over £1bn across the UK). <b>27%</b> abandoned a product because the formula wasn't right for their skin, and <b>18%</b> because it worked at first and then stopped. (<a href={SURVEY} target="_blank" rel="noreferrer">Professional Beauty</a>)</p>
          <p className="small muted">Opened skincare and make-up are rarely returnable, so “this didn't work for me” seldom shows up as a return. It shows up as a customer who doesn't reorder.</p>
        </div>
        <div className="card">
          <h3>What the widget does</h3>
          <ul className="reasons small">
            <li><b>Weekly 30-second check-in</b> scored by YouCam AI Skin Analysis (8 concerns + masks).</li>
            <li><b>Explainable verdict per product</b>: keep / give it N more weeks / drop, measured against the shopper's own noise and the product type's real time to work.</li>
            <li><b>KEEP → one-tap reorder</b> or subscribe-and-save, sent when the evidence says it works.</li>
            <li><b>DROP → a swap from your catalogue</b>: a different mechanism for skincare; for complexion products, a shade matched by YouCam Skin Tone Analysis and previewed with Makeup VTO.</li>
            <li><b>WAIT → don't let them quit early</b>, with a YouCam Skin Simulation of the improvement they're waiting for.</li>
          </ul>
        </div>
      </div>

      <div className="retail-grid section">
        <div className="card">
          <h3>Recurring, not one-off</h3>
          <p className="small">A skin quiz uses the shopper once. A tracker meets them every week of the product's life, at the exact moments that decide the next purchase: week 2 (“is it doing anything?”), the end of the fair-trial window, and the refill.</p>
          <div className="stat-row">
            <div><b className="num">1</b><span>analysis per shopper for a one-off quiz</span></div>
            <div><b className="num">~52</b><span>analyses per active tracker per year</span></div>
          </div>
          <p className="small muted">For YouCam that's recurring API use per retained customer rather than a single call.</p>
        </div>
        <div className="card">
          <h3>Pricing <span className="pill">proposal</span></h3>
          <p className="small">Per <b>active tracker</b> per month (a shopper who checked in that month), with YouCam API units passed through at cost. Inactive shoppers cost nothing. A pilot would test the price point; nothing here is a measured result.</p>
          <ul className="reasons small">
            <li>Starter: one product category, verdicts + reorder links.</li>
            <li>Growth: catalogue-aware swaps, shade matching + VTO, retailer analytics.</li>
            <li>Brand insights (later, opt-in, anonymised): real-world change by product and concern.</li>
          </ul>
        </div>
      </div>

      <div className="card section">
        <h3>Illustrative retained revenue</h3>
        <p className="small muted" style={{ margin: "4px 0 12px" }}>A back-of-envelope model, every input is an assumption you can change. It counts one product per swapped shopper per year and ignores lifetime value.</p>
        <div className="calc">
          <label className="field"><span>Active trackers</span><input className="input" type="number" min={0} value={users} onChange={(e) => setUsers(Math.max(0, Number(e.target.value)))} /></label>
          <label className="field"><span>Shoppers per year who'd have churned but swap instead (%)</span><input className="input" type="number" min={0} max={100} value={swapRate} onChange={(e) => setSwapRate(Math.min(100, Math.max(0, Number(e.target.value))))} /></label>
          <label className="field"><span>Average product price (£)</span><input className="input" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} /></label>
        </div>
        <div className="stat-row" style={{ marginTop: 14 }}>
          <div><b className="num">£{Math.round(retained).toLocaleString("en-GB")}</b><span>revenue kept in your catalogue per year</span></div>
          <div><b className="num">{analyses.toLocaleString("en-GB")}</b><span>weekly analyses per year</span></div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Default price £17.51 is the survey's average spend per skincare product. The swap rate is a placeholder, not a measured figure.</p>
      </div>

      <div className="card section" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="eyebrow" style={{ color: "#c9c0ad" }}>See the shopper side</div>
        <h2 style={{ marginTop: 6 }}>The whole loop in four taps</h2>
        <div className="btn-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
          <Link className="btn soft" href="/products/demo-azelaic">KEEP → reorder</Link>
          <Link className="btn soft" href="/products/demo-tint">DROP → wrong shade</Link>
          <Link className="btn soft" href="/try-on?product=demo-tint">Try the match</Link>
          <Link className="btn soft" href="/products/demo-retinal">WAIT → simulation</Link>
        </div>
      </div>
    </div>
  );
}
