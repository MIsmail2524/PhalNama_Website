import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const productCardInclude = {
  category: true,
  origin: true,
  variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

/** Products visible on the storefront: active or upcoming, in a visible category. */
export const visibleProductWhere: Prisma.ProductWhereInput = {
  status: { in: ["ACTIVE", "UPCOMING"] },
  category: { status: { in: ["ACTIVE", "UPCOMING"] } },
};

export const getFeaturedProducts = cache(async () =>
  prisma.product.findMany({
    where: { status: "ACTIVE", category: { status: "ACTIVE" } },
    include: productCardInclude,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    take: 6,
  }),
);

export const getCategories = cache(async () =>
  prisma.category.findMany({ where: { status: { in: ["ACTIVE", "UPCOMING"] } }, orderBy: { sortOrder: "asc" } }),
);

export const getProduct = cache(async (slug: string) =>
  prisma.product.findFirst({
    where: { slug, ...visibleProductWhere },
    include: {
      ...productCardInclude,
      articles: { where: { status: "PUBLISHED" }, take: 3, orderBy: { publishedAt: "desc" } },
      batches: { where: { published: true }, orderBy: { packingDate: "desc" }, take: 1 },
    },
  }),
);

export function priceRange(variants: { price: number | null }[]) {
  const prices = variants.map((v) => v.price).filter((p): p is number => p !== null);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function isPurchasable(p: { status: string; category: { status: string }; variants: { price: number | null; stock: number; trackStock: boolean }[] }) {
  return p.status === "ACTIVE" && p.category.status === "ACTIVE" && p.variants.some((v) => v.price !== null && (!v.trackStock || v.stock > 0));
}
