"use client";
import { useRef, useState } from "react";
import Img from "./Img";

export default function CompareSlider({ before, after, beforeMask, afterMask, labels, beforeFallback, afterFallback, ratio = "580 / 780" }: {
  before: string; after: string; beforeMask?: string; afterMask?: string; labels: [string, string];
  beforeFallback?: string; afterFallback?: string; ratio?: string;
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
      style={{ ["--x" as any]: `${x}%`, aspectRatio: ratio }}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}
      role="slider" aria-valuenow={Math.round(x)} aria-valuemin={0} aria-valuemax={100} aria-label={`Before/after divider: ${labels[0]} vs ${labels[1]}`} tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") setX((v) => Math.max(0, v - 5)); if (e.key === "ArrowRight") setX((v) => Math.min(100, v + 5)); }}
    >
      <Img src={before} fallback={beforeFallback} alt={labels[0]} />
      {beforeMask && <Img src={beforeMask} alt="" />}
      <Img className="after" src={after} fallback={afterFallback} alt={labels[1]} />
      {afterMask && <Img className="after" src={afterMask} alt="" />}
      <div className="divider" />
      <div className="knob" aria-hidden>⇆</div>
      <span className="tag l">{labels[0]}</span>
      <span className="tag r">{labels[1]}</span>
    </div>
  );
}
