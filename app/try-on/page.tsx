"use client";
import { Suspense, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/store";
import { useMode } from "@/components/ModeProvider";
import { prepareImage, runTask } from "@/lib/api-client";
import { deltaE, matchShades, RANGE, SHADES } from "@/lib/shades";
import CompareSlider from "@/components/CompareSlider";

type Tone = { skinColor?: string; eyeColor?: string; lipColor?: string; hairColor?: string };

function TryOn() {
  const q = useSearchParams();
  const state = useAppState();
  const { demo } = useMode();
  const product = state.products.find((p) => p.id === q.get("product"));
  const latest = [...state.checkIns].reverse().find((c) => c.photo);
  const [src, setSrc] = useState<{ url: string; blob?: Blob } | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [toneDemo, setToneDemo] = useState(false);
  const [shade, setShade] = useState<string | null>(null);
  const [vto, setVto] = useState<{ url: string; demo: boolean; shade: string } | null>(null);
  const [busy, setBusy] = useState<"" | "tone" | "vto">("");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const photoUrl = src?.url ?? (demo ? "/demo/week-00.jpg" : latest?.photo);
  const matches = useMemo(() => (tone?.skinColor ? matchShades(tone.skinColor) : []), [tone]);
  const chosen = SHADES.find((s) => s.code === shade) ?? matches[0];

  async function getBlob(): Promise<Blob | null> {
    if (src?.blob) return src.blob;
    if (!photoUrl) return null;
    return (await prepareImage(await (await fetch(photoUrl)).blob())).blob;
  }

  async function readTone() {
    setErr(""); setBusy("tone");
    try {
      const r = await runTask<Tone>("skin-tone-analysis", demo ? null : await getBlob());
      setTone(r.result); setToneDemo(r.demo); setShade(null); setVto(null);
    } catch (e) { setErr((e as Error).message); }
    setBusy("");
  }
  async function tryOn() {
    if (!chosen) return;
    setErr(""); setBusy("vto");
    try {
      const r = await runTask<{ url: string }>("makeup-vto", demo ? null : await getBlob(), { shade: chosen.hex });
      setVto({ url: r.result.url, demo: r.demo, shade: chosen.code });
    } catch (e) { setErr((e as Error).message); }
    setBusy("");
  }

  const current = product?.shadeHex && tone?.skinColor ? { name: product.shadeName, d: deltaE(product.shadeHex, tone.skinColor) } : null;

  return (
    <div className="fade-in">
      <Link href={product ? `/products/${product.id}` : "/"} className="back">← {product ? product.name : "Today"}</Link>
      <div className="eyebrow">Try before you buy</div>
      <h1 style={{ marginTop: 6 }}>A shade that's <em>actually</em> yours.</h1>
      <p className="lede">
        {product?.complexion
          ? `${product.name} isn't earning its place. Before you buy another complexion product, let's match your real skin tone and preview it on your face.`
          : "Match your skin tone and preview a foundation on your own face before spending a penny."}
      </p>

      <div className="card section">
        <div className="eyebrow">Step 1 · Read your skin tone</div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
          {photoUrl ? <img src={photoUrl} alt="" style={{ width: 72, height: 96, objectFit: "cover", borderRadius: 12 }} /> : <div style={{ width: 72, height: 96, borderRadius: 12, background: "var(--paper-2)" }} />}
          <div style={{ flex: 1 }}>
            <p className="small" style={{ margin: 0 }}>{demo ? "Using the demo sample face." : src ? "Using your uploaded selfie." : latest ? "Using your latest check-in photo." : "Upload a bare-skin selfie."}</p>
            {!demo && <button className="btn soft" style={{ padding: "8px 12px", fontSize: 13, marginTop: 8 }} onClick={() => fileRef.current?.click()}>Use another photo</button>}
            <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const p = await prepareImage(f); setSrc({ url: URL.createObjectURL(p.blob), blob: p.blob }); setTone(null); setVto(null); } }} />
          </div>
        </div>
        <button className="btn block" style={{ marginTop: 14 }} disabled={busy !== "" || !photoUrl} onClick={readTone}>{busy === "tone" ? "Reading skin tone…" : tone ? "Read again" : "Analyse my skin tone"}</button>
        {tone?.skinColor && (
          <div className="fade-in" style={{ marginTop: 16 }}>
            <div className="match">
              <div className="pair"><span style={{ background: tone.skinColor }} /></div>
              <div><b>Your skin</b> <span className="num small muted">{tone.skinColor.toUpperCase()}</span><br /><span className="small muted">Eyes {tone.eyeColor?.toLowerCase()} · hair {tone.hairColor?.toLowerCase()}</span></div>
            </div>
            {current && (
              <div className="banner warn"><span>Your current tint <b>{current.name}</b> is ΔE {current.d.toFixed(1)} from your skin{current.d > 6 ? " — a visible mismatch." : "."}</span></div>
            )}
            {toneDemo && <div className="banner demo">◆ Demo: Skin Tone Analysis costs 20 units, so this response is simulated in the documented format (skin colour sampled from the photo). Live mode calls the real API.</div>}
          </div>
        )}
      </div>

      {matches.length > 0 && (
        <div className="card section fade-in">
          <div className="eyebrow">Step 2 · Your matches from {RANGE.brand} {RANGE.product}</div>
          <div className="swatches" style={{ marginBottom: 18 }}>
            {SHADES.map((s) => (
              <button key={s.code} aria-label={`${s.code} ${s.name}`} className={`swatch ${chosen?.code === s.code ? "on" : ""}`} style={{ background: s.hex }} onClick={() => { setShade(s.code); }}>
                <small>{s.code}</small>
              </button>
            ))}
          </div>
          {chosen && (
            <div className="match" style={{ marginTop: 14 }}>
              <div className="pair"><span style={{ background: tone!.skinColor }} /><span style={{ background: chosen.hex }} /></div>
              <div style={{ flex: 1 }}>
                <b>{chosen.code} {chosen.name}</b> <span className="small muted">· {chosen.undertone}</span><br />
                <span className="small">{(matches.find((m) => m.code === chosen.code)?.match ?? 0)}% match · ΔE {matches.find((m) => m.code === chosen.code)?.deltaE}</span>
                {chosen.code === matches[0].code && <span className="stamp KEEP" style={{ marginLeft: 8, fontSize: 9, padding: "2px 5px" }}>Best</span>}
              </div>
            </div>
          )}
          <button className="btn block" style={{ marginTop: 16 }} disabled={busy !== ""} onClick={tryOn}>{busy === "vto" ? "Applying virtually…" : "See it on my face"}</button>
          {demo && chosen && chosen.code !== "W230" && <p className="small muted">Demo has one recorded try-on (W230). Live mode renders any shade.</p>}
        </div>
      )}

      {err && <div className="banner err">{err}</div>}

      {vto && photoUrl && (
        <div className="section fade-in">
          <div className="eyebrow" style={{ marginBottom: 8 }}>{vto.demo ? "Demo · recorded real YouCam Makeup VTO" : "Live · YouCam Makeup VTO"} · {vto.shade} foundation + concealer</div>
          <CompareSlider before={vto.demo ? "/demo/week-00.jpg" : photoUrl} after={vto.url} labels={["Bare", vto.shade]} />
          <div className="card" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="small muted">{RANGE.brand}</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 18 }}>{RANGE.product} · {vto.shade}</div>
              <div className="small muted">Matched to your skin, previewed on your face. Fewer wrong-shade returns.</div>
            </div>
            <button className="btn" onClick={() => alert("Checkout placeholder — this is where a retailer's cart link goes.")}>£{RANGE.price} · Buy</button>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Fictional brand and shades for the demo. Retail partners plug in their own range and cart.</p>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><TryOn /></Suspense>;
}
