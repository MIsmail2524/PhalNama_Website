import type { Metadata } from "next";
import { ForgotForm } from "@/components/site/AuthForms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Forgot() {
  return (
    <div className="container-x max-w-md py-20">
      <h1 className="display-md text-forest">Reset your password</h1>
      <p className="mt-3 text-stone">We will send a reset link to your account&apos;s email or WhatsApp.</p>
      <div className="mt-10"><ForgotForm /></div>
    </div>
  );
}
