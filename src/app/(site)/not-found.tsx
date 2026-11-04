import Link from "next/link";
import { OrchardScene } from "@/components/ui/OrchardScene";

export default function NotFound() {
  return (
    <div className="container-x grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
      <OrchardScene className="aspect-[4/3] w-full" seed={404} label="An orchard path" />
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display-lg mt-4 text-forest">This path leads out of the orchard.</h1>
        <p className="lede mt-4">The page you are looking for has moved, or never grew here.</p>
        <div className="mt-8 flex gap-3"><Link href="/" className="btn-primary">Home</Link><Link href="/shop" className="btn-outline">The harvest</Link></div>
      </div>
    </div>
  );
}
