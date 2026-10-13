"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useVerdicts, fmtDate } from "@/lib/useVerdicts";
import { Stamp, Confidence } from "@/components/Verdict";
import TrendChart from "@/components/TrendChart";
import { concernMeta, PRODUCT_TYPES } from "@/lib/concerns";
import { actions } from "@/lib/store";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, verdicts } = useVerdicts();
  const hit = verdicts.find((x) => x.p.id === id);
  if (!hit) return <div className="section"><Link href="/" className="back">← Today</Link><p>Product not found.</p></div>;
  const { p, v } = hit;
  const c = concernMeta(p.concern);
  const type = PRODUCT_TYPES[p.type];
  const s = v.stats;
  const pct = (w: number) => `${Math.min(100, (w / (type.max + 2)) * 100)}%`;
  const colour = v.kind === "KEEP" ? "#1f6b47" : v.kind === "DROP" ? "#b93a14" : "#a8660a";

  return (
    <div className="fade-in">
      <Link href="/" className="back">← Today</Link>
      <div className="eyebrow">{p.brand} · {c.label}</div>
      <h1 style={{ marginTop: 6, fontSize: 32 }}>{p.name}</h1>
      <div style={{ margin: "18px 0 6px" }}><Stamp v={v} big /></div>
      <p style={{ fontSize: 18, fontFamily: "var(--display)", lineHeight: 1.3, margin: "14px 0 0" }}>{v.headline}</p>
      <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-3)" }}><Confidence v={v} /></div>

      <div className="card section">
        <div className="eyebrow">{c.label} score since {fmtDate(p.startDate)}</div>
        <TrendChart checkIns={state.checkIns} concerns={[p.concern]} products={[p]}
          band={s.baseline !== null ? { from: p.startDate, baseline: s.baseline, threshold: s.threshold, colour } : undefined} />
        <div className="stats">
          <div><b>{s.baseline ?? "—"}</b><span>Before</span></div>
          <div><b>{s.current ?? "—"}</b><span>Now</span></div>
          <div><b style={{ color: colour }}>{s.delta === null ? "—" : `${s.delta > 0 ? "+" : ""}${s.delta}`}</b><span>Change</span></div>
          <div><b>±{s.noise}</b><span>Your wobble</span></div>
          <div><b>{s.threshold}</b><span>Needed</span></div>
          <div><b>{s.checkInsSince}</b><span>Check-ins</span></div>
        </div>
      </div>

      <div className="card section">
        <h3>Is it too early?</h3>
        <p className="muted small" style={{ margin: "4px 0 14px" }}>{type.label}: {type.note}</p>
        <div style={{ position: "relative", height: 34 }}>
          <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 8, borderRadius: 4, background: "var(--paper-2)" }} />
          <div style={{ position: "absolute", top: 12, left: pct(type.min), width: `calc(${pct(type.max)} - ${pct(type.min)})`, height: 8, borderRadius: 4, background: "var(--keep-bg)", border: "1px solid var(--keep)" }} />
          <div style={{ position: "absolute", top: 4, left: pct(s.weeksOn), width: 3, height: 24, background: "var(--ink)", borderRadius: 2, transform: "translateX(-1px)" }} />
        </div>
        <div className="small muted" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Started</span><span>Fair verdict window: weeks {type.min}–{type.max}</span><span className="num">You: wk {Math.round(s.weeksOn)}</span>
        </div>
      </div>

      <div className="section">
        <h3>Why this verdict</h3>
        <ul className="reasons">{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>

      {(v.kind === "DROP" || p.complexion) && (
        <Link href={`/try-on?product=${p.id}`} className="card card-link section" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          <div className="eyebrow" style={{ color: "#bdb5a3" }}>{v.kind === "DROP" ? "Before you buy a replacement" : "Check your shade"}</div>
          <h2 style={{ marginTop: 6 }}>{p.complexion ? <>Find a shade that <em>actually</em> matches — and see it on you first.</> : <>Try the alternative on your own face first.</>}</h2>
          <p className="small" style={{ opacity: 0.75, margin: "8px 0 0" }}>YouCam Skin Tone Analysis reads your skin colour; Makeup VTO renders the matched foundation on your latest selfie. →</p>
        </Link>
      )}

      <div className="section btn-row">
        <Link href={`/compare`} className="btn soft">Compare photos</Link>
        {!p.stoppedDate
          ? <button className="btn ghost" onClick={() => actions.updateProduct(p.id, { stoppedDate: new Date().toISOString().slice(0, 10) })}>I've stopped it</button>
          : <button className="btn ghost" onClick={() => actions.updateProduct(p.id, { stoppedDate: undefined })}>Resume</button>}
      </div>
      <button className="btn soft block" style={{ marginTop: 10, color: "var(--drop)" }} onClick={() => { if (confirm("Remove this product?")) { actions.removeProduct(p.id); router.push("/products"); } }}>Remove product</button>
    </div>
  );
}
