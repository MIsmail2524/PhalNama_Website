import Image from "next/image";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { storageDriver } from "@/lib/storage";
import { Notice, PageHeader } from "@/components/admin/ui";
import { MediaUploader } from "@/components/admin/MediaUploader";

export default async function Media() {
  await requireAdmin("content");
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Media library" description="Every image uploaded anywhere in the dashboard. Copy a URL to use it in an article (![alt](url))." />
      {storageDriver() === "local" && <Notice tone="warning">Images are stored on this computer&apos;s disk (development mode). On Vercel, add a Blob store and set BLOB_READ_WRITE_TOKEN.</Notice>}
      <MediaUploader />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {assets.map((a) => (
          <figure key={a.id} className="admin-card overflow-hidden">
            <div className="relative aspect-square bg-sand"><Image src={a.url} alt={a.alt ?? ""} fill sizes="200px" className="object-cover" /></div>
            <figcaption className="p-2"><input readOnly value={a.url} className="admin-input !py-1 text-[10px]" /></figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
