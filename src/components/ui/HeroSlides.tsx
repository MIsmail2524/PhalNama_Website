"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { isAllowedImage } from "@/lib/safe";

/** Slow cross-fade between hero photographs. Pauses for reduced-motion users and when the tab is hidden. */
export function HeroSlides({ images: all, alt }: { images: string[]; alt: string }) {
  const images = all.filter(isAllowedImage);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % images.length);
    }, 7000);
    return () => clearInterval(t);
  }, [images.length]);
  return (
    <div className="absolute inset-0" aria-hidden={images.length > 1 ? undefined : true}>
      {images.map((src, k) => (
        <Image
          key={src}
          src={src}
          alt={k === 0 ? alt : ""}
          fill
          priority={k === 0}
          sizes="100vw"
          className={clsx("object-cover transition-[opacity,transform] duration-[2500ms] ease-out motion-reduce:transition-none", k === i ? "scale-105 opacity-100" : "scale-100 opacity-0")}
        />
      ))}
    </div>
  );
}
