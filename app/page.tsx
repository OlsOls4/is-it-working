"use client";
import Link from "next/link";
import { useVerdicts, daysSince, plural } from "@/lib/useVerdicts";
import { VerdictCard } from "@/components/Verdict";
import TrendChart, { ConcernLegend, ProductLegend } from "@/components/TrendChart";
import CompareSlider from "@/components/CompareSlider";
import NextPurchase from "@/components/NextPurchase";
import Tour from "@/components/Tour";
import Skeleton from "@/components/Skeleton";
import { useMode } from "@/components/ModeProvider";
import { concernMeta } from "@/lib/concerns";

export default function Today() {
  const { state, verdicts } = useVerdicts();
  const { demo } = useMode();
  if (!state.ready) return <Skeleton />;

  const last = state.checkIns[state.checkIns.length - 1];
  const since = daysSince(last?.date);
  const dueIn = Math.max(0, 7 - since);
  const weeks = state.checkIns.length ? Math.round(daysSince(state.checkIns[0].date) / 7) : 0;
  const order = { DROP: 0, WAIT: 1, KEEP: 2 } as const;
  const sorted = [...verdicts].sort((a, b) => order[a.v.kind] - order[b.v.kind]);
  const judged = verdicts.filter((x) => !x.v.collecting);
  const n = (k: string) => judged.filter((x) => x.v.kind === k).length;
  const collecting = verdicts.length - judged.length;
  const savings = judged.filter((x) => x.v.kind === "DROP").reduce((s, x) => s + (x.p.price || 0), 0);
  const concerns = Array.from(new Set(state.products.map((p) => p.concern)));
  const isDemo = state.kind === "demo";

  // Hero visual: first vs latest photo, with the real YouCam mask of the best-performing product's concern on both.
  const keep = verdicts.find((x) => x.v.kind === "KEEP" && !x.v.collecting);
  const withPhoto = state.checkIns.filter((c) => c.photo);
  const A = withPhoto[0], B = withPhoto[withPhoto.length - 1];
  const heroConcern = keep?.p.concern;
  const heroMasks = heroConcern && A?.scores[heroConcern]?.mask && B?.scores[heroConcern]?.mask;
  const tryOnTarget = verdicts.find((x) => x.p.complexion && (x.v.kind === "DROP" || x.v.shade));
  const actionable = sorted.filter((x) => !x.v.collecting);

  return (
    <div className="fade-in">
      <div className="home-grid">
        <div className="col-left">
          <section className="hero">
            <div className="eyebrow">{state.checkIns.length ? `Week ${weeks} · ${plural(state.checkIns.length, "check-in")}` : "Day one"}</div>
            <h1 style={{ marginTop: 8 }}>
              {verdicts.length ? <>Your shelf, <em>judged</em> by your own skin.</> : <>Is your skincare <em>actually</em> working?</>}
            </h1>
            <p className="lede">
              {verdicts.length
                ? "Each verdict compares your weekly YouCam skin scores before and after you started a product, against your own week-to-week noise. Then it tells you what to buy next."
                : "Log what you start, take a 30-second selfie each week, and get a straight answer: keep, wait, or drop."}
            </p>
            {isDemo && (
              <div className="banner demo">
                <span aria-hidden>◆</span>
                <span>Seeded demo: 9 weekly check-ins, 3 products. <b>Every score, mask, skin-tone reading and try-on is a real YouCam API response</b>, recorded on a synthetic AI-generated face. <Link href="/about#data">What's real</Link> · <Link href="/products#data">Start your own</Link></span>
              </div>
            )}
          </section>

          {heroMasks && A && B && keep && (
            <figure className="hero-visual">
              <CompareSlider before={A.photo!} after={B.photo!} beforeFallback={A.thumb} afterFallback={B.thumb}
                beforeMask={A.scores[heroConcern!]!.mask} afterMask={B.scores[heroConcern!]!.mask}
                labels={[`W0 · ${concernMeta(heroConcern!).label.toLowerCase()} mask`, `W${weeks}`]} />
              <figcaption className="small">
                <b>{concernMeta(heroConcern!).label} {keep.v.stats.delta! > 0 ? "+" : ""}{keep.v.stats.delta} pts</b> since {keep.p.name}. Drag to compare: the overlay is YouCam's own {concernMeta(heroConcern!).label.toLowerCase()} detection mask for each week.
              </figcaption>
            </figure>
          )}

          {isDemo && <Tour />}

          <Link href="/check-in" className="due">
            <div>
              <div className="big">{isDemo && demo ? "Try a check-in (30-second demo)" : !last ? "Take your baseline selfie" : dueIn === 0 ? "Check-in due today" : `Next check-in in ${plural(dueIn, "day")}`}</div>
              <div className="sub">{isDemo && demo ? "See YouCam read a face: 8 concerns + masks" : last ? `Last: ${since <= 0 ? "today" : since === 1 ? "yesterday" : `${since} days ago`}` : "Before you start anything new"}</div>
            </div>
            <span className="go" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </Link>

          {judged.length > 0 && (
            <>
              <div className="tally">
                <div><b style={{ color: "var(--keep)" }}>{n("KEEP")}</b><span>keep</span></div>
                <div><b style={{ color: "var(--wait)" }}>{n("WAIT")}</b><span>still on trial</span></div>
                <div><b style={{ color: "var(--drop)" }}>{n("DROP")}</b><span>drop</span></div>
              </div>
              {savings > 0 && (
                <div className="saving"><b className="num">£{savings}</b><span>you don't need to spend on a refill that isn't working.</span></div>
              )}
            </>
          )}

          {collecting > 0 && <p className="small muted" style={{ margin: "10px 2px 0" }}>{plural(collecting, "product")} still collecting data: a verdict needs 3 weekly check-ins after you start.</p>}

          {tryOnTarget && (
            <Link href={`/try-on?product=${tryOnTarget.p.id}`} className="card card-link section tryon-card">
              <div className="eyebrow" style={{ color: "#c9c0ad" }}>Try before you buy</div>
              <h3 style={{ marginTop: 6 }}>{tryOnTarget.v.shade ? <>Your {tryOnTarget.p.name.split(" ").slice(0, 2).join(" ")} is ΔE {tryOnTarget.v.shade.deltaE} off your skin. <em>See your shade.</em></> : <>Find a shade that matches, and see it on your face.</>}</h3>
              <p className="small" style={{ opacity: 0.8, margin: "6px 0 0" }}>YouCam Skin Tone Analysis + Makeup VTO →</p>
            </Link>
          )}
        </div>

        <div className="col-right">
          {verdicts.length > 0 ? (
            <>
              <section className="section first-right">
                <div className="section-head"><h2>Verdicts</h2><Link href="/products">All products</Link></div>
                {sorted.map(({ p, v }) => <VerdictCard key={p.id} p={p} v={v} />)}
              </section>
              {actionable.length > 0 && (
                <section className="section">
                  <div className="section-head"><h2>Your next purchase</h2></div>
                  <div className="np-list">
                    {actionable.map(({ p, v }) => <NextPurchase key={p.id} p={p} v={v} skinHex={state.skinTone?.hex} compact />)}
                  </div>
                </section>
              )}
              {state.checkIns.length > 1 && (
                <section className="section">
                  <div className="section-head"><h2>What you're targeting</h2><Link href="/trends">Trends</Link></div>
                  <div className="card">
                    <TrendChart checkIns={state.checkIns} concerns={concerns} products={state.products} height={200} />
                    <ConcernLegend concerns={concerns} />
                    <ProductLegend products={state.products} />
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className="section first-right card empty">
              <h3>Nothing on trial yet</h3>
              <p className="small muted">Add the product you're about to start, then take a baseline selfie before your first use.</p>
              <Link href="/products/new" className="btn block" style={{ marginTop: 12 }}>+ Add the product you're starting</Link>
            </section>
          )}
        </div>
      </div>
      <p className="foot">Skin analysis by YouCam API (Perfect Corp.) · <Link href="/about">How verdicts work</Link> · <Link href="/retailers">For retailers</Link></p>
    </div>
  );
}
