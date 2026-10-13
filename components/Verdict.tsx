import Link from "next/link";
import type { Product, Verdict } from "@/lib/types";
import { concernMeta } from "@/lib/concerns";

export function Stamp({ v, big }: { v: Verdict; big?: boolean }) {
  return <span className={`stamp ${v.kind} ${big ? "big" : ""}`}>{v.label}</span>;
}

export function Confidence({ v }: { v: Verdict }) {
  return (
    <span className="conf" title={`Confidence ${v.confidence}/100`}>
      <span className="conf-bar"><span style={{ width: `${v.confidence}%` }} /></span>
      {v.confidenceLabel} confidence
    </span>
  );
}

export function VerdictCard({ p, v }: { p: Product; v: Verdict }) {
  const c = concernMeta(p.concern);
  return (
    <Link href={`/products/${p.id}`} className={`card card-link vcard edge-${v.kind}`}>
      <div>
        <div className="brand">{p.brand}</div>
        <div className="name">{p.name}</div>
      </div>
      <div><Stamp v={v} /></div>
      <div className="why">{v.headline}</div>
      <div className="meta">
        <span><span className="chip-dot" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c.colour, marginRight: 6 }} />{c.label}</span>
        <span>{Math.round(v.stats.weeksOn)} wk on</span>
        <Confidence v={v} />
      </div>
    </Link>
  );
}
