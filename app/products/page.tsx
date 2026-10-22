"use client";
import { useState } from "react";
import Link from "next/link";
import { useVerdicts, fmtDate, plural } from "@/lib/useVerdicts";
import { Stamp } from "@/components/Verdict";
import Sheet from "@/components/Sheet";
import Skeleton from "@/components/Skeleton";
import { useMode } from "@/components/ModeProvider";
import { concernMeta, PRODUCT_TYPES } from "@/lib/concerns";
import { actions } from "@/lib/store";

export default function Products() {
  const { state, verdicts } = useVerdicts();
  const { demo } = useMode();
  const [startSheet, setStartSheet] = useState(false);
  if (!state.ready) return <Skeleton />;
  const samples = state.checkIns.filter((c) => c.source === "recorded").length;
  return (
    <div className="fade-in narrow">
      <div className="eyebrow">Your shelf</div>
      <h1 style={{ marginTop: 6 }}>Products</h1>
      <p className="lede">Everything you're testing, with its verdict today.</p>
      <Link href="/products/new" className="btn block section">+ Add a product you're starting</Link>
      <div className="section">
        {verdicts.map(({ p, v }) => (
          <div key={p.id} className="card product-row">
            <Link href={`/products/${p.id}`} className="card-link" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small muted">{p.brand ? `${p.brand} · ` : ""}{PRODUCT_TYPES[p.type].label.split(" (")[0]}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 18 }}>{p.name}</div>
                <div className="small muted">For {concernMeta(p.concern).label.toLowerCase()} · since {fmtDate(p.startDate)}{p.stoppedDate ? ` · stopped ${fmtDate(p.stoppedDate)}` : ""}</div>
              </div>
              <Stamp v={v} />
            </Link>
            {p.complexion && <Link href={`/try-on?product=${p.id}`} className="row-action">Check your shade with YouCam Skin Tone + try it on →</Link>}
          </div>
        ))}
        {!verdicts.length && (
          <div className="card empty"><h3>No products yet</h3><p className="small muted">Add what you're starting, then check in weekly. Verdicts appear after 3 check-ins.</p></div>
        )}
      </div>

      <section className="section card" id="data">
        <h3>Your data</h3>
        <p className="small muted" style={{ margin: "6px 0 12px" }}>
          Everything lives in this browser (localStorage for scores, IndexedDB for photos and masks). No account, nothing stored on our server.
          Currently: <b>{state.kind === "demo" ? "the seeded demo profile" : "your own tracking"}</b>, {plural(state.checkIns.length, "check-in")}{samples ? ` (${samples} sample)` : ""}.
        </p>
        <div className="btn-row">
          <button className="btn soft" onClick={() => setStartSheet(true)}>Start my own</button>
          <button className="btn ghost" onClick={() => actions.resetDemo()}>{state.kind === "demo" ? "Reset demo" : "Back to the demo"}</button>
        </div>
      </section>

      <Sheet open={startSheet} onClose={() => setStartSheet(false)} title="Start your own tracking?">
        <p className="small" style={{ marginTop: 0 }}>This clears the demo profile from this browser. You'll add the products you're starting and check in once a week; a verdict appears after 3 check-ins since a product's start.</p>
        {demo ? (
          <div className="banner demo">
            <span aria-hidden>◆</span>
            <span><b>This browser is in demo mode</b> (no live access code), so every analysis returns our recorded sample result for the synthetic face, not yours. You can still add products and save check-ins — they'll be marked “sample” — but they can't produce a real verdict about your skin. For live YouCam analysis, open the app with the access code from the Devpost testing instructions. To explore full verdicts, keep the demo profile.</span>
          </div>
        ) : (
          <p className="small muted">Live mode is on: your check-ins are analysed by YouCam and saved only on this device.</p>
        )}
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setStartSheet(false)}>Keep the demo</button>
          <button className="btn" onClick={() => { actions.startFresh(); setStartSheet(false); }}>Start my own</button>
        </div>
      </Sheet>
    </div>
  );
}
