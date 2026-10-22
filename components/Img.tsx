"use client";
import { useImageSrc } from "@/lib/blobstore";

/** <img> that understands "idb:" refs (photos and masks saved in IndexedDB). */
export default function Img({ src, fallback, alt = "", ...rest }: { src?: string; fallback?: string } & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const s = useImageSrc(src, fallback);
  if (!s) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={s} alt={alt} {...rest} />;
}
