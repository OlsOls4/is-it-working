"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  today: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  trends: <path d="M3 17l5-6 4 4 8-9M15 6h5v5" />,
  compare: <path d="M12 3v18M5 6h4v12H5zM15 6h4v12h-4z" />,
  products: <path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3zM7 12h10" />,
};
const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export default function TabBar() {
  const p = usePathname();
  const is = (h: string) => (h === "/" ? p === "/" : p.startsWith(h));
  return (
    <nav className="tabs" aria-label="Main">
      <div className="tabs-inner">
        <Link href="/" className={`tab ${is("/") ? "active" : ""}`}><Icon d={I.today} />Today</Link>
        <Link href="/trends" className={`tab ${is("/trends") ? "active" : ""}`}><Icon d={I.trends} />Trends</Link>
        <Link href="/check-in" className="tab-cta" aria-label="New check-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
        </Link>
        <Link href="/compare" className={`tab ${is("/compare") ? "active" : ""}`}><Icon d={I.compare} />Compare</Link>
        <Link href="/products" className={`tab ${is("/products") ? "active" : ""}`}><Icon d={I.products} />Products</Link>
      </div>
    </nav>
  );
}
