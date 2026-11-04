import Link from "next/link";
import { prisma } from "@/lib/db";

export async function AnnouncementBar() {
  const now = new Date();
  const banner = await prisma.banner
    .findFirst({
      where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => null);
  if (!banner) return null;
  return (
    <div className="relative z-[55] bg-forest-950 text-ivory">
      <p className="container-x flex min-h-9 items-center justify-center gap-3 py-2 text-center text-[12px] tracking-wide">
        <span>{banner.message}</span>
        {banner.linkUrl && <Link href={banner.linkUrl} className="font-semibold text-citrus-200 underline underline-offset-2">{banner.linkLabel || "Learn more"}</Link>}
      </p>
    </div>
  );
}
