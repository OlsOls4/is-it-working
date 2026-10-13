"use client";
import { useSyncExternalStore } from "react";
import type { CheckIn, Product } from "./types";
import { buildDemo } from "./demo-data";

const KEY = "iiw:v1";
export interface State { kind: "demo" | "own"; products: Product[]; checkIns: CheckIn[]; seededAt: string }

let cache: State | null = null;
const listeners = new Set<() => void>();

function seed(): State {
  const d = buildDemo();
  return { kind: "demo", ...d, seededAt: new Date().toISOString() };
}

function load(): State {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = seed());
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      // keep demo dates fresh: re-seed demo data if it was seeded on a previous day
      if (s.kind === "demo" && s.seededAt?.slice(0, 10) !== new Date().toISOString().slice(0, 10)) {
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

const SERVER_SNAPSHOT = seed();
export function useAppState(): State {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    load,
    () => SERVER_SNAPSHOT,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  addProduct(p: Omit<Product, "id">) { const s = load(); set({ ...s, products: [...s.products, { ...p, id: uid() }] }); },
  updateProduct(id: string, patch: Partial<Product>) { const s = load(); set({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }); },
  removeProduct(id: string) { const s = load(); set({ ...s, products: s.products.filter((p) => p.id !== id) }); },
  addCheckIn(c: Omit<CheckIn, "id">) { const s = load(); set({ ...s, checkIns: [...s.checkIns, { ...c, id: uid() }].sort((a, b) => a.date.localeCompare(b.date)) }); },
  removeCheckIn(id: string) { const s = load(); set({ ...s, checkIns: s.checkIns.filter((c) => c.id !== id) }); },
  resetDemo() { set(seed()); },
  startFresh() { set({ kind: "own", products: [], checkIns: [], seededAt: new Date().toISOString() }); },
};
