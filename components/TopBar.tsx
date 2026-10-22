"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "./ModeProvider";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/trends", label: "Trends" },
  { href: "/compare", label: "Compare" },
  { href: "/products", label: "Products" },
  { href: "/try-on", label: "Try on" },
  { href: "/retailers", label: "For retailers" },
];

export default function TopBar() {
  const { demo } = useMode();
  const p = usePathname();
  const is = (h: string) => (h === "/" ? p === "/" : p.startsWith(h));
  return (
    <header className="topbar">
      <Link href="/" className="wordmark" aria-label="Is It Working? home">
        Is it <em>working</em><span className="q">?</span>
      </Link>
      <nav className="topnav" aria-label="Main (desktop)">
        {NAV.map((n) => <Link key={n.href} href={n.href} className={is(n.href) ? "active" : ""} aria-current={is(n.href) ? "page" : undefined}>{n.label}</Link>)}
        <Link href="/check-in" className="btn" style={{ padding: "9px 16px", fontSize: 14 }}>Check in</Link>
      </nav>
      <Link href="/about#modes" className={`mode ${demo ? "demo" : "live"}`} title={demo ? "Demo: recorded real YouCam responses" : "Live YouCam API"}>
        <span className="dot" /> {demo ? "Demo" : "Live"}
      </Link>
    </header>
  );
}
