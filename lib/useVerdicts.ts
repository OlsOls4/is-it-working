"use client";
import { useMemo } from "react";
import { useAppState } from "./store";
import { computeVerdict } from "./verdict";
import { concernMeta } from "./concerns";

export function useVerdicts() {
  const state = useAppState();
  const verdicts = useMemo(
    () => state.products.map((p) => ({ p, v: computeVerdict(p, state.products, state.checkIns, concernMeta(p.concern).label) })),
    [state.products, state.checkIns],
  );
  return { state, verdicts };
}

export const daysSince = (d?: string) => (d ? Math.floor((Date.now() - new Date(d + "T12:00:00Z").getTime()) / 86400000) : Infinity);
export const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
