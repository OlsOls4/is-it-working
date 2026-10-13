"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { getMode } from "@/lib/api-client";

const Ctx = createContext<{ demo: boolean; ready: boolean }>({ demo: true, ready: false });
export const useMode = () => useContext(Ctx);

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState({ demo: true, ready: false });
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("access");
    if (code) localStorage.setItem("iiw:access", code);
    getMode().then((r) => setM({ demo: r.demo, ready: true })).catch(() => setM({ demo: true, ready: true }));
  }, []);
  return <Ctx.Provider value={m}>{children}</Ctx.Provider>;
}
