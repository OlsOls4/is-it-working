"use client";
import Link from "next/link";
import { useVerdicts, daysSince } from "@/lib/useVerdicts";
import { VerdictCard } from "@/components/Verdict";
import TrendChart, { ProductLegend } from "@/components/TrendChart";
import { useMode } from "@/components/ModeProvider";

export default function Today() {
  const { state, verdicts } = useVerdicts();
  const { demo } = useMode();
  const last = state.checkIns[state.checkIns.length - 1];
  const since = daysSince(last?.date);
  const dueIn = Math.max(0, 7 - since);
  const weeks = state.checkIns.length ? Math.round(daysSince(state.checkIns[0].date) / 7) : 0;
  const order = { DROP: 0, WAIT: 1, KEEP: 2 } as const;
  const sorted = [...verdicts].sort((a, b) => order[a.v.kind] - order[b.v.kind]);
  const n = (k: string) => verdicts.filter((x) => x.v.kind === k).length;
  const savings = verdicts.filter((x) => x.v.kind === "DROP").reduce((s, x) => s + (x.p.price || 0), 0);
  const concerns = Array.from(new Set(state.products.map((p) => p.concern)));

  return (
    <div className="fade-in">
      <section className="hero">
        <div className="eyebrow">{state.checkIns.length ? `Week ${weeks} · ${state.checkIns.length} check-ins` : "Day one"}</div>
        <h1 style={{ marginTop: 8 }}>
          {verdicts.length ? <>Your shelf, <em>judged</em> by your own skin.</> : <>Is your skincare <em>actually</em> working?</>}
        </h1>
        <p className="lede">
          {verdicts.length
            ? "Each verdict compares your weekly YouCam skin scores before and after you started a product, against your own week-to-week noise."
            : "Log what you start, take a 30-second selfie each week, and get a straight answer: keep, wait, or drop."}
        </p>
        {state.kind === "demo" && (
          <div className="banner demo">
            <span>◆</span>
            <span>You're viewing a seeded demo: 8 weeks, 3 products. Week 0 is a real YouCam analysis of a synthetic face; later weeks are simulated. <Link href="/products#data">Start your own</Link></span>
          </div>
        )}
        <Link href="/check-in" className="due">
          <div>
            <div className="big">{!last ? "Take your baseline selfie" : dueIn === 0 ? "Check-in due today" : `Next check-in in ${dueIn} day${dueIn === 1 ? "" : "s"}`}</div>
            <div className="sub">{last ? `Last: ${since === 0 ? "today" : since === 1 ? "yesterday" : `${since} days ago`}` : "Before you start anything new"}{demo ? " · demo" : ""}</div>
          </div>
          <span className="go"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
        </Link>
      </section>

      {verdicts.length > 0 && (
        <>
          <div className="tally">
            <div><b style={{ color: "var(--keep)" }}>{n("KEEP")}</b><span>keep</span></div>
            <div><b style={{ color: "var(--wait)" }}>{n("WAIT")}</b><span>still on trial</span></div>
            <div><b style={{ color: "var(--drop)" }}>{n("DROP")}</b><span>drop</span></div>
          </div>
          {savings > 0 && (
            <div className="saving"><b className="num">£{savings}</b><span>you don't need to spend on your next refill. Skip what isn't working.</span></div>
          )}
          <section className="section">
            <div className="section-head"><h2>Verdicts</h2><Link href="/products">All products</Link></div>
            {sorted.map(({ p, v }) => <VerdictCard key={p.id} p={p} v={v} />)}
          </section>
          <section className="section">
            <div className="section-head"><h2>What you're targeting</h2><Link href="/trends">Trends</Link></div>
            <div className="card">
              <TrendChart checkIns={state.checkIns} concerns={concerns} products={state.products} height={190} />
              <ProductLegend products={state.products} />
            </div>
          </section>
        </>
      )}
      {!verdicts.length && (
        <section className="section">
          <Link href="/products/new" className="btn ghost block">+ Add the product you're starting</Link>
        </section>
      )}
      <p className="foot">Skin analysis by YouCam API (Perfect Corp.) · <Link href="/about">How verdicts work</Link></p>
    </div>
  );
}
