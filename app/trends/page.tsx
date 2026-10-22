"use client";
import { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/store";
import { CONCERNS, CONCERN_KEYS, concernMeta } from "@/lib/concerns";
import type { ConcernKey } from "@/lib/types";
import TrendChart, { ConcernLegend, ProductLegend, Sparkline, sharedSpan } from "@/components/TrendChart";
import Skeleton from "@/components/Skeleton";
import { concernSeries } from "@/lib/verdict";

export default function Trends() {
  const state = useAppState();
  const targeted = Array.from(new Set(state.products.map((p) => p.concern)));
  const [picked, setSel] = useState<ConcernKey[] | null>(null);
  const sel = picked ?? (targeted.length ? targeted : ["redness"]);
  const toggle = (k: ConcernKey) => setSel((s0) => { const s = s0 ?? sel; return s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]; });
  if (!state.ready) return <Skeleton lines={2} />;

  if (state.checkIns.length < 2) {
    return (
      <div className="fade-in narrow">
        <div className="eyebrow">All concerns</div>
        <h1 style={{ marginTop: 6 }}>Trends</h1>
        <div className="card section empty">
          <h3>{state.checkIns.length ? "One check-in so far" : "Your trends start with a baseline selfie"}</h3>
          <p className="small muted">Trend lines need at least two weekly check-ins. Same place, same light, every week — that's what makes a change real.</p>
          <Link href="/check-in" className="btn block" style={{ marginTop: 12 }}>{state.checkIns.length ? "Next check-in" : "Take your baseline selfie"}</Link>
        </div>
      </div>
    );
  }
  const span = sharedSpan(state.checkIns, CONCERN_KEYS);

  return (
    <div className="fade-in">
      <div className="eyebrow">All concerns</div>
      <h1 style={{ marginTop: 6 }}>Trends</h1>
      <p className="lede">YouCam skin scores per check-in (higher = healthier). Lettered markers show when you started each product.</p>
      <div className="trends-grid">
        <div>
          <div className="chips section wrap" role="group" aria-label="Concerns on the chart">
            {CONCERNS.map((c) => (
              <button key={c.key} aria-pressed={sel.includes(c.key)} className={`chip ${sel.includes(c.key) ? "on" : ""}`} onClick={() => toggle(c.key)}>
                <span className="sw" style={{ background: c.colour }} />{c.label}
              </button>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <TrendChart checkIns={state.checkIns} concerns={sel} products={state.products} height={240} />
            <ConcernLegend concerns={sel} />
            <ProductLegend products={state.products} />
          </div>
        </div>
        <section className="section first-right">
          <h2>Every concern</h2>
          <p className="small muted" style={{ margin: "4px 0 0" }}>Sparklines share one scale ({Math.round(span)} pts top to bottom), so flat really is flat.</p>
          <div className="card" style={{ marginTop: 12, padding: "6px 18px" }}>
            {CONCERNS.map((c) => {
              const s = concernSeries(state.checkIns, c.key);
              const first = s[0]?.raw, last = s[s.length - 1]?.raw;
              const d = first !== undefined && last !== undefined ? last - first : null;
              return (
                <button key={c.key} onClick={() => setSel([c.key])} className="trend-row" aria-label={`Show ${c.label} on the chart`}>
                  <span><b style={{ fontWeight: 600 }}>{c.label}</b><br /><span className="small muted">{c.blurb}</span></span>
                  <Sparkline checkIns={state.checkIns} concern={c.key} colour={concernMeta(c.key).colour} span={span} />
                  <span className="num" style={{ textAlign: "right", color: d === null ? "var(--ink-3)" : d > 1 ? "var(--keep)" : d < -1 ? "var(--drop)" : "var(--ink-3)" }}>
                    {last !== undefined ? Math.round(last) : "—"}<br /><span className="small">{d === null ? "" : `${d > 0 ? "+" : ""}${d.toFixed(1)}`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
