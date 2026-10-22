"use client";
import { useRef, useState } from "react";
import type { ConcernKey } from "@/lib/types";
import { concernMeta } from "@/lib/concerns";
import { fullSizePhoto, imageSize, prepareImage, runTask, TaskError } from "@/lib/api-client";
import { minShortSide } from "@/lib/fallback";
import { useMode } from "./ModeProvider";
import CompareSlider from "./CompareSlider";

const INTENSITY = 0.5;

/**
 * "Give it N more weeks" made visible: YouCam AI Skin Simulation renders the latest check-in with the target concern
 * improved (intensity 0.5 of 1). It's an illustration of what a visible improvement would look like, not a prediction.
 */
export default function SimulationCard({ concern, photo, thumb, weeks }: { concern: ConcernKey; photo?: string; thumb?: string; weeks: number }) {
  const { demo } = useMode();
  const label = concernMeta(concern).label.toLowerCase();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ url: string; demo: boolean; before: string } | null>(null);
  const [err, setErr] = useState<{ msg: string; retake: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(blob: Blob | null, before: string, forceDemo = false) {
    setBusy(true); setErr(null); setNotice("");
    try {
      if (!demo && !forceDemo) {
        if (!blob) { setErr({ msg: "We need a full-size photo for this (your saved check-in only has a small thumbnail). Upload a bare-skin selfie.", retake: true }); setBusy(false); return; }
        const { width, height } = await imageSize(blob);
        if (Math.min(width, height) < minShortSide("skin-simulation")) { setErr({ msg: `That photo is ${Math.min(width, height)}px on its short side; YouCam needs at least ${minShortSide("skin-simulation")}px. Upload a larger selfie.`, retake: true }); setBusy(false); return; }
      }
      const r = await runTask<{ url: string }>("skin-simulation", demo || forceDemo ? null : blob, { concern, intensity: String(INTENSITY) }, undefined, { forceDemo });
      setRes({ url: r.result.url, demo: r.demo, before: r.demo ? "/demo/series/w08/photo.jpg" : before });
      if (r.notice) setNotice(r.notice);
    } catch (e) {
      setErr({ msg: (e as Error).message, retake: e instanceof TaskError && !!e.code });
    }
    setBusy(false);
  }

  return (
    <div className="card sim-card">
      <div className="eyebrow">If it starts working · YouCam AI Skin Simulation</div>
      <h3 style={{ marginTop: 6 }}>What a visible {label} improvement would look like on you</h3>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        Worth {weeks} more week{weeks === 1 ? "" : "s"} to find out. This renders your latest check-in with {label} improved at intensity {INTENSITY} of 1 — an illustration to compare against in {weeks} weeks, not a prediction.
      </p>
      {!res && (
        <button className="btn block" style={{ marginTop: 12 }} disabled={busy || (!photo && !demo)} onClick={async () => run(await fullSizePhoto(photo), photo || thumb || "")}>
          {busy ? "Simulating…" : `Show me (${demo ? "recorded" : "4 units"})`}
        </button>
      )}
      {err && (
        <div className="banner err" role="alert" style={{ flexDirection: "column" }}>
          <span>{err.msg}</span>
          <span className="btn-row" style={{ width: "100%" }}>
            {err.retake && <button className="btn soft" onClick={() => fileRef.current?.click()}>Upload a selfie</button>}
            <button className="btn soft" onClick={() => run(null, "", true)}>Show the recorded example</button>
          </span>
        </div>
      )}
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const p = await prepareImage(f); run(p.blob, URL.createObjectURL(p.blob)); } }} />
      {notice && <div className="banner warn">{notice}</div>}
      {res && (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <CompareSlider before={res.before} after={res.url} labels={["Now", `Simulated ${label}`]} />
          <p className="small muted" style={{ marginTop: 8 }}>{res.demo ? `Recorded real YouCam Skin Simulation (texture, intensity ${INTENSITY}) on the demo face's week-8 photo.` : "Live YouCam Skin Simulation of your photo."}</p>
        </div>
      )}
    </div>
  );
}
