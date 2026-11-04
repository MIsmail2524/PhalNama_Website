"use client";
import Image from "next/image";
import { useState } from "react";
import { clsx } from "clsx";
import { OrchardScene } from "@/components/ui/OrchardScene";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!images.length) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-sand">
        <OrchardScene className="absolute inset-0 h-full w-full" seed={alt.length + 3} label={alt} />
        <span className="absolute bottom-3 left-3 bg-ivory/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">Photograph to come</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-sand">
        {images.map((src, k) => (
          <Image key={src} src={src} alt={`${alt} — image ${k + 1}`} fill priority={k === 0} sizes="(min-width: 1024px) 50vw, 100vw" className={clsx("object-cover transition-opacity duration-500", k === i ? "opacity-100" : "opacity-0")} />
        ))}
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto lg:w-20 lg:flex-col">
          {images.map((src, k) => (
            <button key={src} onClick={() => setI(k)} aria-label={`Show image ${k + 1}`} aria-current={k === i} className={clsx("relative aspect-square w-20 shrink-0 overflow-hidden border-2", k === i ? "border-forest" : "border-transparent opacity-70 hover:opacity-100")}>
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
