import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Markdown } from "@/components/ui/Markdown";
import { SmartImage } from "@/components/ui/SmartImage";
import { OrchardScene } from "@/components/ui/OrchardScene";

export async function generateMetadata(): Promise<Metadata> {
  const p = await prisma.page.findUnique({ where: { slug: "our-story" } });
  return { title: p?.seoTitle ?? "Our Story", description: p?.seoDescription ?? p?.excerpt ?? undefined, alternates: { canonical: "/our-story" } };
}

export default async function OurStory() {
  const [page, brand] = await Promise.all([prisma.page.findUnique({ where: { slug: "our-story" } }), getSetting("brand")]);
  if (!page || !page.published) notFound();
  return (
    <article>
      <header className="relative -mt-[72px] flex min-h-[70svh] items-end overflow-hidden bg-forest-950 text-ivory">
        {page.coverImage ? (
          <SmartImage src={page.coverImage} alt="" className="absolute inset-0" priority />
        ) : (
          <OrchardScene variant="dusk" seed={19} className="absolute inset-0 h-full w-full" label="" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/50 to-forest-950/30" />
        <div className="container-x relative pb-16 pt-40">
          <p className="eyebrow !text-gold-300">Our story</p>
          <h1 className="display-xl mt-4 max-w-3xl">{page.excerpt ?? page.title}</h1>
          <p className="urdu mt-6 text-3xl text-gold-300" lang="ur">{brand.nameUrdu}</p>
        </div>
      </header>
      <div className="container-x grid gap-12 py-20 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-28">
            <p className="font-display text-2xl italic text-gold-700">&ldquo;{brand.name}&rdquo;</p>
            <p className="mt-2 text-sm text-stone">phal — fruit<br />nāma — a book, a letter, a record</p>
          </div>
        </aside>
        <Markdown className="lg:col-span-7">{page.body}</Markdown>
      </div>
      <section className="border-t border-sand-300 py-20 text-center">
        <p className="display-md text-forest">The first chapter is in season.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/shop" className="btn-primary">Explore the harvest</Link>
          <Link href="/orchards" className="btn-outline">Our orchards</Link>
        </div>
      </section>
    </article>
  );
}
