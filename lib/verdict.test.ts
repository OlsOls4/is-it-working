import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { computeVerdict } from "./verdict.ts";
import { buildDemo, DEMO_SKIN_HEX } from "./demo-data.ts";
import { DEMO_SERIES } from "./demo-series.ts";
import type { CheckIn, Product } from "./types";

const today = new Date("2026-10-22T12:00:00+01:00");
const { checkIns, products } = buildDemo(today);
const v = (id: string, skinHex: string | null = DEMO_SKIN_HEX) =>
  computeVerdict(products.find((p) => p.id === id)!, products, checkIns, "X", { skinHex: skinHex ?? undefined });

test("every demo week's scores equal the recorded real YouCam response", () => {
  const dir = new URL("../fixtures/series/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".real.json")).sort();
  assert.equal(files.length, 9);
  files.forEach((f, w) => {
    const fx = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    assert.equal(fx._meta.week, w);
    assert.match(fx._meta.source, /^REAL YouCam API response/);
    for (const o of fx.response.data.results.output) {
      const s = (checkIns[w].scores as any)[o.type];
      if (typeof o.raw_score === "number") { assert.equal(s.raw, o.raw_score); assert.equal(s.ui, o.ui_score); assert.ok(s.mask); }
      if (o.type === "all") assert.equal(checkIns[w].overall, o.score);
    }
  });
  assert.equal(DEMO_SERIES.length, 9);
});

test("demo: azelaic acid on redness -> KEEP (real series)", () => {
  const r = v("demo-azelaic");
  assert.equal(r.kind, "KEEP");
  assert.ok(r.stats.delta! > 5, `delta ${r.stats.delta}`);
  assert.ok(r.confidence >= 70);
});

test("demo: tint is DROPPED for a visible shade mismatch (YouCam Skin Tone)", () => {
  const r = v("demo-tint");
  assert.equal(r.kind, "DROP");
  assert.ok(r.shade && r.shade.deltaE > 5, `ΔE ${r.shade?.deltaE}`);
  assert.match(r.headline, /Wrong shade/);
});

test("demo: without a skin-tone reading the tint is judged on its moisture claim alone", () => {
  const r = v("demo-tint", null);
  assert.equal(r.shade, undefined);
  assert.equal(r.kind, "DROP"); // flat moisture, past the 2-4 week window
  assert.doesNotMatch(r.headline, /shade/);
});

test("demo: retinal at 4 weeks on texture -> GIVE IT 4 MORE WEEKS", () => {
  const r = v("demo-retinal");
  assert.equal(r.kind, "WAIT");
  assert.equal(r.moreWeeks, 4);
  assert.equal(r.label, "GIVE IT 4 MORE WEEKS");
  assert.ok(!r.collecting);
});

test("fewer than 3 check-ins since start -> COLLECTING, not a time-based verdict", () => {
  const p: Product = { id: "x", name: "New", brand: "b", type: "niacinamide", concern: "pore", startDate: checkIns[7].date };
  const r = computeVerdict(p, [p], checkIns, "Pores");
  assert.equal(r.kind, "WAIT");
  assert.ok(r.collecting);
  assert.equal(r.label, "COLLECTING 1/3");
});

test("zero check-ins -> COLLECTING 0/3 with honest copy", () => {
  const p: Product = { id: "x", name: "New", brand: "", type: "niacinamide", concern: "pore", startDate: "2026-10-22" };
  const r = computeVerdict(p, [p], [], "Pores");
  assert.equal(r.label, "COLLECTING 0/3");
  assert.match(r.headline, /No check-ins since you started yet/);
});

test("clear worsening outside purge window -> DROP", () => {
  const worse: CheckIn[] = checkIns.map((c, i) => ({ ...c, scores: { ...c.scores, acne: { raw: 85 - (i >= 3 ? 8 : 0) + (i % 2) * 0.5, ui: 80 } } }));
  const p: Product = { id: "y", name: "Heavy cream", brand: "b", type: "moisturiser", concern: "acne", startDate: worse[2].date };
  assert.equal(computeVerdict(p, [p], worse, "Acne").kind, "DROP");
});

test("retinoid making acne worse in week 3 -> WAIT (purge), not DROP", () => {
  const worse: CheckIn[] = checkIns.map((c, i) => ({ ...c, scores: { ...c.scores, acne: { raw: 85 - (i >= 6 ? 8 : 0), ui: 80 } } }));
  const p: Product = { id: "z", name: "Tret", brand: "b", type: "retinoid", concern: "acne", startDate: worse[5].date };
  assert.equal(computeVerdict(p, [p], worse, "Acne").kind, "WAIT");
});

test("a well-matched complexion shade is not dropped for its shade", () => {
  const p: Product = { ...products.find((x) => x.id === "demo-tint")!, shadeHex: "#b4917c", shadeName: "5N" };
  const r = computeVerdict(p, [p], checkIns, "Moisture", { skinHex: DEMO_SKIN_HEX });
  assert.ok(r.shade!.deltaE <= 2.5);
  assert.doesNotMatch(r.headline, /Wrong shade/);
});

test("deterministic", () => {
  assert.deepEqual(v("demo-azelaic"), v("demo-azelaic"));
});
