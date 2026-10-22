"use client";
import { useSyncExternalStore } from "react";
import type { CheckIn, Product, SkinTone } from "./types";
import { buildDemo } from "./demo-data";
import { localISO } from "./dates";
import { clearBlobs, deletePrefix } from "./blobstore";

const KEY = "iiw:v2";
export interface State {
  kind: "demo" | "own";
  products: Product[];
  checkIns: CheckIn[];
  skinTone?: SkinTone;
  seededAt: string;
  /** false only for the server/hydration snapshot: render a placeholder, not "no data". */
  ready: boolean;
}

let cache: State | null = null;
const listeners = new Set<() => void>();

function seed(): State {
  const d = buildDemo();
  return { kind: "demo", ...d, seededAt: localISO(), ready: true };
}

function load(): State {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...(JSON.parse(raw) as State), ready: true };
      // keep demo dates fresh: re-seed demo data if it was seeded on a previous day (keep products the user added)
      if (s.kind === "demo" && s.seededAt?.slice(0, 10) !== localISO()) {
        const fresh = seed();
        const extra = s.products.filter((p) => !p.id.startsWith("demo-"));
        cache = { ...fresh, products: [...fresh.products, ...extra] };
        persist();
        return cache;
      }
      return (cache = s);
    }
  } catch {}
  cache = seed();
  persist();
  return cache;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { console.warn("localStorage full?", e); }
}

function set(next: State) { cache = next; persist(); listeners.forEach((l) => l()); }

/**
 * Identical on the server and during hydration (no dates, no data), so the prerendered HTML never disagrees with
 * the first client render (this was React error #418: the old snapshot baked build-day dates into the HTML).
 */
const SERVER_SNAPSHOT: State = Object.freeze({ kind: "demo", products: [], checkIns: [], seededAt: "", ready: false }) as State;
export function useAppState(): State {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    load,
    () => SERVER_SNAPSHOT,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  addProduct(p: Omit<Product, "id">) { const s = load(); set({ ...s, products: [...s.products, { ...p, id: uid() }] }); },
  updateProduct(id: string, patch: Partial<Product>) { const s = load(); set({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }); },
  removeProduct(id: string) { const s = load(); set({ ...s, products: s.products.filter((p) => p.id !== id) }); },
  addCheckIn(c: Omit<CheckIn, "id"> & { id?: string }) {
    const s = load();
    set({ ...s, checkIns: [...s.checkIns, { ...c, id: c.id ?? uid() }].sort((a, b) => a.date.localeCompare(b.date)) });
  },
  removeCheckIn(id: string) { const s = load(); set({ ...s, checkIns: s.checkIns.filter((c) => c.id !== id) }); deletePrefix(`checkin-${id}-`); },
  setSkinTone(t: SkinTone) { const s = load(); set({ ...s, skinTone: t }); },
  resetDemo() { set(seed()); },
  startFresh() { clearBlobs(); set({ kind: "own", products: [], checkIns: [], seededAt: localISO(), ready: true }); },
};
