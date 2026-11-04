import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LogoSymbol } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center bg-forest px-4">
      <div className="w-full max-w-sm rounded-md bg-ivory p-8 shadow-2xl">
        <LogoSymbol className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-center font-display text-3xl text-forest">Phalnama admin</h1>
        <LoginForm />
      </div>
    </main>
  );
}
