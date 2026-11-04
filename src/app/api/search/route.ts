import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { visibleProductWhere } from "@/lib/catalog";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], articles: [] });
  const contains = { contains: q, mode: "insensitive" as const };
  const [products, articles] = await Promise.all([
    prisma.product.findMany({
      where: { ...visibleProductWhere, OR: [{ name: contains }, { shortDescription: contains }, { category: { name: contains } }, { origin: { name: contains } }] },
      select: { slug: true, name: true, category: { select: { name: true } } },
      take: 8,
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", OR: [{ title: contains }, { excerpt: contains }, { category: contains }] },
      select: { slug: true, title: true, category: true },
      take: 6,
    }),
  ]);
  return NextResponse.json({
    products: products.map((p) => ({ slug: p.slug, name: p.name, category: p.category.name })),
    articles,
  });
}
