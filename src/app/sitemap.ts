import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["", "/shop", "/our-story", "/orchards", "/journal", "/gifts", "/contact", "/faq", "/passport", "/refer"].map((p) => ({ url: siteUrl(p), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
  try {
    const [products, articles, origins, pages] = await Promise.all([
      prisma.product.findMany({ where: { status: { in: ["ACTIVE", "UPCOMING"] }, category: { status: { not: "HIDDEN" } } }, select: { slug: true, updatedAt: true } }),
      prisma.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      prisma.origin.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      prisma.page.findMany({ where: { published: true, slug: { not: "our-story" } }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...statics,
      ...products.map((p) => ({ url: siteUrl(`/shop/${p.slug}`), lastModified: p.updatedAt, priority: 0.9 })),
      ...articles.map((a) => ({ url: siteUrl(`/journal/${a.slug}`), lastModified: a.updatedAt, priority: 0.6 })),
      ...origins.map((o) => ({ url: siteUrl(`/orchards/${o.slug}`), lastModified: o.updatedAt, priority: 0.6 })),
      ...pages.map((p) => ({ url: siteUrl(`/policies/${p.slug}`), lastModified: p.updatedAt, priority: 0.3 })),
    ];
  } catch {
    return statics;
  }
}
