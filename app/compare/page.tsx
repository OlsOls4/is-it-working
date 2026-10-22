"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/store";
import { CONCERNS } from "@/lib/concerns";
import type { ConcernKey } from "@/lib/types";
import CompareSlider from "@/components/CompareSlider";
import Skeleton from "@/components/Skeleton";
import { fmtDate } from "@/lib/useVerdicts";

export default function Compare() {
  const state = useAppState();
  const withPhoto = useMemo(() => state.checkIns.filter((c) => c.photo || c.thumb), [state.checkIns]);
  const first = state.checkIns[0]?.date;
  const wk = (d: string) => (first ? `W${Math.round((new Date(d).getTime() - new Date(first).getTime()) / (7 * 86400000))}` : "");
  const [a, setA] = useState<string | undefined>();
  const [b, setB] = useState<string | undefined>();
  const [mask, setMask] = useState<ConcernKey | null | undefined>(undefined);
  useEffect(() => { if (withPhoto.length && !a) { setA(withPhoto[0].id); setB(withPhoto[withPhoto.length - 1].id); } }, [withPhoto, a]);
  const A = withPhoto.find((c) => c.id === a), B = withPhoto.find((c) => c.id === b);
  // Only offer a mask when BOTH weeks have one, so the overlay never implies a concern "vanished".
  const masksAvailable = A && B ? CONCERNS.filter((c) => A.scores[c.key]?.mask && B.scores[c.key]?.mask) : [];
  const keepConcern = state.products.find((p) => masksAvailable.some((m) => m.key === p.concern))?.concern;
  const activeMask = mask === undefined ? (keepConcern ?? null) : mask && masksAvailable.some((m) => m.key === mask) ? mask : null;

  if (!state.ready) return <Skeleton lines={1} />;
  if (withPhoto.length < 2 || !A || !B) {
    return (
      <div className="fade-in narrow">
        <div className="eyebrow">Same face, same light, weeks apart</div>
        <h1 style={{ marginTop: 6 }}>Compare</h1>
        <div className="card section empty">
          <h3>{withPhoto.length ? "One more check-in to go" : "No check-in photos yet"}</h3>
          <p className="small muted">You need two check-ins with photos to compare. {withPhoto.length ? "Come back next week, same place, same light." : "Take your baseline selfie first."}</p>
          <Link href="/check-in" className="btn block" style={{ marginTop: 12 }}>Check in</Link>
        </div>
      </div>
    );
  }
  const delta = activeMask ? (B.scores[activeMask]!.raw - A.scores[activeMask]!.raw) : null;

  return (
    <div className="fade-in">
      <div className="eyebrow">Same face, same light, weeks apart</div>
      <h1 style={{ marginTop: 6 }}>Compare</h1>
      <p className="lede">Drag the divider. Turn on a YouCam detection mask to see exactly what the AI measured each week.</p>

      <div className="compare-grid">
        <div>
          <div className="section grid2">
            {[{ v: a, set: setA, l: "Before" }, { v: b, set: setB, l: "After" }].map((s) => (
              <label key={s.l} className="field" style={{ marginTop: 0 }}><span>{s.l}</span>
                <select className="input" value={s.v} onChange={(e) => s.set(e.target.value)}>
                  {withPhoto.map((c) => <option key={c.id} value={c.id}>{wk(c.date)} · {fmtDate(c.date)}{c.source === "recorded" ? " · sample" : ""}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <CompareSlider
              before={A.photo || A.thumb!} after={B.photo || B.thumb!} beforeFallback={A.thumb} afterFallback={B.thumb}
              beforeMask={activeMask ? A.scores[activeMask]?.mask : undefined}
              afterMask={activeMask ? B.scores[activeMask]?.mask : undefined}
              labels={[wk(A.date), wk(B.date)]}
            />
          </div>
          {activeMask && delta !== null && (
            <p className="small" style={{ marginTop: 8 }}>
              <b>{CONCERNS.find((c) => c.key === activeMask)!.label} {delta > 0 ? "+" : ""}{delta.toFixed(1)} pts</b> ({wk(A.date)} → {wk(B.date)}). Each side shows that week's own YouCam mask.
            </p>
          )}
        </div>

        <div>
          {masksAvailable.length > 0 && (
            <div className="section first-right">
              <div className="eyebrow" id="mask-label" style={{ marginBottom: 8 }}>YouCam detection mask</div>
              <div className="chips wrap" role="group" aria-labelledby="mask-label">
                <button aria-pressed={activeMask === null} className={`chip ${activeMask === null ? "on" : ""}`} onClick={() => setMask(null)}>Off</button>
                {masksAvailable.map((c) => (
                  <button key={c.key} aria-pressed={activeMask === c.key} className={`chip ${activeMask === c.key ? "on" : ""}`} onClick={() => setMask(c.key)}><span className="sw" style={{ background: c.colour }} />{c.label}</button>
                ))}
              </div>
              {state.kind === "demo" && <p className="small muted" style={{ marginTop: 8 }}>Every week's masks are real YouCam Skin Analysis output for that week's photo.</p>}
            </div>
          )}

          <div className="card section">
            <h3>Change in score, {wk(A.date)} → {wk(B.date)}</h3>
            <p className="small muted" style={{ margin: "4px 0 0" }}>Bar = score now (higher = healthier); number = change.</p>
            <div className="scores">
              {CONCERNS.map((c) => {
                const x = A.scores[c.key]?.raw, y = B.scores[c.key]?.raw;
                if (x === undefined || y === undefined) return null;
                const d = y - x;
                return (
                  <div className="score-row" key={c.key}>
                    <span>{c.label}</span>
                    <span className="bar"><span style={{ width: `${y}%`, background: c.colour }} /></span>
                    <span className="num small" style={{ color: d > 2 ? "var(--keep)" : d < -2 ? "var(--drop)" : "var(--ink-3)", textAlign: "right" }}>{d > 0 ? "+" : ""}{d.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
