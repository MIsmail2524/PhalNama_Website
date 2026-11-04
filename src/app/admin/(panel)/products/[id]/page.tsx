import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/SubmitButton";
import { ProductForm } from "@/components/admin/ProductForm";
import { archiveProductAction } from "../../actions";

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("catalogue");
  const { id } = await params;
  const isNew = id === "new";
  const [product, categories, origins] = await Promise.all([
    isNew ? null : prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true } }),
    prisma.origin.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!isNew && !product) notFound();
  const archive = archiveProductAction.bind(null, id);
  return (
    <div className="max-w-5xl">
      <PageHeader
        title={product?.name ?? "New product"}
        back={{ href: "/admin/products", label: "Products" }}
        actions={product && <Link href={`/shop/${product.slug}`} target="_blank" className="admin-btn-secondary">View on site ↗</Link>}
      />
      <ProductForm id={isNew ? null : id} product={product} categories={categories} origins={origins} />
      {product && (
        <form action={archive} className="mt-8">
          <ConfirmButton message="Archive this product? Products with past orders are archived (hidden); others are deleted permanently.">Archive / delete product</ConfirmButton>
        </form>
      )}
    </div>
  );
}
