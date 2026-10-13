"use client";
import { useRef, useState } from "react";

export default function CompareSlider({ before, after, beforeMask, afterMask, labels }: {
  before: string; after: string; beforeMask?: string; afterMask?: string; labels: [string, string];
}) {
  const [x, setX] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    setX(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={ref}
      className="compare"
      style={{ ["--x" as any]: `${x}%` }}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}
      role="slider" aria-valuenow={Math.round(x)} aria-valuemin={0} aria-valuemax={100} aria-label="Before/after divider" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 5)); if (e.key === "ArrowRight") setX((v) => Math.min(100, v + 5)); }}
    >
      <img src={before} alt={`Check-in ${labels[0]}`} />
      {beforeMask && <img src={beforeMask} alt="" />}
      <img className="after" src={after} alt={`Check-in ${labels[1]}`} />
      {afterMask && <img className="after" src={afterMask} alt="" />}
      <div className="divider" />
      <div className="knob">⇆</div>
      <span className="tag l">{labels[0]}</span>
      <span className="tag r">{labels[1]}</span>
    </div>
  );
}
