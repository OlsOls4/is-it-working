"use client";
import { useMemo } from "react";
import { useAppState } from "./store";
import { computeVerdict } from "./verdict";
import { concernMeta } from "./concerns";

export function useVerdicts() {
  const state = useAppState();
  const skinHex = state.skinTone?.hex;
  const verdicts = useMemo(
    () => state.products.map((p) => ({ p, v: computeVerdict(p, state.products, state.checkIns, concernMeta(p.concern).label, { skinHex }) })),
    [state.products, state.checkIns, skinHex],
  );
  return { state, verdicts };
}

/** Whole calendar days from a yyyy-mm-dd date to today (local), e.g. today = 0, yesterday = 1. */
export const daysSince = (d?: string) => {
  if (!d) return Infinity;
  const [y, m, day] = d.split("-").map(Number);
  const now = new Date();
  return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, day)) / 86400000);
};
export const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
