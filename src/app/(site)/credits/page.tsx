import type { Metadata } from "next";
import Image from "next/image";
import { PHOTO_CREDITS } from "@/lib/photo-credits";

export const metadata: Metadata = { title: "Photo credits", robots: { index: false } };

export default function Credits() {
  return (
    <div className="container-x py-16">
      <h1 className="display-md text-forest">Photo credits</h1>
      <p className="lede mt-4 max-w-2xl">
        Until our own orchard photography is ready, some images on this site are representative photographs from Unsplash.
        They are not pictures of our farms or our fruit. Packaging images are design concepts.
      </p>
      <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.file}>
            <div className="relative aspect-square overflow-hidden bg-sand"><Image src={c.file} alt="" fill sizes="20vw" className="object-cover" /></div>
            <p className="mt-2 text-xs text-stone">Photo by <a href={c.source} target="_blank" rel="noopener" className="underline">{c.author}</a> on Unsplash</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
