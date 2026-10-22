import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in narrow" style={{ paddingTop: 30 }}>
      <div className="eyebrow">404</div>
      <h1 style={{ marginTop: 6 }}>Nothing to <em>judge</em> here.</h1>
      <p className="lede">That page doesn't exist. Your shelf is where you left it.</p>
      <div className="btn-row section"><Link className="btn" href="/">Today</Link><Link className="btn ghost" href="/products">Products</Link></div>
    </div>
  );
}
