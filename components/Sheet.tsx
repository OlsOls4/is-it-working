"use client";
import { useEffect, useRef } from "react";

/** In-app bottom sheet (dialog on desktop). Replaces window.alert/confirm. Esc or backdrop closes. */
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden />
        <div className="section-head" style={{ marginBottom: 8 }}>
          <h2>{title}</h2>
          <button className="btn soft" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
