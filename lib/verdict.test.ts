import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeVerdict } from "./verdict.ts";
import { buildDemo, WEEK0_REAL } from "./demo-data.ts";
import type { CheckIn, Product } from "./types";

const today = new Date("2026-10-13T12:00:00Z");
const { checkIns, products } = buildDemo(today);
const v = (id: string) => computeVerdict(products.find((p) => p.id === id)!, products, checkIns, "X");

test("week 0 demo scores equal the recorded real YouCam response", () => {
  const fx = JSON.parse(readFileSync(new URL("../fixtures/skin-analysis.week00.real.json", import.meta.url), "utf8"));
  for (const o of fx.response.data.results.output) {
    if (o.type in WEEK0_REAL) {
      assert.equal(WEEK0_REAL[o.type as keyof typeof WEEK0_REAL].raw, o.raw_score);
      assert.equal(WEEK0_REAL[o.type as keyof typeof WEEK0_REAL].ui, o.ui_score);
    }
  }
});

test("demo: azelaic acid on redness -> KEEP", () => {
  const r = v("demo-azelaic");
  assert.equal(r.kind, "KEEP");
  assert.ok(r.confidence >= 70);
});

test("demo: skin tint on moisture -> DROP (flat past window)", () => {
  assert.equal(v("demo-tint").kind, "DROP");
});

test("demo: retinal at 4 weeks on texture -> GIVE IT 4 MORE WEEKS", () => {
  const r = v("demo-retinal");
  assert.equal(r.kind, "WAIT");
  assert.equal(r.moreWeeks, 4);
  assert.equal(r.label, "GIVE IT 4 MORE WEEKS");
});

test("fewer than 3 check-ins since start -> WAIT", () => {
  const p: Product = { id: "x", name: "New", brand: "b", type: "niacinamide", concern: "pore", startDate: checkIns[7].date };
  const r = computeVerdict(p, [p], checkIns, "Pores");
  assert.equal(r.kind, "WAIT");
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

test("deterministic", () => {
  assert.deepEqual(v("demo-azelaic"), v("demo-azelaic"));
});
