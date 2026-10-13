"use client";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/store";
import { CONCERNS } from "@/lib/concerns";
import type { ConcernKey } from "@/lib/types";
import CompareSlider from "@/components/CompareSlider";
import { fmtDate } from "@/lib/useVerdicts";

export default function Compare() {
  const state = useAppState();
  const withPhoto = state.checkIns.filter((c) => c.photo);
  const first = state.checkIns[0]?.date;
  const wk = (d: string) => (first ? `W${Math.round((new Date(d).getTime() - new Date(first).getTime()) / (7 * 86400000))}` : "");
  const [a, setA] = useState<string | undefined>();
  const [b, setB] = useState<string | undefined>();
  const [mask, setMask] = useState<ConcernKey | null>("redness");
  useEffect(() => { if (withPhoto.length && !a) { setA(withPhoto[0].id); setB(withPhoto[withPhoto.length - 1].id); } }, [withPhoto.length]); // eslint-disable-line
  const A = withPhoto.find((c) => c.id === a), B = withPhoto.find((c) => c.id === b);

  if (withPhoto.length < 2 || !A || !B) {
    return <div className="fade-in"><h1>Compare</h1><p className="lede">You need at least two check-ins with photos to compare.</p></div>;
  }
  const masksAvailable = CONCERNS.filter((c) => A.scores[c.key]?.mask || B.scores[c.key]?.mask);

  return (
    <div className="fade-in">
      <div className="eyebrow">Same face, same light, weeks apart</div>
      <h1 style={{ marginTop: 6 }}>Compare</h1>
      <p className="lede">Drag the divider. Turn on a YouCam detection mask to see exactly what the AI measured.</p>

      <div className="section grid2">
        {[{ v: a, set: setA, l: "Before" }, { v: b, set: setB, l: "After" }].map((s) => (
          <label key={s.l} className="field" style={{ marginTop: 0 }}><span>{s.l}</span>
            <select className="input" value={s.v} onChange={(e) => s.set(e.target.value)}>
              {withPhoto.map((c) => <option key={c.id} value={c.id}>{wk(c.date)} · {fmtDate(c.date)}</option>)}
            </select>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <CompareSlider
          before={A.photo!} after={B.photo!}
          beforeMask={mask ? A.scores[mask]?.mask : undefined}
          afterMask={mask ? B.scores[mask]?.mask : undefined}
          labels={[wk(A.date), wk(B.date)]}
        />
      </div>

      {masksAvailable.length > 0 && (
        <div className="section">
          <div className="eyebrow" style={{ marginBottom: 8 }}>YouCam detection mask</div>
          <div className="chips">
            <button className={`chip ${mask === null ? "on" : ""}`} onClick={() => setMask(null)}>Off</button>
            {masksAvailable.map((c) => (
              <button key={c.key} className={`chip ${mask === c.key ? "on" : ""}`} onClick={() => setMask(c.key)}><span className="sw" style={{ background: c.colour }} />{c.label}</button>
            ))}
          </div>
          {state.kind === "demo" && <p className="small muted" style={{ marginTop: 8 }}>Demo: masks are from the real week-0 YouCam analysis; simulated weeks have no masks.</p>}
        </div>
      )}

      <div className="card section">
        <h3>What changed</h3>
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
  );
}
