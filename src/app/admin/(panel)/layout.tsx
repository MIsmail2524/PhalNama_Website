import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastFromQuery } from "@/components/admin/ToastFromQuery";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Phalnama admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin("dashboard");
  return (
    <div className="min-h-screen bg-[#f6f4ee] lg:flex">
      <AdminNav admin={{ name: admin.name, email: admin.email, role: admin.role }} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">{children}</main>
      <ToastFromQuery />
    </div>
  );
}
