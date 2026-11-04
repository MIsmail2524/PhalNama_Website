import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Markdown } from "@/components/ui/Markdown";
import { formatDate } from "@/lib/format";

type P = Promise<{ slug: string }>;
const get = (slug: string) => prisma.page.findFirst({ where: { slug, published: true } });

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const p = await get((await params).slug);
  return p ? { title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.excerpt ?? undefined, alternates: { canonical: `/policies/${p.slug}` } } : {};
}

export default async function Policy({ params }: { params: P }) {
  const p = await get((await params).slug);
  if (!p) notFound();
  return (
    <article className="container-x max-w-3xl py-16">
      <h1 className="display-lg text-forest">{p.title}</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone">Last updated {formatDate(p.updatedAt)}</p>
      <Markdown className="mt-10">{p.body}</Markdown>
    </article>
  );
}
