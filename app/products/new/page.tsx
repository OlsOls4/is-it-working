"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CONCERNS, PRODUCT_TYPES } from "@/lib/concerns";
import type { ConcernKey, ProductType } from "@/lib/types";
import { actions } from "@/lib/store";

export default function NewProduct() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ name: "", brand: "", type: "niacinamide" as ProductType, concern: "pore" as ConcernKey, startDate: today, price: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const t = PRODUCT_TYPES[f.type];
  return (
    <div className="fade-in">
      <Link href="/products" className="back">← Products</Link>
      <h1>What are you <em>starting</em>?</h1>
      <p className="lede">Tip: take a check-in selfie <b>before</b> your first use, so we have a clean baseline.</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        actions.addProduct({ name: f.name.trim(), brand: f.brand.trim(), type: f.type, concern: f.concern, startDate: f.startDate, price: f.price ? Number(f.price) : undefined, complexion: f.type === "complexion" });
        router.push("/products");
      }}>
        <label className="field"><span>Product name</span><input className="input" required value={f.name} onChange={set("name")} placeholder="e.g. 10% Niacinamide Serum" /></label>
        <label className="field"><span>Brand</span><input className="input" value={f.brand} onChange={set("brand")} placeholder="Brand" /></label>
        <label className="field"><span>What kind of product?</span>
          <select className="input" value={f.type} onChange={set("type")}>
            {Object.entries(PRODUCT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <p className="small muted" style={{ margin: "6px 2px 0" }}>Fair verdict after {t.min}–{t.max} weeks. {t.note}</p>
        <div className="field"><span>Main thing you want it to fix</span>
          <div className="chips" style={{ flexWrap: "wrap" }}>
            {CONCERNS.map((c) => (
              <button type="button" key={c.key} className={`chip ${f.concern === c.key ? "on" : ""}`} onClick={() => setF({ ...f, concern: c.key })}>
                <span className="sw" style={{ background: c.colour }} />{c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid2">
          <label className="field"><span>Start date</span><input className="input" type="date" required value={f.startDate} onChange={set("startDate")} /></label>
          <label className="field"><span>Price (£, optional)</span><input className="input" inputMode="decimal" value={f.price} onChange={set("price")} placeholder="24" /></label>
        </div>
        <button className="btn block section" type="submit">Start tracking</button>
      </form>
    </div>
  );
}
