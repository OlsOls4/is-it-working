"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STEPS = [
  { href: "/products/demo-azelaic", t: "A KEEP verdict", d: "Redness +11.7, 11.7× the noise — and a one-tap reorder" },
  { href: "/compare", t: "YouCam masks, week 0 → 8", d: "Real detection masks on every week" },
  { href: "/products/demo-tint", t: "A DROP: wrong shade", d: "Skin Tone says ΔE 7.7 — swap, don't give up" },
  { href: "/try-on?product=demo-tint", t: "Try the matched shade", d: "Makeup VTO on the same face" },
  { href: "/retailers", t: "For retailers", d: "Swap, don't churn" },
];

/** Dismissible 60-second path for judges, demo profile only. */
export default function Tour() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(localStorage.getItem("iiw:tourDone") !== "1"); }, []);
  if (!show) return null;
  return (
    <section className="tour" aria-label="Guided tour">
      <div className="section-head" style={{ marginBottom: 8 }}>
        <div className="eyebrow">60-second tour</div>
        <button className="linkish" onClick={() => { localStorage.setItem("iiw:tourDone", "1"); setShow(false); }} aria-label="Dismiss the tour">Dismiss ✕</button>
      </div>
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.href}><Link href={s.href}><span className="n">{i + 1}</span><span><b>{s.t}</b> <span className="small">· {s.d}</span></span></Link></li>
        ))}
      </ol>
    </section>
  );
}
