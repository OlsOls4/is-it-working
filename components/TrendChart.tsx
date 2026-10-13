import type { CheckIn, ConcernKey, Product } from "@/lib/types";
import { concernMeta } from "@/lib/concerns";
import { concernSeries } from "@/lib/verdict";

const t = (d: string) => new Date(d + "T12:00:00Z").getTime();

export default function TrendChart({
  checkIns, concerns, products = [], band, height = 210, showDots = true,
}: {
  checkIns: CheckIn[];
  concerns: ConcernKey[];
  products?: Product[];
  band?: { from: string; baseline: number; threshold: number; colour: string };
  height?: number;
  showDots?: boolean;
}) {
  const W = 360, H = height, L = 30, R = 10, T = 26, B = 24;
  const all = concerns.flatMap((c) => concernSeries(checkIns, c));
  if (all.length < 1) return <p className="muted small">No check-ins yet.</p>;
  const ts = all.map((p) => t(p.date));
  const x0 = Math.min(...ts, ...products.map((p) => t(p.startDate))), x1 = Math.max(...ts);
  const vals = all.map((p) => p.raw).concat(band ? [band.baseline - band.threshold, band.baseline + band.threshold] : []);
  let y0 = Math.floor(Math.min(...vals) - 2), y1 = Math.ceil(Math.max(...vals) + 2);
  if (y1 - y0 < 8) { const m = (y0 + y1) / 2; y0 = Math.floor(m - 4); y1 = Math.ceil(m + 4); }
  const X = (d: string) => L + ((t(d) - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const Y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round(y0 + ((y1 - y0) * i) / ticks));
  const weeks = Math.round((x1 - x0) / (7 * 86400000));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trend of ${concerns.join(", ")}`}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="#d9d0bd" strokeWidth="0.6" strokeDasharray="2 3" />
          <text x={L - 6} y={Y(v) + 3} textAnchor="end">{v}</text>
        </g>
      ))}
      {Array.from({ length: weeks + 1 }, (_, w) => w).filter((w) => w % 2 === 0).map((w) => {
        const x = L + ((w * 7 * 86400000) / Math.max(1, x1 - x0)) * (W - L - R);
        return <text key={w} x={x} y={H - 6} textAnchor="middle">W{w}</text>;
      })}
      {band && (
        <g>
          <rect x={X(band.from)} width={W - R - X(band.from)} y={Y(band.baseline + band.threshold)} height={Y(band.baseline - band.threshold) - Y(band.baseline + band.threshold)} fill={band.colour} opacity="0.1" />
          <line x1={X(band.from)} x2={W - R} y1={Y(band.baseline)} y2={Y(band.baseline)} stroke={band.colour} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
          <text x={W - R} y={Y(band.baseline + band.threshold) - 4} textAnchor="end" style={{ fill: band.colour }}>noise band</text>
        </g>
      )}
      {products.map((p, i) => {
        const x = X(p.startDate);
        return (
          <g key={p.id}>
            <line x1={x} x2={x} y1={T - 6} y2={H - B} stroke="#1c1a16" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
            <circle cx={x} cy={T - 10 - (i % 2) * 0} r="7" fill="#1c1a16" />
            <text x={x} y={T - 7} textAnchor="middle" style={{ fill: "#f5f0e6", fontSize: 9, fontWeight: 700 }}>{String.fromCharCode(65 + i)}</text>
          </g>
        );
      })}
      {concerns.map((c) => {
        const s = concernSeries(checkIns, c);
        const col = concernMeta(c).colour;
        const d = s.map((p, i) => `${i ? "L" : "M"}${X(p.date).toFixed(1)},${Y(p.raw).toFixed(1)}`).join(" ");
        return (
          <g key={c}>
            <path d={d} fill="none" stroke={col} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {showDots && s.map((p) => <circle key={p.date} cx={X(p.date)} cy={Y(p.raw)} r="3" fill="#fffdf8" stroke={col} strokeWidth="1.8" />)}
          </g>
        );
      })}
    </svg>
  );
}

export function ProductLegend({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <div className="legend">
      {products.map((p, i) => (
        <span key={p.id}><b className="mono" style={{ marginRight: 4 }}>{String.fromCharCode(65 + i)}</b>{p.name}</span>
      ))}
    </div>
  );
}

export function Sparkline({ checkIns, concern, colour }: { checkIns: CheckIn[]; concern: ConcernKey; colour: string }) {
  const s = concernSeries(checkIns, concern);
  if (s.length < 2) return null;
  const W = 80, H = 24, vs = s.map((p) => p.raw), lo = Math.min(...vs), hi = Math.max(...vs);
  const d = s.map((p, i) => `${i ? "L" : "M"}${((i / (s.length - 1)) * W).toFixed(1)},${(H - ((p.raw - lo) / Math.max(1, hi - lo)) * H).toFixed(1)}`).join(" ");
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}><path d={d} fill="none" stroke={colour} strokeWidth="2" strokeLinecap="round" /></svg>;
}
