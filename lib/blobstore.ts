"use client";
/**
 * IndexedDB blob store for check-in photos and YouCam masks.
 * YouCam result URLs are signed S3 links that expire after ~2 hours, and localStorage (~5 MB) can't hold
 * full-size photos plus 8 PNG masks a week. So on save we copy every image into IndexedDB once and keep an
 * "idb:<key>" reference in the CheckIn. <img> sources resolve those refs to object URLs (useImageSrc).
 */
import { useEffect, useState } from "react";

const DB = "iiw-blobs", STORE = "blobs";
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((res, rej) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }));
}

export const isIdbRef = (s?: string) => !!s && s.startsWith("idb:");
export async function putBlob(key: string, blob: Blob) { await tx("readwrite", (s) => s.put(blob, key)); return `idb:${key}`; }
export async function getBlob(ref: string): Promise<Blob | null> {
  try { return ((await tx("readonly", (s) => s.get(ref.replace(/^idb:/, "")))) as Blob) ?? null; } catch { return null; }
}
export async function deletePrefix(prefix: string) {
  try {
    const keys = (await tx("readonly", (s) => s.getAllKeys())) as IDBValidKey[];
    await Promise.all(keys.filter((k) => String(k).startsWith(prefix)).map((k) => tx("readwrite", (s) => s.delete(k))));
  } catch {}
}
export async function clearBlobs() { try { await tx("readwrite", (s) => s.clear()); } catch {} }

/** Fetch a (possibly short-lived) URL once and keep the bytes. Returns the idb ref, or the original URL if that fails. */
export async function persistUrl(key: string, url?: string): Promise<string | undefined> {
  if (!url || url.startsWith("/demo/") || isIdbRef(url)) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) return url;
    return await putBlob(key, await r.blob());
  } catch { return url; }
}

const urlCache = new Map<string, string>();
/** Resolve a src that may be an idb: ref into something an <img> can show. */
export function useImageSrc(src?: string, fallback?: string): string | undefined {
  const [out, setOut] = useState<string | undefined>(() => (isIdbRef(src) ? urlCache.get(src!) ?? fallback : src));
  useEffect(() => {
    if (!isIdbRef(src)) { setOut(src); return; }
    const hit = urlCache.get(src!);
    if (hit) { setOut(hit); return; }
    let live = true;
    getBlob(src!).then((b) => {
      if (!live) return;
      if (b) { const u = URL.createObjectURL(b); urlCache.set(src!, u); setOut(u); } else setOut(fallback);
    });
    return () => { live = false; };
  }, [src, fallback]);
  return out;
}
