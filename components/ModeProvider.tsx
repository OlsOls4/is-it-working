"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getMode } from "@/lib/api-client";

type M = { demo: boolean; ready: boolean; liveConfigured?: boolean; reason?: string };
const Ctx = createContext<M>({ demo: true, ready: false });
export const useMode = () => useContext(Ctx);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState<M>({ demo: true, ready: false });
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const code = q.get("access");
    if (code) localStorage.setItem("iiw:access", code);
    if (q.get("demo") === "1") localStorage.setItem("iiw:forceDemo", "1");
    if (q.get("demo") === "0") localStorage.removeItem("iiw:forceDemo");
    getMode()
      .then((r) => setM({ demo: r.demo, ready: true, liveConfigured: r.liveConfigured, reason: r.reason }))
      .catch(() => setM({ demo: true, ready: true }));
  }, []);
  return <Ctx.Provider value={m}>{children}</Ctx.Provider>;
}
