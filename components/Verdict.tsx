import Link from "next/link";
import type { Product, Verdict } from "@/lib/types";
import { concernMeta } from "@/lib/concerns";

export function Stamp({ v, big }: { v: Verdict; big?: boolean }) {
  return <span className={`stamp ${v.collecting ? "COLLECTING" : v.kind} ${big ? "big" : ""}`}>{v.label}</span>;
}

export function Confidence({ v }: { v: Verdict }) {
  if (v.collecting) return <span className="conf">Collecting data</span>;
  return (
    <span className="conf" title={`Confidence ${v.confidence}/100`}>
      <span className="conf-bar" aria-hidden><span style={{ width: `${v.confidence}%` }} /></span>
      {v.confidenceLabel} confidence
    </span>
  );
}

/** Progress dots for the first 3 check-ins after starting a product. */
export function CollectingDots({ v }: { v: Verdict }) {
  if (!v.collecting) return null;
  const n = v.stats.checkInsSince;
  return (
    <span className="dots" aria-label={`${n} of 3 check-ins`}>
      {[0, 1, 2].map((i) => <i key={i} className={i < n ? "on" : ""} />)}
    </span>
  );
}

export function VerdictCard({ p, v }: { p: Product; v: Verdict }) {
  const c = concernMeta(p.concern);
  const wk = Math.round(v.stats.weeksOn);
  return (
    <Link href={`/products/${p.id}`} className={`card card-link vcard edge-${v.collecting ? "COLLECTING" : v.kind}`}>
      <div>
        {p.brand && <div className="brand">{p.brand}</div>}
        <div className="name">{p.name}</div>
      </div>
      <div><Stamp v={v} /></div>
      <div className="why">{v.headline}</div>
      <div className="meta">
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: c.colour, marginRight: 6 }} />{c.label}</span>
        {wk > 0 && <span>{wk} wk on</span>}
        <CollectingDots v={v} />
        <Confidence v={v} />
      </div>
    </Link>
  );
}
