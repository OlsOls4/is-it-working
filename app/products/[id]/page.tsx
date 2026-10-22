"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useVerdicts, fmtDate } from "@/lib/useVerdicts";
import { Stamp, Confidence, CollectingDots } from "@/components/Verdict";
import TrendChart from "@/components/TrendChart";
import NextPurchase from "@/components/NextPurchase";
import SimulationCard from "@/components/SimulationCard";
import Sheet from "@/components/Sheet";
import Skeleton from "@/components/Skeleton";
import { concernMeta, PRODUCT_TYPES } from "@/lib/concerns";
import { SIMULATION_PARAM } from "@/lib/normalize";
import { actions } from "@/lib/store";
import { localISO } from "@/lib/dates";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, verdicts } = useVerdicts();
  const [confirmRemove, setConfirmRemove] = useState(false);
  if (!state.ready) return <Skeleton />;
  const hit = verdicts.find((x) => x.p.id === id);
  if (!hit) return (
    <div className="fade-in narrow">
      <Link href="/" className="back">← Today</Link>
      <h1>Product not found</h1>
      <p className="lede">It may have been removed, or this link came from someone else's browser (your data stays on your device).</p>
      <div className="btn-row section"><Link href="/products" className="btn">Your products</Link><Link href="/products/new" className="btn ghost">Add a product</Link></div>
    </div>
  );
  const { p, v } = hit;
  const c = concernMeta(p.concern);
  const type = PRODUCT_TYPES[p.type];
  const s = v.stats;
  const pct = (w: number) => `${Math.min(100, (w / (type.max + 2)) * 100)}%`;
  const colour = v.collecting ? "#6b6456" : v.kind === "KEEP" ? "#1f6b47" : v.kind === "DROP" ? "#b93a14" : "#8a520a";
  const latest = [...state.checkIns].reverse().find((x) => x.photo);

  return (
    <div className="fade-in">
      <Link href="/" className="back">← Today</Link>
      <div className="detail-grid">
        <div>
          <div className="eyebrow">{p.brand ? `${p.brand} · ` : ""}{c.label}</div>
          <h1 style={{ marginTop: 6, fontSize: 32 }}>{p.name}</h1>
          <div style={{ margin: "18px 0 6px", display: "flex", alignItems: "center", gap: 12 }}><Stamp v={v} big /><CollectingDots v={v} /></div>
          <p style={{ fontSize: 18, fontFamily: "var(--display)", lineHeight: 1.3, margin: "14px 0 0" }}>{v.headline}</p>
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-3)" }}><Confidence v={v} /></div>

          <div className="card section">
            <div className="eyebrow">{c.label} score since {fmtDate(p.startDate)}</div>
            {state.checkIns.length ? (
              <TrendChart checkIns={state.checkIns} concerns={[p.concern]} products={[p]}
                band={s.baseline !== null && !v.collecting ? { from: p.startDate, baseline: s.baseline, threshold: s.threshold, colour } : undefined} />
            ) : <p className="small muted">No check-ins yet. <Link href="/check-in">Take your first selfie</Link>.</p>}
            {!v.collecting && (
              <div className="stats">
                <div><b>{s.baseline ?? "—"}</b><span>Before</span></div>
                <div><b>{s.current ?? "—"}</b><span>Now</span></div>
                <div><b style={{ color: colour }}>{s.delta === null ? "—" : `${s.delta > 0 ? "+" : ""}${s.delta}`}</b><span>Change</span></div>
                <div><b>±{s.noise}</b><span>Your wobble</span></div>
                <div><b>{s.threshold}</b><span>Needed</span></div>
                <div><b>{s.checkInsSince}</b><span>Check-ins</span></div>
              </div>
            )}
          </div>

          <div className="card section">
            <h3>Is it too early?</h3>
            <p className="muted small" style={{ margin: "4px 0 14px" }}>{type.label}: {type.note}</p>
            <div style={{ position: "relative", height: 34 }} aria-hidden>
              <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 8, borderRadius: 4, background: "var(--paper-2)" }} />
              <div style={{ position: "absolute", top: 12, left: pct(type.min), width: `calc(${pct(type.max)} - ${pct(type.min)})`, height: 8, borderRadius: 4, background: "var(--keep-bg)", border: "1px solid var(--keep)" }} />
              <div style={{ position: "absolute", top: 4, left: pct(s.weeksOn), width: 3, height: 24, background: "var(--ink)", borderRadius: 2, transform: "translateX(-1px)" }} />
            </div>
            <div className="small muted window-labels">
              <span>Started</span><span>Fair verdict: weeks {type.min}–{type.max}</span><span className="num">You: wk {Math.round(s.weeksOn)}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="section first-right">
            <h3>Why this verdict</h3>
            <ul className="reasons">{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>

          <div className="section"><NextPurchase p={p} v={v} skinHex={state.skinTone?.hex} /></div>

          {v.kind === "WAIT" && !v.collecting && SIMULATION_PARAM[p.concern] && (
            <div className="section"><SimulationCard concern={p.concern} photo={latest?.photo} thumb={latest?.thumb} weeks={v.moreWeeks ?? 4} /></div>
          )}

          {p.complexion && v.kind !== "DROP" && (
            <Link href={`/try-on?product=${p.id}`} className="card card-link section tryon-card">
              <div className="eyebrow" style={{ color: "#c9c0ad" }}>Check your shade</div>
              <h3 style={{ marginTop: 6 }}>Is {p.shadeName ?? "your shade"} right for your skin?</h3>
              <p className="small" style={{ opacity: 0.8, margin: "6px 0 0" }}>YouCam Skin Tone Analysis reads your skin colour; Makeup VTO previews the nearest shade on your face →</p>
            </Link>
          )}

          <div className="section btn-row">
            <Link href={`/compare`} className="btn soft">Compare photos</Link>
            {!p.stoppedDate
              ? <button className="btn ghost" onClick={() => actions.updateProduct(p.id, { stoppedDate: localISO() })}>I've stopped it</button>
              : <button className="btn ghost" onClick={() => actions.updateProduct(p.id, { stoppedDate: undefined })}>Resume (stopped {fmtDate(p.stoppedDate)})</button>}
          </div>
          {p.stoppedDate && <p className="small muted" role="status">Marked as stopped on {fmtDate(p.stoppedDate)}. Check-ins after that date no longer count towards this verdict.</p>}
          <button className="btn soft block" style={{ marginTop: 10, color: "var(--drop)" }} onClick={() => setConfirmRemove(true)}>Remove product</button>
        </div>
      </div>
      <Sheet open={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remove this product?">
        <p className="small muted" style={{ marginTop: 0 }}>{p.name} and its verdict will disappear. Your check-ins stay.</p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setConfirmRemove(false)}>Cancel</button>
          <button className="btn" style={{ background: "var(--drop)" }} onClick={() => { actions.removeProduct(p.id); router.push("/products"); }}>Remove</button>
        </div>
      </Sheet>
    </div>
  );
}
