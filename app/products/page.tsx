"use client";
import Link from "next/link";
import { useVerdicts, fmtDate } from "@/lib/useVerdicts";
import { Stamp } from "@/components/Verdict";
import { concernMeta, PRODUCT_TYPES } from "@/lib/concerns";
import { actions } from "@/lib/store";

export default function Products() {
  const { state, verdicts } = useVerdicts();
  return (
    <div className="fade-in">
      <div className="eyebrow">Your shelf</div>
      <h1 style={{ marginTop: 6 }}>Products</h1>
      <p className="lede">Everything you're testing, with its verdict today.</p>
      <Link href="/products/new" className="btn block section">+ Add a product you're starting</Link>
      <div className="section">
        {verdicts.map(({ p, v }) => (
          <Link key={p.id} href={`/products/${p.id}`} className="card card-link" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small muted">{p.brand} · {PRODUCT_TYPES[p.type].label.split(" (")[0]}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 18 }}>{p.name}</div>
              <div className="small muted">For {concernMeta(p.concern).label.toLowerCase()} · since {fmtDate(p.startDate)}{p.stoppedDate ? ` · stopped ${fmtDate(p.stoppedDate)}` : ""}</div>
            </div>
            <Stamp v={v} />
          </Link>
        ))}
        {!verdicts.length && <p className="muted">No products yet.</p>}
      </div>

      <section className="section card" id="data">
        <h3>Your data</h3>
        <p className="small muted" style={{ margin: "6px 0 12px" }}>
          Everything lives in this browser (localStorage). No account, nothing stored on our server. Currently: <b>{state.kind === "demo" ? "demo profile" : "your own tracking"}</b>, {state.checkIns.length} check-ins.
        </p>
        <div className="btn-row">
          <button className="btn soft" onClick={() => { if (confirm("Clear everything and start your own tracking?")) actions.startFresh(); }}>Start my own</button>
          <button className="btn ghost" onClick={() => actions.resetDemo()}>Reload demo</button>
        </div>
      </section>
    </div>
  );
}
