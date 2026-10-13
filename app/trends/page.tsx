"use client";
import { useState } from "react";
import { useAppState } from "@/lib/store";
import { CONCERNS, concernMeta } from "@/lib/concerns";
import type { ConcernKey } from "@/lib/types";
import TrendChart, { ProductLegend, Sparkline } from "@/components/TrendChart";
import { concernSeries } from "@/lib/verdict";

export default function Trends() {
  const state = useAppState();
  const targeted = Array.from(new Set(state.products.map((p) => p.concern)));
  const [sel, setSel] = useState<ConcernKey[]>(targeted.length ? targeted : ["redness"]);
  const toggle = (k: ConcernKey) => setSel((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]));
  return (
    <div className="fade-in">
      <div className="eyebrow">All concerns</div>
      <h1 style={{ marginTop: 6 }}>Trends</h1>
      <p className="lede">YouCam skin scores per check-in (higher = healthier). Lettered markers show when you started each product.</p>
      <div className="chips section">
        {CONCERNS.map((c) => (
          <button key={c.key} className={`chip ${sel.includes(c.key) ? "on" : ""}`} onClick={() => toggle(c.key)}>
            <span className="sw" style={{ background: c.colour }} />{c.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <TrendChart checkIns={state.checkIns} concerns={sel} products={state.products} height={240} />
        <ProductLegend products={state.products} />
      </div>
      <section className="section">
        <h2>Every concern</h2>
        <div className="card" style={{ marginTop: 12, padding: "6px 18px" }}>
          {CONCERNS.map((c) => {
            const s = concernSeries(state.checkIns, c.key);
            const first = s[0]?.raw, last = s[s.length - 1]?.raw;
            const d = first !== undefined && last !== undefined ? last - first : 0;
            return (
              <button key={c.key} onClick={() => setSel([c.key])} style={{ all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "1fr 80px 54px", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px dashed var(--rule)", width: "100%" }}>
                <span><b style={{ fontWeight: 600 }}>{c.label}</b><br /><span className="small muted">{c.blurb}</span></span>
                <Sparkline checkIns={state.checkIns} concern={c.key} colour={concernMeta(c.key).colour} />
                <span className="num" style={{ textAlign: "right", color: d > 1 ? "var(--keep)" : d < -1 ? "var(--drop)" : "var(--ink-3)" }}>
                  {last !== undefined ? Math.round(last) : "—"}<br /><span className="small">{d > 0 ? "+" : ""}{d.toFixed(1)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
