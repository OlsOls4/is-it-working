/**
 * Verdict engine — deterministic, explainable, no LLM.
 *
 * For each product we compare the target concern's YouCam raw_score (higher = healthier)
 * before vs after the product's start date, and judge that change against the
 * person's own week-to-week measurement noise and the product type's typical
 * time-to-effect window.
 *
 *   baseline  = mean of the last <=2 check-ins on/before the start date
 *   current   = mean of the last <=2 check-ins after it
 *   noise     = residual std-dev of this concern's whole series around a straight-line trend
 *               (floored at 1.0 point) — i.e. how much the score wobbles week to week
 *   threshold = 2 x standard error of (current - baseline), floored at 2.0 points
 *
 * Rules (in order):
 *   1. < 3 check-ins since starting           -> GIVE IT N MORE WEEKS (not enough data)
 *   2. change >= +threshold                    -> KEEP
 *   3. change <= -threshold
 *        a. inside a known "purge" window      -> GIVE IT N MORE WEEKS
 *        b. otherwise                          -> DROP
 *   4. flat (inside the noise band)
 *        a. before the type's minimum window   -> GIVE IT N MORE WEEKS
 *        b. inside window & trending upward    -> GIVE IT N MORE WEEKS
 *        c. past the minimum window            -> DROP
 * Confidence starts from the effect size (z) and data volume, and is reduced when
 * another product aimed at the same concern started within 3 weeks (confounded),
 * or when there is no pre-start baseline.
 */
import type { CheckIn, ConcernKey, Product, Verdict } from "./types";
import { PRODUCT_TYPES } from "./concerns.ts";

const DAY = 86_400_000;
const toTime = (d: string) => new Date(d + (d.length === 10 ? "T12:00:00Z" : "")).getTime();
export const weeksBetween = (a: string, b: string) => (toTime(b) - toTime(a)) / (7 * DAY);

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function linearFit(xs: number[], ys: number[]) {
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

export function concernSeries(checkIns: CheckIn[], concern: ConcernKey) {
  return [...checkIns]
    .filter((c) => c.scores[concern])
    .sort((a, b) => toTime(a.date) - toTime(b.date))
    .map((c) => ({ date: c.date, raw: c.scores[concern]!.raw, ui: c.scores[concern]!.ui }));
}

/** Residual std-dev around a linear trend; how much this person's score wobbles. */
export function noiseFor(series: { date: string; raw: number }[]) {
  if (series.length < 3) return 2.0;
  const t0 = series[0].date;
  const xs = series.map((p) => weeksBetween(t0, p.date));
  const ys = series.map((p) => p.raw);
  const { slope, intercept } = linearFit(xs, ys);
  const res = ys.map((y, i) => y - (slope * xs[i] + intercept));
  const sd = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, res.length - 2));
  return Math.max(1.0, sd);
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const fmtPts = (x: number) => `${x > 0 ? "+" : ""}${round1(x)} pts`;

export function computeVerdict(product: Product, allProducts: Product[], checkIns: CheckIn[], concernLabel: string, asOf?: string): Verdict {
  const type = PRODUCT_TYPES[product.type];
  const series = concernSeries(checkIns, product.concern);
  const startT = toTime(product.startDate);
  const tol = 3 * DAY; // a check-in up to 3 days after starting still counts as baseline
  const endDate = product.stoppedDate ?? asOf ?? (series.length ? series[series.length - 1].date : product.startDate);
  const weeksOn = Math.max(0, weeksBetween(product.startDate, endDate));

  const before = series.filter((p) => toTime(p.date) <= startT + tol);
  let after = series.filter((p) => toTime(p.date) > startT + tol && (!product.stoppedDate || toTime(p.date) <= toTime(product.stoppedDate) + tol));
  let baselinePts = before.slice(-2);
  let noBaseline = false;
  if (baselinePts.length === 0 && after.length > 0) { baselinePts = [after[0]]; after = after.slice(1); noBaseline = true; }

  const noise = noiseFor(series);
  const nb = Math.max(1, baselinePts.length);
  const currentPts = after.slice(-2);
  const nc = Math.max(1, currentPts.length);
  const se = noise * Math.sqrt(1 / nb + 1 / nc);
  const threshold = Math.max(2.0, 2 * se);
  const baseline = baselinePts.length ? mean(baselinePts.map((p) => p.raw)) : null;
  const current = currentPts.length ? mean(currentPts.map((p) => p.raw)) : null;
  const delta = baseline !== null && current !== null ? current - baseline : null;
  const z = delta !== null ? delta / se : 0;

  // slope since start (pts/week), for "trending" judgement
  let slope = 0;
  if (after.length >= 3) {
    const pts = [...baselinePts.slice(-1), ...after];
    slope = linearFit(pts.map((p) => weeksBetween(product.startDate, p.date)), pts.map((p) => p.raw)).slope;
  }

  const overlaps = allProducts
    .filter((p) => p.id !== product.id && p.concern === product.concern && Math.abs(weeksBetween(product.startDate, p.startDate)) <= 3)
    .map((p) => p.name);

  const wk = (n: number) => `${Math.round(n)} week${Math.round(n) === 1 ? "" : "s"}`;
  const c = concernLabel.toLowerCase();
  const reasons: string[] = [];
  let kind: Verdict["kind"];
  let moreWeeks: number | undefined;
  let headline: string;
  let confidence: number;

  if (baseline !== null && delta !== null) {
    reasons.push(`${concernLabel} score: ${round1(baseline)} before → ${round1(current!)} now (${fmtPts(delta)}).`);
    reasons.push(`Your normal week-to-week wobble is ±${round1(noise)} pts, so a real change needs to beat ${round1(threshold)} pts.`);
  }
  reasons.push(`${type.label}: typically ${type.min}–${type.max} weeks to show. You're ${wk(weeksOn)} in.`);

  if (after.length < 3 || delta === null) {
    kind = "WAIT";
    moreWeeks = Math.max(3 - after.length, Math.ceil(type.min - weeksOn), 1);
    headline = `Only ${after.length} check-in${after.length === 1 ? "" : "s"} since you started. We need at least 3 to tell a real change from a good-light day.`;
    confidence = 30;
  } else if (delta >= threshold) {
    kind = "KEEP";
    headline = `${concernLabel} is ${fmtPts(delta)} since you started — ${round1(Math.abs(delta) / noise)}× your normal wobble. It's working.`;
    if (weeksOn < type.min) reasons.push(`That's early for this type of product, so keep checking in to confirm it holds.`);
    confidence = 50 + 14 * Math.min(Math.abs(z), 3) + Math.min(after.length, 8);
  } else if (delta <= -threshold) {
    const inPurge = type.purgeWeeks !== undefined && weeksOn <= type.purgeWeeks && ["acne", "texture", "redness"].includes(product.concern);
    if (inPurge) {
      kind = "WAIT";
      moreWeeks = Math.max(Math.ceil(type.purgeWeeks! - weeksOn) + 2, Math.ceil(type.min - weeksOn));
      headline = `${concernLabel} is ${fmtPts(delta)}, but you're ${wk(weeksOn)} into a ${type.label.toLowerCase()} — early flare-ups are common. Re-judge in ${wk(moreWeeks)}.`;
      reasons.push(`If it's still worse after week ${type.purgeWeeks! + 2}, it's not purging — it's irritation.`);
      confidence = 45;
    } else {
      kind = "DROP";
      headline = `${concernLabel} got worse (${fmtPts(delta)}) since you started, beyond your normal wobble. Stop and see if it recovers.`;
      confidence = 50 + 14 * Math.min(Math.abs(z), 3) + Math.min(after.length, 8);
    }
  } else {
    // flat
    const remaining = type.max - weeksOn;
    const projected = (delta ?? 0) + slope * Math.max(0, Math.min(remaining, 4));
    if (weeksOn < type.min) {
      kind = "WAIT";
      moreWeeks = Math.max(1, Math.ceil(type.min - weeksOn));
      headline = `${wk(weeksOn)} in and ${c} is ${fmtPts(delta)} — inside the noise, but too early to judge a ${type.label.split(" (")[0].toLowerCase()}. Give it ${wk(moreWeeks)}.`;
      confidence = 40 + Math.min(after.length * 3, 15);
    } else if (remaining > 0 && slope > 0 && projected >= threshold) {
      kind = "WAIT";
      moreWeeks = Math.max(1, Math.ceil(Math.min(remaining, 4)));
      headline = `Not significant yet (${fmtPts(delta)}), but trending up ${round1(slope)} pts/week. Give it ${wk(moreWeeks)} more before deciding.`;
      confidence = 45;
    } else {
      kind = "DROP";
      headline = `${wk(weeksOn)} in, ${c} hasn't moved (${fmtPts(delta)}, within your normal wobble). ${type.label.split(" (")[0]}s usually show by week ${type.min}.`;
      reasons.push(`Past the typical window with a flat trend (${fmtPts(slope)}/week). More weeks are unlikely to change the answer.`);
      confidence = 45 + Math.min((weeksOn - type.min) * 6, 25) + Math.min(after.length * 2, 16);
    }
  }

  if (overlaps.length) {
    reasons.push(`Heads up: ${overlaps.join(", ")} also targets ${c} and started within 3 weeks, so credit is shared.`);
    confidence -= 15;
  }
  if (noBaseline) {
    reasons.push(`No check-in before you started, so your first week on it is used as the baseline.`);
    confidence -= 10;
  }
  confidence = Math.round(Math.max(20, Math.min(95, confidence)));
  const confidenceLabel = confidence >= 70 ? "High" : confidence >= 45 ? "Medium" : "Low";
  const label = kind === "KEEP" ? "KEEP" : kind === "DROP" ? "DROP" : `GIVE IT ${moreWeeks} MORE WEEK${moreWeeks === 1 ? "" : "S"}`;

  return {
    kind, label, moreWeeks, headline, reasons, confidence, confidenceLabel,
    stats: {
      baseline: baseline === null ? null : round1(baseline),
      current: current === null ? null : round1(current),
      delta: delta === null ? null : round1(delta),
      noise: round1(noise), threshold: round1(threshold),
      weeksOn: round1(weeksOn), checkInsSince: after.length,
      windowMin: type.min, windowMax: type.max, overlaps,
    },
  };
}
