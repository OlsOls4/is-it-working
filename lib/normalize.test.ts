import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { normaliseSkinAnalysis, normaliseSkinTone, normaliseVto, normaliseSimulation } from "./normalize.ts";
import { isPhotoError, friendlyError, minShortSide } from "./fallback.ts";
import { matchShades, deltaE, SHADES } from "./shades.ts";
import { DEMO_SKIN_HEX, DEMO_TINT_SHADE } from "./demo-data.ts";

const fx = (p: string) => JSON.parse(readFileSync(new URL(`../fixtures/${p}`, import.meta.url), "utf8"));

test("every recorded skin-analysis fixture normalises to 8 concerns with masks", () => {
  const dir = new URL("../fixtures/series/", import.meta.url);
  for (const f of readdirSync(dir)) {
    const n = normaliseSkinAnalysis(fx(`series/${f}`).response);
    assert.equal(Object.keys(n.scores).length, 8, f);
    for (const s of Object.values(n.scores)) { assert.ok(s!.raw > 0 && s!.raw <= 100); assert.match(s!.mask!, /^\/demo\/series\/w\d\d\/\w+\.png$/); }
    assert.equal(typeof n.overall, "number");
    assert.equal(typeof n.skinAge, "number");
  }
});

test("skin tone fixture is real and normalises", () => {
  const f = fx("skin-tone.w08.real.json");
  assert.match(f._meta.source, /^REAL/);
  const n = normaliseSkinTone(f.response);
  assert.equal(n.skinColor, DEMO_SKIN_HEX);
  assert.equal(n.faceQuality.lighting, "good");
});

test("VTO + simulation fixtures normalise to a local image url", () => {
  assert.equal(normaliseVto(fx("makeup-vto.5N.real.json").response).url, "/demo/vto-5N.jpg");
  assert.equal(normaliseVto(fx("makeup-vto.tint-medium04.real.json").response).url, "/demo/vto-tint-medium04.jpg");
  assert.equal(normaliseSimulation(fx("skin-simulation.texture.real.json").response).url, "/demo/sim-texture.jpg");
});

test("malformed responses don't throw", () => {
  assert.deepEqual(normaliseSkinAnalysis({}).scores, {});
  assert.equal(normaliseSkinTone(null).skinColor, undefined);
  assert.equal(normaliseVto(undefined).url, undefined);
});

test("shade match on the real skin-tone reading: 5N is a close match, the dropped tint is a visible mismatch", () => {
  const m = matchShades(DEMO_SKIN_HEX);
  assert.equal(m[0].code, "5N");
  assert.ok(m[0].deltaE <= 2.5);
  assert.ok(deltaE(DEMO_TINT_SHADE.hex, DEMO_SKIN_HEX) > 5);
  assert.equal(SHADES.length, 30);
});

test("CIEDE2000 reference pair (Sharma et al. 2005, pair 1 ≈ 2.0425)", async () => {
  const { deltaE2000 } = await import("./shades.ts");
  assert.ok(Math.abs(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]) - 2.0425) < 1e-3);
});

test("photo errors are recognised by prefix and get directional advice", () => {
  for (const c of ["error_face_angle_upward", "error_face_angle_left_tilt", "error_face_position_too_small", "error_face_position_out_of_boundary",
    "error_face_not_forward_facing", "error_src_face_too_small_cr_0.5", "error_exceed_max_image_size", "error_below_min_image_size", "error_lighting_dark", "error_no_face"]) {
    assert.ok(isPhotoError(c), c);
  }
  assert.ok(!isPhotoError("unknown_internal_error"));
  assert.ok(!isPhotoError("error_inference"));
  assert.match(friendlyError("error_face_angle_upward", "skin-tone-analysis"), /chin down/i);
  assert.match(friendlyError("error_below_min_image_size", "makeup-vto"), /320/);
  assert.match(friendlyError("error_below_min_image_size", "skin-analysis"), /480/);
  assert.equal(minShortSide("skin-simulation"), 480);
});
