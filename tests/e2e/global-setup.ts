import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const E2E = {
  adminEmail: "e2e-owner@phalnama.test",
  adminPassword: "e2e-Owner-Password-1",
  editorEmail: "e2e-editor@phalnama.test",
};

/** Prepares the isolated test database: prices, stock, delivery fee, programmes on, test admins. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgresql://phalnama:phalnama@localhost:5432/phalnama_test";
  if (!url.includes("_test")) throw new Error("Refusing to run e2e setup against a non-test database: " + url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const prices: Record<string, number> = { "KIN-5KG": 2500, "KIN-10KG": 4500, "KIN-GIFT": 3200 };
  for (const [sku, price] of Object.entries(prices)) {
    await prisma.productVariant.updateMany({ where: { sku }, data: { price, stock: 500, active: true } });
  }
  await prisma.deliveryZone.updateMany({ where: { isDefault: true }, data: { baseFee: 350, includedWeightKg: 5, perKgFee: 40, freeShippingThreshold: 12000 } });
  await prisma.setting.upsert({
    where: { key: "referral" },
    create: { key: "referral", value: { enabled: true, refereeDiscountType: "FIXED", refereeDiscountValue: 300, referrerReward: 500, validationDays: 0 } },
    update: { value: { enabled: true, refereeDiscountType: "FIXED", refereeDiscountValue: 300, referrerReward: 500, validationDays: 0 } },
  });
  await prisma.setting.upsert({
    where: { key: "payments" },
    create: { key: "payments", value: { codEnabled: true, bankEnabled: true, bankAccounts: [{ bank: "Test Bank", title: "Phalnama", account: "000123", iban: "PK00TEST0000000000000123" }] } },
    update: { value: { codEnabled: true, bankEnabled: true, bankAccounts: [{ bank: "Test Bank", title: "Phalnama", account: "000123", iban: "PK00TEST0000000000000123" }] } },
  });
  await prisma.coupon.upsert({ where: { code: "E2ETEN" }, create: { code: "E2ETEN", type: "PERCENT", value: 10 }, update: { active: true, usedCount: 0 } });
  const hash = await bcrypt.hash(E2E.adminPassword, 10);
  await prisma.adminUser.upsert({ where: { email: E2E.adminEmail }, create: { email: E2E.adminEmail, name: "E2E Owner", role: "OWNER", passwordHash: hash }, update: { passwordHash: hash, active: true, role: "OWNER" } });
  await prisma.adminUser.upsert({ where: { email: E2E.editorEmail }, create: { email: E2E.editorEmail, name: "E2E Editor", role: "EDITOR", passwordHash: hash }, update: { passwordHash: hash, active: true } });
  await prisma.$disconnect();
}
