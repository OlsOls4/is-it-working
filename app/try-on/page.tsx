"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { actions, useAppState } from "@/lib/store";
import { useMode } from "@/components/ModeProvider";
import { fullSizePhoto, imageSize, prepareImage, runTask, TaskError } from "@/lib/api-client";
import { minShortSide } from "@/lib/fallback";
import { deltaE, matchQuality, matchShades, RANGE, SHADES } from "@/lib/shades";
import { localISO } from "@/lib/dates";
import { DEMO_TINT_SHADE } from "@/lib/demo-data";
import CompareSlider from "@/components/CompareSlider";
import Img from "@/components/Img";
import Sheet from "@/components/Sheet";
import Skeleton from "@/components/Skeleton";

type Tone = { skinColor?: string; eyeColor?: string; lipColor?: string; hairColor?: string; faceQuality?: Record<string, string | boolean> };
type Err = { msg: string; retake: boolean; canFallback: boolean; step: "tone" | "vto" };
const DEMO_FACE = "/demo/series/w08/photo.jpg";
const RECORDED_SHADES = ["5N"];

function TryOn() {
  const q = useSearchParams();
  const state = useAppState();
  const { demo } = useMode();
  const product = state.products.find((p) => p.id === q.get("product"));
  const latest = [...state.checkIns].reverse().find((c) => c.photo && !c.photo.startsWith("data:"));
  const [src, setSrc] = useState<{ url: string; blob: Blob } | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [toneDemo, setToneDemo] = useState(false);
  const [notice, setNotice] = useState("");
  const [shade, setShade] = useState<string | null>(null);
  const [vto, setVto] = useState<{ url: string; demo: boolean; shade: string; before: string } | null>(null);
  const [tintVto, setTintVto] = useState<{ url: string; demo: boolean } | null>(null);
  const [busy, setBusy] = useState<"" | "tone" | "vto" | "tint">("");
  const [err, setErr] = useState<Err | null>(null);
  const [buy, setBuy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const usingDemoFace = demo || (!src && !latest);
  const photoUrl = src?.url ?? (demo ? DEMO_FACE : latest?.photo);
  const matches = useMemo(() => (tone?.skinColor ? matchShades(tone.skinColor) : []), [tone]);
  const chosen = SHADES.find((s) => s.code === shade) ?? matches[0];
  const chosenMatch = matches.find((m) => m.code === chosen?.code);
  const tintHex = product?.shadeHex;

  useEffect(() => { if (vto) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [vto]);

  /** Full-size image for YouCam (never the 360px thumbnail), checked against the feature's minimum size. */
  async function getBlob(feature: "skin-tone-analysis" | "makeup-vto"): Promise<Blob | null> {
    if (demo) return null;
    const b = src?.blob ?? (await fullSizePhoto(latest?.photo));
    if (!b) throw new TaskError("We need a full-size bare-skin photo for this. Upload a selfie (your saved check-in only has a small thumbnail).", false, "need_photo");
    const { width, height } = await imageSize(b);
    const min = minShortSide(feature);
    if (Math.min(width, height) < min) throw new TaskError(`That photo is ${Math.min(width, height)}px on its short side; YouCam needs at least ${min}px. Upload a larger selfie.`, false, "error_below_min_image_size");
    return (await prepareImage(b)).blob;
  }

  function fail(e: unknown, step: Err["step"]) {
    const te = e instanceof TaskError ? e : null;
    setErr({ msg: (e as Error).message, retake: !!te?.code, canFallback: !!te?.canFallback || !!te?.code, step });
  }

  async function readTone(forceDemo = false) {
    setErr(null); setBusy("tone");
    try {
      const r = await runTask<Tone>("skin-tone-analysis", forceDemo ? null : await getBlob("skin-tone-analysis"), {}, undefined, { forceDemo });
      setTone(r.result); setToneDemo(r.demo); setNotice(r.notice || ""); setShade(null); setVto(null); setTintVto(null);
      if (!r.demo && r.result.skinColor && state.kind === "own") actions.setSkinTone({ hex: r.result.skinColor, date: localISO(), source: "live", eyeColor: r.result.eyeColor, hairColor: r.result.hairColor });
    } catch (e) { fail(e, "tone"); }
    setBusy("");
  }
  async function tryOn(forceDemo = false) {
    if (!chosen) return;
    setErr(null); setBusy("vto");
    try {
      const r = await runTask<{ url: string }>("makeup-vto", forceDemo ? null : await getBlob("makeup-vto"), { shade: chosen.hex }, undefined, { forceDemo });
      setVto({ url: r.result.url, demo: r.demo, shade: r.demo && demo && !RECORDED_SHADES.includes(chosen.code) ? "5N" : chosen.code, before: r.demo ? DEMO_FACE : photoUrl! });
      setTintVto(null);
      if (r.notice) setNotice(r.notice);
    } catch (e) { fail(e, "vto"); }
    setBusy("");
  }
  async function tryTint() {
    if (!tintHex) return;
    setErr(null); setBusy("tint");
    try {
      const r = await runTask<{ url: string }>("makeup-vto", await getBlob("makeup-vto"), { shade: tintHex });
      setTintVto({ url: r.result.url, demo: r.demo });
    } catch (e) { fail(e, "vto"); }
    setBusy("");
  }

  if (!state.ready) return <Skeleton lines={2} />;
  const current = tintHex && tone?.skinColor ? { name: product?.shadeName, d: deltaE(tintHex, tone.skinColor) } : null;
  const demoTintRecorded = !demo || tintHex?.toLowerCase() === DEMO_TINT_SHADE.hex;

  return (
    <div className="fade-in">
      <Link href={product ? `/products/${product.id}` : "/"} className="back">← {product ? product.name : "Today"}</Link>
      <div className="eyebrow">Try before you buy</div>
      <h1 style={{ marginTop: 6 }}>A shade that's <em>actually</em> yours.</h1>
      <p className="lede">
        {product?.complexion
          ? `${product.name} was dropped for its shade, not your skin. Read your real skin tone, pick the nearest shade, and see it on your face before you buy a replacement.`
          : "Read your real skin tone, match the nearest foundation shade, and preview it on your own face before spending a penny."}
      </p>

      <div className="tryon-grid">
        <div>
          <div className="card section">
            <div className="eyebrow">Step 1 · Read your skin tone · YouCam Skin Tone Analysis</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
              {photoUrl ? <Img src={photoUrl} alt="Photo used for skin tone" style={{ width: 72, height: 96, objectFit: "cover", borderRadius: 12 }} /> : <div style={{ width: 72, height: 96, borderRadius: 12, background: "var(--paper-2)" }} />}
              <div style={{ flex: 1 }}>
                <p className="small" style={{ margin: 0 }}>{demo ? "Demo: using the sample face (week 8)." : src ? "Using your uploaded selfie." : latest ? "Using your latest check-in photo (full size)." : "Upload a bare-skin selfie, facing a window."}</p>
                {!demo && <button className="btn soft" style={{ padding: "8px 12px", fontSize: 13, marginTop: 8 }} onClick={() => fileRef.current?.click()}>{photoUrl ? "Use another photo" : "Upload a selfie"}</button>}
                <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const p = await prepareImage(f); setSrc({ url: URL.createObjectURL(p.blob), blob: p.blob }); setTone(null); setVto(null); setErr(null); } }} />
              </div>
            </div>
            <button className="btn block" style={{ marginTop: 14 }} disabled={busy !== "" || (!photoUrl && !demo)} onClick={() => readTone()}>{busy === "tone" ? "Reading skin tone…" : tone ? "Read again" : "Analyse my skin tone"}</button>
            {tone?.skinColor && (
              <div className="fade-in" style={{ marginTop: 16 }}>
                <div className="match">
                  <div className="pair"><span style={{ background: tone.skinColor }} /></div>
                  <div><b>Your skin</b> <span className="num small muted">{tone.skinColor.toUpperCase()}</span><br /><span className="small muted">Eyes {tone.eyeColor?.toLowerCase()} · hair {tone.hairColor?.toLowerCase()}{tone.faceQuality?.lighting ? ` · lighting ${String(tone.faceQuality.lighting)}` : ""}</span></div>
                </div>
                {current && (
                  <div className={`banner ${current.d > 5 ? "warn" : ""}`}><span>Your current tint <b>{current.name}</b> is ΔE {current.d.toFixed(1)} from your skin — {matchQuality(current.d).toLowerCase()}.</span></div>
                )}
                {toneDemo && <div className="banner demo">◆ Recorded real YouCam Skin Tone Analysis of the demo face{usingDemoFace ? "" : " (not your photo)"}. Live mode reads yours.</div>}
              </div>
            )}
          </div>

          {matches.length > 0 && (
            <div className="card section fade-in">
              <div className="eyebrow">Step 2 · Nearest shades in {RANGE.brand} {RANGE.product}</div>
              <div className="top-matches">
                {matches.slice(0, 3).map((m, i) => (
                  <button key={m.code} className={`top-match ${chosen?.code === m.code ? "on" : ""}`} aria-pressed={chosen?.code === m.code} onClick={() => setShade(m.code)}>
                    <span className="sw" style={{ background: m.hex }} />
                    <span><b>{m.code} {m.name}</b>{i === 0 && <span className="best">best</span>}<br /><span className="small muted">ΔE {m.deltaE} · {m.quality.toLowerCase()} · {m.undertone}</span></span>
                  </button>
                ))}
              </div>
              <details style={{ marginTop: 12 }}>
                <summary className="small">All 30 shades</summary>
                <div className="swatches" role="group" aria-label="All shades">
                  {SHADES.map((s) => (
                    <button key={s.code} aria-label={`${s.code} ${s.name}, ${s.undertone}`} aria-pressed={chosen?.code === s.code} className={`swatch ${chosen?.code === s.code ? "on" : ""}`} style={{ background: s.hex }} onClick={() => setShade(s.code)}>
                      <small>{s.code}</small>
                    </button>
                  ))}
                </div>
              </details>
              {chosen && chosenMatch && (
                <div className="match" style={{ marginTop: 16 }}>
                  <div className="pair"><span style={{ background: tone!.skinColor }} /><span style={{ background: chosen.hex }} /></div>
                  <div style={{ flex: 1 }}><b>{chosen.code} {chosen.name}</b> <span className="small muted">· {chosen.undertone}</span><br /><span className="small">ΔE {chosenMatch.deltaE} (CIEDE2000) · {chosenMatch.quality}</span></div>
                </div>
              )}
              <button className="btn block" style={{ marginTop: 16 }} disabled={busy !== ""} onClick={() => tryOn()}>{busy === "vto" ? "Applying virtually…" : `See ${chosen?.code ?? "it"} on my face · YouCam Makeup VTO`}</button>
              {demo && chosen && !RECORDED_SHADES.includes(chosen.code) && <p className="small muted">The demo has a recorded try-on for the best match (5N); live mode renders any shade.</p>}
            </div>
          )}

          {notice && <div className="banner warn">{notice}</div>}
          {err && (
            <div className="banner err" role="alert" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <span>{err.msg}</span>
              <span className="btn-row">
                {err.retake && !demo && <button className="btn soft" onClick={() => fileRef.current?.click()}>Upload another photo</button>}
                {err.canFallback && <button className="btn soft" onClick={() => (err.step === "tone" ? readTone(true) : tryOn(true))}>Show the recorded result</button>}
              </span>
            </div>
          )}
        </div>

        <div ref={resultRef}>
          {vto && (
            <div className="section fade-in first-right">
              <div className="eyebrow" style={{ marginBottom: 8 }}>{vto.demo ? "Recorded real YouCam Makeup VTO" : "Live · YouCam Makeup VTO"} · {vto.shade} foundation + concealer</div>
              {tintVto ? (
                <CompareSlider before={tintVto.url} after={vto.url} labels={[`Your tint · ${product?.shadeName}`, `${vto.shade} match`]} />
              ) : (
                <CompareSlider before={vto.before} after={vto.url} labels={["Bare", vto.shade]} />
              )}
              {tintHex && demoTintRecorded && (
                <button className="btn soft block" style={{ marginTop: 10 }} disabled={busy !== ""} onClick={() => (tintVto ? setTintVto(null) : tryTint())}>
                  {busy === "tint" ? "Rendering your current tint…" : tintVto ? "Compare with bare skin instead" : `Compare with your current tint (${product?.shadeName})`}
                </button>
              )}
              <div className="card" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="small muted">{RANGE.brand}</div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 18 }}>{RANGE.product} · {vto.shade}</div>
                  <div className="small muted">Matched to your skin tone, previewed on your face.</div>
                </div>
                <button className="btn" onClick={() => setBuy(true)}>£{RANGE.price} · Buy</button>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>Fictional brand and a formula-generated 30-shade range for the demo. Retail partners plug in their own range and cart.</p>
            </div>
          )}
          {!vto && (
            <div className="card section first-right tryon-explainer">
              <div className="eyebrow">How it works</div>
              <ol className="small">
                <li><b>YouCam Skin Tone Analysis</b> reads your skin colour from a bare-skin photo.</li>
                <li>We rank the range by <b>CIEDE2000 ΔE</b>, the standard perceptual colour difference (over 5 is a visible mismatch).</li>
                <li><b>YouCam Makeup VTO</b> renders foundation + concealer in that shade on your face.</li>
              </ol>
            </div>
          )}
        </div>
      </div>

      <Sheet open={buy} onClose={() => setBuy(false)} title="Added to basket">
        <p style={{ marginTop: 0 }}><b>{RANGE.product} · {vto?.shade}</b> · £{RANGE.price}</p>
        <p className="small muted">Demo checkout. A retailer's version sends you to their own basket with the matched shade pre-selected, so the swap happens inside their catalogue instead of the customer churning.</p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setBuy(false)}>Keep looking</button>
          <Link href="/retailers" className="btn">For retailers</Link>
        </div>
      </Sheet>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><TryOn /></Suspense>;
}
