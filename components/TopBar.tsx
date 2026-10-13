"use client";
import Link from "next/link";
import { useMode } from "./ModeProvider";

export default function TopBar() {
  const { demo } = useMode();
  return (
    <header className="topbar">
      <Link href="/" className="wordmark" aria-label="Is It Working? home">
        Is it <em>working</em><span className="q">?</span>
      </Link>
      <Link href="/about#modes" className={`mode ${demo ? "demo" : "live"}`} title={demo ? "Demo mode: recorded YouCam responses" : "Live YouCam API"}>
        <span className="dot" /> {demo ? "Demo" : "Live"}
      </Link>
    </header>
  );
}
