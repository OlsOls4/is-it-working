"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMode } from "@/components/ModeProvider";
import { prepareImage, runTask, TaskError } from "@/lib/api-client";
import { actions, uid, useAppState } from "@/lib/store";
import { persistUrl, putBlob } from "@/lib/blobstore";
import { localISO } from "@/lib/dates";
import { minShortSide } from "@/lib/fallback";
import { CONCERNS } from "@/lib/concerns";
import type { CheckIn, ConcernKey } from "@/lib/types";

type Step = "prep" | "camera" | "review" | "analysing" | "result" | "error";
type Result = Pick<CheckIn, "scores" | "overall" | "skinAge"> & { resized?: string };

const Guide = () => (
  <svg className="guide" viewBox="0 0 300 400" preserveAspectRatio="none">
    <defs><mask id="m"><rect width="300" height="400" fill="white" /><ellipse cx="150" cy="190" rx="108" ry="146" fill="black" /></mask></defs>
    <rect width="300" height="400" fill="rgba(0,0,0,0.45)" mask="url(#m)" />
    <ellipse cx="150" cy="190" rx="108" ry="146" fill="none" stroke="white" strokeWidth="2" strokeDasharray="6 6" />
    <line x1="150" y1="40" x2="150" y2="56" stroke="white" strokeWidth="2" />
    <line x1="60" y1="160" x2="240" y2="160" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
  </svg>
);

export default function CheckInPage() {
  const { demo, liveConfigured } = useMode();
  const state = useAppState();
  const [step, setStep] = useState<Step>("prep");
  const [photo, setPhoto] = useState<{ blob: Blob; dataUrl: string; luminance: number; width: number; height: number; preview: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isDemoResult, setIsDemoResult] = useState(false);
  const [notice, setNotice] = useState("");
  const [canFallback, setCanFallback] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [mask, setMask] = useState<ConcernKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  useEffect(() => stop, []);

  async function openCamera() {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false });
      streamRef.current = s;
      setStep("camera");
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); } }, 30);
    } catch {
      setErr("We couldn't open your camera. You can upload a selfie instead.");
    }
  }

  async function capture() {
    const v = videoRef.current!;
    const vw = v.videoWidth, vh = v.videoHeight;
    const targetRatio = 3 / 4;
    let sw = vw, sh = vh;
    if (vw / vh > targetRatio) sw = Math.round(vh * targetRatio); else sh = Math.round(vw / targetRatio);
    const c = document.createElement("canvas"); c.width = sw; c.height = sh;
    c.getContext("2d")!.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
    stop();
    const p = await prepareImage(c);
    setPhoto({ ...p, preview: URL.createObjectURL(p.blob) });
    setStep("review");
  }

  async function onFile(f?: File | null) {
    if (!f) return;
    const p = await prepareImage(f);
    setPhoto({ ...p, preview: URL.createObjectURL(p.blob) });
    setStep("review");
  }

  async function useSample() {
    const blob = await (await fetch("/demo/series/w08/photo.jpg")).blob();
    const p = await prepareImage(blob);
    setPhoto({ ...p, preview: "/demo/series/w08/photo.jpg" });
    setStep("review");
  }

  async function analyse(forceDemo = false) {
    if (!photo) return;
    setStep("analysing"); setErr(""); setNotice(""); setCanFallback(false);
    try {
      const r = await runTask<Result>("skin-analysis", photo.blob, {}, setStatus, { forceDemo });
      setResult(r.result); setIsDemoResult(r.demo); setNotice(r.notice || ""); setStep("result");
    } catch (e) {
      setErr((e as Error).message); setCanFallback(e instanceof TaskError && e.canFallback); setStep("error");
    }
  }

  /**
   * Save the check-in. Live results: copy the full-size photo and every YouCam mask into IndexedDB first, because
   * YouCam's mask URLs are signed links that expire after ~2 hours (Compare would break the next day otherwise).
   * Recorded results (public demo, no access code) are saved too, clearly marked, so "Start my own" isn't a dead end.
   */
  async function save() {
    if (!result || !photo) return;
    setSaving(true);
    const id = uid();
    const recorded = isDemoResult;
    let photoRef: string | undefined = recorded ? resultPhoto : undefined;
    const scores: CheckIn["scores"] = {};
    try {
      if (!recorded) photoRef = await putBlob(`checkin-${id}-photo`, photo.blob);
      await Promise.all(Object.entries(result.scores).map(async ([k, sc]) => {
        scores[k as ConcernKey] = { ...sc!, mask: recorded ? sc!.mask : await persistUrl(`checkin-${id}-mask-${k}`, sc!.mask) };
      }));
    } catch {
      Object.assign(scores, result.scores); // IndexedDB unavailable (private mode): keep scores, masks may expire
    }
    actions.addCheckIn({ id, date: localISO(), photo: photoRef, thumb: photo.dataUrl, scores, overall: result.overall, skinAge: result.skinAge, source: recorded ? "recorded" : "live" });
    setSaving(false); setSaved(true);
  }

  const lowLight = photo && photo.luminance < 85;
  const brightLight = photo && photo.luminance > 215;
  const MIN = minShortSide("skin-analysis");
  const smallImg = photo && Math.min(photo.width, photo.height) < MIN;
  const resultPhoto = isDemoResult ? "/demo/series/w08/photo.jpg" : photo?.preview;

  return (
    <div className="fade-in">
      <Link href="/" className="back">← Today</Link>
      {step === "prep" && (
        <>
          <div className="eyebrow">Weekly check-in · about 30 seconds</div>
          <h1 style={{ marginTop: 6 }}>Same place, same light, <em>every week</em>.</h1>
          <p className="lede">Consistency is what makes the verdict trustworthy. A change in lighting can move scores more than a serum.</p>
          <div className="tips card section">
            {[
              ["Face a window", "Soft daylight in front of you — no lamps behind, no direct sun."],
              ["Bare skin", "No makeup or SPF tint. Same time of day if you can (mornings are best)."],
              ["Hair back, glasses off", "Show your whole forehead. Keep a neutral face, mouth closed."],
              ["Fill the oval", "Hold the phone at eye level, face filling ~70% of the frame width."],
            ].map(([h, t], i) => (
              <div className="tip" key={h}><span className="n">{i + 1}</span><span><b>{h}.</b> {t}</span></div>
            ))}
          </div>
          {err && <div className="banner err">{err}</div>}
          <div className="section" style={{ display: "grid", gap: 10 }}>
            <button className="btn block" onClick={openCamera}>Open camera</button>
            <button className="btn ghost block" onClick={() => fileRef.current?.click()}>Upload a selfie</button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" capture="user" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <button className="btn soft block" onClick={useSample}>{demo ? "Use the sample face (demo)" : "Use the synthetic sample face"}</button>
          </div>
          {demo && <div className="banner demo">◆ Demo mode: analysis returns a recorded real YouCam response for our synthetic sample face (week 8), whatever photo you use.{liveConfigured ? " Live analysis is switched on for testers with an access code." : ""}</div>}
          {!demo && <p className="small muted" style={{ marginTop: 12 }}>Live mode: your photo is sent to the YouCam Skin Analysis API (8 concerns). It isn't stored on our server.</p>}
        </>
      )}

      {step === "camera" && (
        <>
          <div className="cam">
            <video ref={videoRef} className="mirror" playsInline muted />
            <Guide />
            <div className="hint">Line your face up with the oval · chin on the bottom curve</div>
          </div>
          <div className="btn-row section">
            <button className="btn ghost" onClick={() => { stop(); setStep("prep"); }}>Cancel</button>
            <button className="btn" onClick={capture}>Take photo</button>
          </div>
        </>
      )}

      {step === "review" && photo && (
        <>
          <h2>Happy with this one?</h2>
          <div className="cam section"><img className="preview" src={photo.preview} alt="Your selfie" /><Guide /></div>
          {lowLight && <div className="banner warn">It looks a bit dark — scores for redness and spots get unreliable in low light. Try facing a window.</div>}
          {brightLight && <div className="banner warn">It looks very bright — blown-out highlights hide texture. Step back from direct light.</div>}
          {smallImg && <div className="banner err">This image is {Math.min(photo.width, photo.height)}px on its short side; YouCam Skin Analysis needs at least {MIN}px. Retake or upload a larger photo.</div>}
          {!lowLight && !brightLight && !smallImg && <div className="banner" style={{ background: "var(--keep-bg)", color: "var(--keep)" }}>✓ Lighting looks even.</div>}
          <div className="btn-row section">
            <button className="btn ghost" onClick={() => { setPhoto(null); setStep("prep"); }}>Retake</button>
            <button className="btn" disabled={!!smallImg} onClick={() => analyse()}>Analyse skin</button>
          </div>
        </>
      )}

      {step === "analysing" && photo && (
        <>
          <div className="cam" style={{ marginTop: 6 }}><img className="preview" src={photo.preview} alt="" /><div className="scan" /></div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <div className="spinner" />
            <p className="muted" style={{ marginTop: 12 }}>{status === "uploading" ? "Uploading securely…" : "YouCam is reading acne, redness, spots, lines, pores, moisture, texture and glow…"}</p>
          </div>
        </>
      )}

      {step === "error" && (
        <>
          <h2>{canFallback ? "Let's retake that" : "That didn't work"}</h2>
          <div className="banner err" role="alert">{err}</div>
          <div className="btn-row section">
            <button className="btn" onClick={() => { setPhoto(null); setStep("prep"); }}>Retake photo</button>
            <button className="btn ghost" onClick={() => analyse()}>Try the same photo again</button>
          </div>
          {canFallback && <button className="btn soft block section" onClick={() => analyse(true)}>Show the recorded demo result instead</button>}
        </>
      )}

      {step === "result" && result && (
        <>
          <div className="eyebrow">{isDemoResult ? "Demo · recorded real YouCam response" : "Live · YouCam Skin Analysis"}</div>
          <h1 style={{ marginTop: 6 }}>Overall <span className="num">{Math.round(result.overall ?? 0)}</span>{result.skinAge ? <span className="muted" style={{ fontSize: 18 }}> · skin age {result.skinAge}</span> : null}</h1>
          {notice && <div className="banner warn">{notice}</div>}
          {isDemoResult && <div className="banner demo">◆ These are the real scores YouCam returned for our synthetic sample face (shown below), not for your photo.</div>}
          <div className="compare section" style={{ aspectRatio: "580 / 780" }}>
            <img src={resultPhoto} alt="Analysed photo" />
            {mask && result.scores[mask]?.mask && <img src={result.scores[mask]!.mask} alt="" />}
          </div>
          <div className="chips" role="group" aria-label="YouCam detection mask" style={{ marginTop: 10 }}>
            <button aria-pressed={mask === null} className={`chip ${mask === null ? "on" : ""}`} onClick={() => setMask(null)}>No mask</button>
            {CONCERNS.filter((c) => result.scores[c.key]?.mask).map((c) => (
              <button key={c.key} aria-pressed={mask === c.key} className={`chip ${mask === c.key ? "on" : ""}`} onClick={() => setMask(c.key)}><span className="sw" style={{ background: c.colour }} />{c.label}</button>
            ))}
          </div>
          <div className="card section">
            <div className="scores">
              {CONCERNS.map((c) => {
                const s = result.scores[c.key];
                if (!s) return null;
                return (
                  <div className="score-row" key={c.key}>
                    <span>{c.label}</span>
                    <span className="bar"><span style={{ width: `${s.raw}%`, background: c.colour }} /></span>
                    <span className="num small" style={{ textAlign: "right" }}>{Math.round(s.raw)}</span>
                  </div>
                );
              })}
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>YouCam raw scores, 1–100, higher = healthier skin for that concern.</p>
          </div>
          {state.kind === "demo" ? (
            <div className="section" style={{ display: "grid", gap: 10 }}>
              <p className="small muted" style={{ margin: 0 }}>{isDemoResult ? "Demo results aren't added to the seeded demo timeline (its 9 weeks are already real recorded analyses)." : "You're on the demo profile. Choose “Start my own” under Products → Your data to save live check-ins."}</p>
              <Link href="/" className="btn block">See the verdicts</Link>
            </div>
          ) : saved ? (
            <Link href="/" className="btn block section">Saved ✓ — see your verdicts</Link>
          ) : (
            <div className="section" style={{ display: "grid", gap: 10 }}>
              {isDemoResult && <p className="small muted" style={{ margin: 0 }}>This is the recorded sample result (no live access code), so it will be saved marked “sample” — it measures our synthetic face, not you. Live analysis needs the access code from the Devpost testing instructions.</p>}
              <button className="btn block" disabled={saving} onClick={save}>{saving ? "Saving photo and masks…" : isDemoResult ? "Save as a sample check-in" : "Save this check-in"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
