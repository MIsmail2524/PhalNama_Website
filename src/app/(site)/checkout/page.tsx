import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCustomer } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { availablePaymentMethods } from "@/lib/payments";
import { REFERRAL_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [customer, payments, checkout, brand, referral, zones] = await Promise.all([
    getCustomer(),
    getSetting("payments"),
    getSetting("checkout"),
    getSetting("brand"),
    getSetting("referral"),
    prisma.deliveryZone.findMany({ where: { active: true }, select: { cities: true, isDefault: true } }),
  ]);
  const refCode = (await cookies()).get(REFERRAL_COOKIE)?.value ?? "";
  const lastOrder = customer
    ? await prisma.order.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, select: { city: true, area: true, address: true, postalCode: true } })
    : null;
  const zoneCities = zones.flatMap((z) => z.cities);
  const cities = [...new Set([...checkout.cities, ...zoneCities.map((c) => c.replace(/\b\w/g, (m) => m.toUpperCase()))])].sort();

  return (
    <div className="container-x pb-24 pt-10">
      <h1 className="display-md text-forest">Checkout</h1>
      <CheckoutForm
        methods={availablePaymentMethods(payments)}
        bankAccounts={payments.bankAccounts}
        cities={cities}
        allowOtherCity={zones.some((z) => z.isDefault)}
        giftPresentations={checkout.giftPresentations}
        giftMaxLength={checkout.giftMessageMaxLength}
        referralEnabled={referral.enabled}
        initialReferral={referral.enabled ? refCode : ""}
        whatsapp={brand.whatsapp}
        signedIn={!!customer}
        allowGuest={checkout.allowGuestCheckout}
        prefill={{
          name: customer?.name ?? "",
          phone: customer?.phone ? "0" + customer.phone.slice(3) : "",
          email: customer?.email ?? "",
          city: lastOrder?.city ?? "",
          area: lastOrder?.area ?? "",
          address: lastOrder?.address ?? "",
          postalCode: lastOrder?.postalCode ?? "",
        }}
      />
    </div>
  );
}
