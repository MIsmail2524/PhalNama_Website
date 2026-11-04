import Image from "next/image";
import { clsx } from "clsx";
import { OrchardScene } from "./OrchardScene";
import { isAllowedImage } from "@/lib/safe";

/** Library photographs (not taken at our orchards) live under /images/photos/. */
export function isRepresentative(src?: string | null) {
  return !!src && src.startsWith("/images/photos/");
}

export function RepresentativeBadge() {
  return (
    <span className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-forest-950/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-ivory/90 backdrop-blur-sm">
      Representative photo
    </span>
  );
}

/**
 * Renders an uploaded image, or an honest illustrated placeholder when the
 * team has not uploaded a photograph yet.
 */
export function SmartImage({
  src,
  alt,
  className,
  sizes = "100vw",
  priority,
  placeholderLabel = "Photograph to come",
  variant = "dawn",
  seed,
  fit = "cover",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  placeholderLabel?: string | null;
  variant?: "dawn" | "day" | "dusk";
  seed?: number;
  fit?: "cover" | "contain";
}) {
  if (isAllowedImage(src)) {
    return (
      <div className={clsx("relative overflow-hidden bg-sand", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={fit === "cover" ? "object-cover" : "object-contain"} />
        {isRepresentative(src) && placeholderLabel !== null && <RepresentativeBadge />}
      </div>
    );
  }
  return (
    <div className={clsx("relative overflow-hidden bg-sand", className)}>
      <OrchardScene className="absolute inset-0 h-full w-full" variant={variant} seed={seed ?? alt.length} label={alt} />
      {placeholderLabel && (
        <span className="absolute bottom-3 left-3 rounded-sm bg-ivory/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone backdrop-blur">
          {placeholderLabel}
        </span>
      )}
    </div>
  );
}
